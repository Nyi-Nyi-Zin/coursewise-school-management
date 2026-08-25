import { httpsCallable } from "firebase/functions";
import { getFirebaseClient, hasFirebaseConfiguration } from "./firebase";

export async function createStudentAccount(input: { name: string; email: string; photoUrl?: string; isActive?: boolean }) {
  if (!hasFirebaseConfiguration) throw new Error("Firebase is not configured.");
  const { functions } = getFirebaseClient();
  const call = httpsCallable<{ name: string; email: string; photoUrl?: string; isActive?: boolean }, { uid: string; studentId: string; resetLink: string }>(functions, "adminCreateStudentAccount");
  const result = await call({ name: input.name.trim(), email: input.email.trim(), photoUrl: input.photoUrl?.trim() || undefined, isActive: input.isActive });
  return result.data;
}
