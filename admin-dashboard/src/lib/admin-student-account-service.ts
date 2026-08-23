import { httpsCallable } from "firebase/functions";
import { getFirebaseClient, hasFirebaseConfiguration } from "./firebase";

export async function createStudentAccount(input: { name: string; email: string; studentId: string }) {
  if (!hasFirebaseConfiguration) throw new Error("Firebase is not configured.");
  const { functions } = getFirebaseClient();
  const call = httpsCallable<{ name: string; email: string; studentId: string }, { uid: string; resetLink: string }>(functions, "adminCreateStudentAccount");
  const result = await call({ name: input.name.trim(), email: input.email.trim(), studentId: input.studentId.trim() });
  return result.data;
}
