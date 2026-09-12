/**
 * Converts low-level Firebase/Firestore and network errors into messages that
 * are safe to show in a portal UI. Unknown errors intentionally use the
 * caller's fallback so database internals never leak to users.
 */
export function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code.toLowerCase() : "";
}

function rawMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function isLowLevelDatabaseError(error: unknown, message: string) {
  const code = getErrorCode(error);
  return Boolean(
    code.startsWith("permission-denied") ||
      code.startsWith("failed-precondition") ||
      code.startsWith("not-found") ||
      code.startsWith("already-exists") ||
      code.startsWith("unavailable") ||
      code.startsWith("deadline-exceeded") ||
      code.startsWith("resource-exhausted") ||
      code.startsWith("unauthenticated") ||
      code.startsWith("invalid-argument") ||
      code.startsWith("auth/") ||
      /(?:firestore|cloud firestore|missing or insufficient permissions|permission[_ -]?denied|grpc|rpc|firebaseerror)/i.test(message),
  );
}

/**
 * Keep intentional product validation/API messages, but never render a raw
 * Firebase or database message. The fallback should describe the operation.
 */
export function getUserFacingErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const code = getErrorCode(error);
  const message = rawMessage(error);
  const signal = `${code} ${message}`.toLowerCase();

  if (/auth\/(?:invalid-credential|wrong-password|user-not-found)/.test(signal)) {
    return "Email or password is incorrect. Check your details and try again.";
  }
  if (signal.includes("auth/email-already-in-use")) {
    return "This email already has an account. Please sign in instead.";
  }
  if (signal.includes("auth/invalid-email")) {
    return "Enter a valid email address and try again.";
  }
  if (signal.includes("auth/weak-password")) {
    return "Choose a stronger password of at least 6 characters.";
  }
  if (signal.includes("auth/too-many-requests")) {
    return "Too many attempts were made. Please wait a moment and try again.";
  }
  if (signal.includes("auth/network-request-failed")) {
    return "The network request failed. Check your connection and try again.";
  }
  if (signal.includes("auth/requires-recent-login")) {
    return "Please sign in again before changing this account information.";
  }
  if (signal.includes("auth/expired-action-code") || signal.includes("auth/invalid-action-code")) {
    return "This link is invalid or has expired. Request a new one and try again.";
  }

  if (/permission[_ -]?denied/.test(signal) || signal.includes("missing or insufficient permissions")) {
    return "You do not have permission to complete this action.";
  }
  if (signal.includes("unauthenticated")) {
    return "Your session has expired. Please sign in again.";
  }
  if (signal.includes("not-found")) {
    return "The requested record could not be found. Refresh the page and try again.";
  }
  if (signal.includes("already-exists")) {
    return "A record with these details already exists.";
  }
  if (signal.includes("failed-precondition")) {
    return "This action cannot be completed because required data is missing or invalid.";
  }
  if (signal.includes("unavailable") || signal.includes("deadline-exceeded")) {
    return "The service is temporarily unavailable. Check your connection and try again.";
  }
  if (signal.includes("resource-exhausted")) {
    return "Too many requests were made. Please wait a moment and try again.";
  }
  if (signal.includes("invalid-argument")) {
    return "Some information is invalid. Check the form and try again.";
  }

  if (isLowLevelDatabaseError(error, message)) return fallback;
  if (/^(?:forbidden|failed|internal server error|unknown error|error)$/i.test(message.trim())) return fallback;
  return message.trim() || fallback;
}
