import { authenticatedApiFetch } from "./authenticated-api";
import { hasFirebaseConfiguration } from "./firebase";

export async function createAdminPasswordResetLink(email: string) {
  if (!hasFirebaseConfiguration) throw new Error("Firebase is not configured.");
  const result = await authenticatedApiFetch("/api/password-reset-link", { method: "POST", body: JSON.stringify({ email: email.trim() }) }) as { link: string };
  return result.link;
}
