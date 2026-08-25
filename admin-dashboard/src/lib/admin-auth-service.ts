import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseClient, hasFirebaseConfiguration } from "./firebase";

export async function signInAdministrator({ email, password }: { email: string; password: string }): Promise<User> {
  if (!hasFirebaseConfiguration) throw new Error("Firebase Authentication is not configured.");
  const { auth, db } = getFirebaseClient();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await getDoc(doc(db, "users", credential.user.uid));
  if (profile.data()?.role !== "admin") {
    await signOut(auth);
    throw new Error("This account does not have administrator access.");
  }
  return credential.user;
}

export async function requestAdministratorPasswordReset(email: string) {
  if (!hasFirebaseConfiguration) throw new Error("Firebase Authentication is not configured.");
  const { auth } = getFirebaseClient();
  await sendPasswordResetEmail(auth, email.trim(), {
    url: `${window.location.origin}/reset-password`,
    handleCodeInApp: false,
  });
}

export async function signOutAdministrator() {
  if (!hasFirebaseConfiguration) return;
  const { auth } = getFirebaseClient();
  await signOut(auth);
}
