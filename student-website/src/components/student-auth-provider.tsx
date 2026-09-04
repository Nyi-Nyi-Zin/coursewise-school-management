"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { firebaseAuth, firestore, isFirebaseConfigured } from "@/lib/firebase";
import { getPortalRole, type PortalRole } from "@/lib/auth-service";

type StudentAuthState = { user: User | null; role: PortalRole; loading: boolean; firebaseActive: boolean };
const StudentAuthContext = createContext<StudentAuthState>({ user: null, role: null, loading: true, firebaseActive: false });

export function StudentAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudentAuthState>({ user: null, role: null, loading: isFirebaseConfigured, firebaseActive: isFirebaseConfigured });
  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth) return;
    let profileUnsubscribe: (() => void) | undefined;
    let disposed = false;
    const endSession = () => {
      profileUnsubscribe?.();
      profileUnsubscribe = undefined;
      if (disposed) return;
      setState({ user: null, role: null, loading: false, firebaseActive: true });
      void signOut(auth).catch(() => undefined);
    };
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      profileUnsubscribe?.();
      profileUnsubscribe = undefined;
      if (disposed) return;
      if (!user) {
        setState({ user: null, role: null, loading: false, firebaseActive: true });
        return;
      }
      const role = user ? await getPortalRole(user).catch(() => null) : null;
      if (disposed || auth.currentUser?.uid !== user.uid) return;
      setState({ user, role, loading: false, firebaseActive: true });

      // Authentication state alone does not change when an administrator
      // disables or removes a profile. Watch the authoritative profile so an
      // already-open portal loses its local Firebase session immediately.
      if (!firestore) return;
      profileUnsubscribe = onSnapshot(doc(firestore, "users", user.uid), profile => {
        const data = profile.data();
        if (!profile.exists() || data?.role !== "student" || data?.isActive === false) {
          endSession();
          return;
        }
        setState({ user, role: "student", loading: false, firebaseActive: true });
      }, () => {
        // A denied profile listener means the account is no longer permitted
        // to use the student portal. Transient offline events do not call this.
        endSession();
      });
    });
    return () => {
      disposed = true;
      profileUnsubscribe?.();
      authUnsubscribe();
    };
  }, []);
  const value = useMemo(() => state, [state]);
  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth() {
  return useContext(StudentAuthContext);
}
