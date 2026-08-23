"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { getPortalRole, type PortalRole } from "@/lib/auth-service";

type StudentAuthState = { user: User | null; role: PortalRole; loading: boolean; firebaseActive: boolean };
const StudentAuthContext = createContext<StudentAuthState>({ user: null, role: null, loading: true, firebaseActive: false });

export function StudentAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudentAuthState>({ user: null, role: null, loading: isFirebaseConfigured, firebaseActive: isFirebaseConfigured });
  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, async (user) => {
      const role = user ? await getPortalRole(user).catch(() => null) : null;
      setState({ user, role, loading: false, firebaseActive: true });
    });
  }, []);
  const value = useMemo(() => state, [state]);
  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth() {
  return useContext(StudentAuthContext);
}
