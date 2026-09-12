"use client";
declare global { interface Window { grecaptcha?: { ready(callback: () => void): void; execute(siteKey: string, options: { action: string }): Promise<string> } } }
export type RecaptchaAction = "student_signup" | "student_login" | "student_reset_request" | "student_reset_confirm";

let recaptchaLoad: Promise<void> | undefined;

function loadRecaptcha(siteKey: string) {
  if (window.grecaptcha) return Promise.resolve();
  recaptchaLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => reject(new Error("Security verification could not be loaded.")), 10_000);
    script.id = "recaptcha-v3";
    script.async = true;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.addEventListener("load", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      recaptchaLoad = undefined;
      reject(new Error("Security verification could not be loaded."));
    }, { once: true });
    document.head.append(script);
  });
  return recaptchaLoad;
}

export async function executeRecaptcha(action: RecaptchaAction) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY; if (!siteKey) throw new Error("Security verification is not configured.");
  await loadRecaptcha(siteKey);
  await new Promise<void>(resolve => window.grecaptcha!.ready(resolve));
  return window.grecaptcha!.execute(siteKey, { action });
}
export async function verifyStudentAuthSecurity(action: RecaptchaAction, email: string, token?: string) {
  const recaptchaToken = token ?? await executeRecaptcha(action);
  const response = await fetch("/api/register-student", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, email, token: recaptchaToken }) });
  if (!response.ok) throw new Error("Security verification failed."); return recaptchaToken;
}
