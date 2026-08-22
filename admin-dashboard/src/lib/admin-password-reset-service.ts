import { httpsCallable } from "firebase/functions";
import { getFirebaseClient, hasFirebaseConfiguration } from "./firebase";

export async function createAdminPasswordResetLink(email: string) {
  if (!hasFirebaseConfiguration) throw new Error("Firebase is not configured.");
  const { functions } = getFirebaseClient();
  const call = httpsCallable<{ email: string }, { link: string }>(functions, "adminCreatePasswordResetLink");
  const result = await call({ email: email.trim() });
  return result.data.link;
}
