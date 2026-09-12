import { STRONG_PASSWORD_MESSAGE } from "../../../shared/auth-validation";
import { getUserFacingErrorMessage } from "../../../shared/user-facing-errors";

export function getStudentAuthenticationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.replace("Firebase: ", "") : "";

  if (/auth\/(invalid-credential|wrong-password|user-not-found)/.test(message)) {
    return "Email or password is incorrect. If you do not have an account yet, choose Register now.";
  }
  if (/auth\/email-already-in-use/.test(message)) {
    return "This email already has an account. Please sign in instead.";
  }
  if (/auth\/invalid-email/.test(message)) {
    return "Enter a valid email address and try again.";
  }
  if (/auth\/weak-password/.test(message)) {
    return STRONG_PASSWORD_MESSAGE;
  }
  if (/functions\/(not-found|unavailable)|function.*not found/i.test(message)) {
    return "Account registration is temporarily unavailable. Please try again shortly.";
  }
  if (/functions\/already-exists|already exists/i.test(message)) {
    return "This email already has an account. Please sign in instead.";
  }
  if (/email already has an account/i.test(message)) {
    return "This email already has an account. Please sign in instead.";
  }
  if (/security verification.*\(Google:/i.test(message)) {
    return "Security verification failed. Please try again.";
  }
  if (/security verification/i.test(message)) {
    return "Security verification failed. Please try again.";
  }
  if (/too many registration attempts/i.test(message)) {
    return "Too many registration attempts. Please wait an hour and try again.";
  }
  return getUserFacingErrorMessage(
    error,
    "Unable to complete authentication. Please try again.",
  );
}
