import { createUserWithEmailAndPassword, getIdTokenResult, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile, type User } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export type PortalRole = "admin" | "student" | null;

export async function registerStudent({ name, email, password }: { name: string; email: string; password: string }) {
  if (!firebaseAuth || !isFirebaseConfigured) throw new Error("Firebase Authentication is not configured.");
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  if (firestore) await setDoc(doc(firestore, "users", credential.user.uid), { name: name.trim(), email: email.trim(), role: "student", studentId: "Pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  return credential.user;
}

export async function loginStudent({ email, password }: { email: string; password: string }) {
  if (!firebaseAuth || !isFirebaseConfigured) throw new Error("Firebase Authentication is not configured.");
  const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
  return credential.user;
}

export async function logoutStudent() {
  if (firebaseAuth) await signOut(firebaseAuth);
}

export async function requestPasswordReset(email: string) {
  if (!firebaseAuth || !isFirebaseConfigured) throw new Error("Firebase Authentication is not configured.");
  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

export async function getPortalRole(user: User): Promise<PortalRole> {
  const token = await getIdTokenResult(user, true);
  const role = token.claims.role;
  return role === "admin" || role === "student" ? role : null;
}
