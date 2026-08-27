import { EmailAuthProvider, getIdTokenResult, reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword, type User } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "./firebase";

export type PortalRole = "admin" | "student" | null;

export async function registerStudent({ name, email, password }: { name: string; email: string; password: string }) {
  if (!firebaseAuth || !isFirebaseConfigured) throw new Error("Firebase Authentication is not configured.");
  const response = await fetch("/api/register-student", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
  });
  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  if (!response.ok) throw new Error(payload?.message || payload?.error || "Unable to register your account.");
  const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
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
  await sendPasswordResetEmail(firebaseAuth, email.trim(), {
    url: `${window.location.origin}/reset-password`,
    handleCodeInApp: false,
  });
}

export async function changePassword(user: User, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
  if (!isFirebaseConfigured) throw new Error("Changing your password is not available in demo mode.");
  const credential = EmailAuthProvider.credential(user.email ?? "", currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function getPortalRole(user: User): Promise<PortalRole> {
  const token = await getIdTokenResult(user, true);
  const role = token.claims.role;
  return role === "admin" || role === "student" ? role : null;
}
