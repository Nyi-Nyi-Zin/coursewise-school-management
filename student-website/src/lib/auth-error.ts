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
    return "Choose a stronger password with at least 6 characters.";
  }
  return message || "Unable to complete authentication. Please try again.";
}
