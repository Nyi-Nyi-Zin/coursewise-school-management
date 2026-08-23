import { describe, expect, it } from "vitest";
import { getStudentAuthenticationErrorMessage } from "./auth-error";

describe("getStudentAuthenticationErrorMessage", () => {
  it("replaces Firebase invalid-credential details with safe sign-in guidance", () => {
    expect(getStudentAuthenticationErrorMessage(new Error("Firebase: Error (auth/invalid-credential)."))).toBe(
      "Email or password is incorrect. If you do not have an account yet, choose Register now.",
    );
  });

  it("gives account-creation guidance for an existing email", () => {
    expect(getStudentAuthenticationErrorMessage(new Error("Firebase: Error (auth/email-already-in-use)."))).toBe(
      "This email already has an account. Please sign in instead.",
    );
  });
});
