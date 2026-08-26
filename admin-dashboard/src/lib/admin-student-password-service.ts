import { authenticatedApiFetch } from "./authenticated-api";
import { hasFirebaseConfiguration } from "./firebase";

export async function setStudentPassword(uid: string, password: string) {
  if (!hasFirebaseConfiguration) throw new Error("Firebase is not configured.");
  await authenticatedApiFetch("/api/set-student-password", { method: "POST", body: JSON.stringify({ uid, password }) });
}
