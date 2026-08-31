"use client";
declare global { interface Window { grecaptcha?: { ready(callback: () => void): void; execute(siteKey: string, options: { action: string }): Promise<string> } } }
export type RecaptchaAction = "student_signup" | "student_login" | "student_reset_request" | "student_reset_confirm";
export async function executeRecaptcha(action: RecaptchaAction) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY; if (!siteKey) throw new Error("Security verification is not configured.");
  await new Promise<void>((resolve, reject) => { const started = Date.now(); const poll = () => { if (window.grecaptcha) return window.grecaptcha.ready(resolve); if (Date.now() - started > 10_000) return reject(new Error("Security verification could not be loaded.")); window.setTimeout(poll, 100); }; poll(); });
  return window.grecaptcha!.execute(siteKey, { action });
}
export async function verifyStudentAuthSecurity(action: RecaptchaAction, email: string, token?: string) {
  const recaptchaToken = token ?? await executeRecaptcha(action);
  const response = await fetch("/api/register-student", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, email, token: recaptchaToken }) });
  const payload = await response.json().catch(() => null) as { message?: string } | null; if (!response.ok) throw new Error(payload?.message || "Security verification failed."); return recaptchaToken;
}
