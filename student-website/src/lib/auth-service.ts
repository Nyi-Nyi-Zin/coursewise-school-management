import { EmailAuthProvider, getIdTokenResult, reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { firebaseAuth, isFirebaseConfigured } from "./firebase";
import { firestore } from "./firebase";
import { executeRecaptcha, verifyStudentAuthSecurity } from "./recaptcha";
import { isEnglishName, isStrongPassword, isValidEmail, normalizeEmail, STRONG_PASSWORD_MESSAGE } from "../../../shared/auth-validation";
import { createEmailActionContinueUrl } from "../../../shared/email-action-url";
import { getUserFacingErrorMessage } from "../../../shared/user-facing-errors";

export type PortalRole = "admin" | "student" | null;

export async function registerStudent({ name, email, password }: { name: string; email: string; password: string }) {
  if (!firebaseAuth || !isFirebaseConfigured) throw new Error("Firebase Authentication is not configured.");
  if (!isEnglishName(name)) throw new Error("Enter your full name using English letters only.");
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) throw new Error("Enter a valid email address.");
  if (!isStrongPassword(password)) throw new Error(STRONG_PASSWORD_MESSAGE);
  const recaptchaToken = await executeRecaptcha("student_signup");
  const response = await fetch("/api/register-student", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: name.trim(), email: normalizedEmail, password, recaptchaToken }),
  });
  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(getUserFacingErrorMessage(
      new Error(payload?.message || payload?.error || ""),
      "Unable to register your account. Please try again.",
    ));
  }
  const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
  await sendEmailVerification(credential.user, { url: `${window.location.origin}/login` });
  await signOut(firebaseAuth);
  return null;
}

export async function loginStudent({ email, password }: { email: string; password: string }) {
  if (!firebaseAuth || !isFirebaseConfigured) throw new Error("Firebase Authentication is not configured.");
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) throw new Error("Enter a valid email address.");
  await verifyStudentAuthSecurity("student_login", normalizedEmail);
  const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
  const profile = firestore ? await getDoc(doc(firestore, "users", credential.user.uid)).catch(() => null) : null;
  if (!profile?.exists() || profile.data()?.role !== "student" || profile.data()?.isActive === false) {
    await signOut(firebaseAuth);
    throw new Error("This student account is inactive or no longer available. Contact an administrator.");
  }
  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user, { url: `${window.location.origin}/login` }).catch(() => undefined);
    await signOut(firebaseAuth);
    throw new Error("Verify your email before signing in. A new verification email was sent.");
  }
  return credential.user;
}

export async function logoutStudent() {
  if (firebaseAuth) await signOut(firebaseAuth);
}

export async function requestPasswordReset(email: string) {
  if (!firebaseAuth || !isFirebaseConfigured) throw new Error("Firebase Authentication is not configured.");
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) throw new Error("Enter a valid email address.");
  await verifyStudentAuthSecurity("student_reset_request", normalizedEmail);
  await sendPasswordResetEmail(firebaseAuth, normalizedEmail, {
    url: createEmailActionContinueUrl(window.location.origin),
    handleCodeInApp: false,
  });
}

export async function changePassword(user: User, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
  if (!isFirebaseConfigured) throw new Error("Changing your password is not available in demo mode.");
  if (!isStrongPassword(newPassword)) throw new Error(STRONG_PASSWORD_MESSAGE);
  const credential = EmailAuthProvider.credential(user.email ?? "", currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function getPortalRole(user: User): Promise<PortalRole> {
  const token = await getIdTokenResult(user, true);
  const role = token.claims.role;
  return role === "admin" || role === "student" ? role : null;
}
