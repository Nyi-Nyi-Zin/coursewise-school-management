import { authenticatedApiFetch } from "./authenticated-api";

export async function setStudentEmailVerification(studentId: string, emailVerified: boolean) {
  return authenticatedApiFetch("/api/students", {
    method: "PATCH",
    body: JSON.stringify({ studentId, emailVerified }),
  });
}
