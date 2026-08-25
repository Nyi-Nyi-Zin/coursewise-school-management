import { authenticatedApiFetch } from "./authenticated-api";
import { hasFirebaseConfiguration } from "./firebase";

export async function createStudentAccount(input: { name: string; email: string; studentId?: string; photoUrl?: string; isActive?: boolean }) {
  if (!hasFirebaseConfiguration) throw new Error("Firebase is not configured.");
  return authenticatedApiFetch("/api/students", { method: "POST", body: JSON.stringify({ name: input.name.trim(), email: input.email.trim(), photoUrl: input.photoUrl?.trim() || undefined, isActive: input.isActive }) }) as Promise<{ uid: string; studentId: string; resetLink: string }>;
}
