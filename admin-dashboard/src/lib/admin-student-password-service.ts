import { authenticatedApiFetch } from "./authenticated-api";
import { hasFirebaseConfiguration } from "./firebase";
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from "../../../shared/auth-validation";

export async function setStudentPassword(uid: string, password: string) {
  if (!hasFirebaseConfiguration) throw new Error("Firebase is not configured.");
  if (!isStrongPassword(password)) throw new Error(STRONG_PASSWORD_MESSAGE);
  await authenticatedApiFetch("/api/set-student-password", { method: "POST", body: JSON.stringify({ uid, password }) });
}
