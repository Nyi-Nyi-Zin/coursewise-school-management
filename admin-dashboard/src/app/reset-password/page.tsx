"use client";

/* eslint-disable @next/next/no-img-element -- the bundled SVG logo is already optimized and fixed-size */

import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { getFirebaseClient, hasFirebaseConfiguration } from "@/lib/firebase";
import {
  isStrongPassword,
  STRONG_PASSWORD_MESSAGE,
} from "../../../../shared/auth-validation";
import { useSingleFlight } from "@/lib/use-single-flight";

type Stage = "loading" | "ready" | "invalid" | "done";

const inputClassName =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100";

export default function AdminResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [resetEmail, setResetEmail] = useState("");
  const [oobCode, setOobCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setError] = useState(false);
  const runSingleFlight = useSingleFlight();

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!hasFirebaseConfiguration) throw new Error("unconfigured");
        const { auth } = getFirebaseClient();
        const params = new URLSearchParams(window.location.search);
        const code = params.get("oobCode");
        if (params.get("mode") !== "resetPassword" || !code)
          throw new Error("invalid");
        return verifyPasswordResetCode(auth, code).then(email => ({
          code,
          email,
        }));
      })
      .then(verified => {
        if (cancelled) return;
        setOobCode(verified.code);
        setResetEmail(verified.email);
        setStage("ready");
      })
      .catch(() => {
        if (!cancelled) setStage("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError(true);
      setMessage("Passwords do not match.");
      return;
    }
    if (!isStrongPassword(password)) {
      setError(true);
      setMessage(STRONG_PASSWORD_MESSAGE);
      return;
    }
    await runSingleFlight("admin-reset-password", async () => {
      setSubmitting(true);
      setMessage(null);
      try {
        const { auth } = getFirebaseClient();
        await confirmPasswordReset(auth, oobCode, password);
        setStage("done");
      } catch {
        setError(true);
        setMessage(
          "This reset link is no longer valid. Request a fresh one from the sign-in page."
        );
        setStage("invalid");
      } finally {
        setSubmitting(false);
      }
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f8f6] p-5 text-stone-900">
      <section className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-7 shadow-xl shadow-stone-900/5 sm:p-9">
        <div className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-[#d4f59b]/35">
          <img
            src="/teza-tech-lab-logo.svg"
            alt="Teza Tech Lab"
            className="size-full object-cover"
          />
        </div>
        <p className="mt-7 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-800">
          Teza Tech Lab
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          {stage === "done"
            ? "Your administrator password has been updated."
            : resetEmail
              ? `Setting a new password for ${resetEmail}.`
              : "Pick a strong password of at least 6 characters for the administration workspace."}
        </p>
        {stage === "loading" ? (
          <p className="mt-6 rounded-xl bg-stone-50 px-3 py-2 text-sm leading-5 text-stone-500">
            Verifying your reset link…
          </p>
        ) : null}
        {stage === "invalid" ? (
          <div className="mt-6 space-y-4">
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              This password reset link is invalid or has expired. Request a
              fresh link from the sign-in page.
            </p>
            <Link
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#143d36] text-sm font-bold text-white transition hover:bg-[#1d5047]"
              href="/login"
            >
              Back to sign in
            </Link>
          </div>
        ) : null}
        {stage === "ready" ? (
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-semibold text-stone-700">
              <span className="mb-1.5 flex items-center gap-2">
                <KeyRound size={15} className="text-emerald-700" />
                New password
              </span>
              <span className="relative block">
                <input
                  className={inputClassName}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-stone-400 hover:text-emerald-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <label className="block text-sm font-semibold text-stone-700">
              <span className="mb-1.5 flex items-center gap-2">
                <KeyRound size={15} className="text-emerald-700" />
                Confirm password
              </span>
              <input
                className={inputClassName}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>
            {message ? (
              <p
                className={`rounded-xl px-3 py-2 text-sm leading-5 ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}
              >
                {message}
              </p>
            ) : null}
            <button
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#143d36] text-sm font-bold text-white transition hover:bg-[#1d5047] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating password…" : "Update password"}
            </button>
          </form>
        ) : null}
        {stage === "done" ? (
          <div className="mt-6 space-y-4">
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-5 text-emerald-800">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              Your password has been changed. Sign in with your new password to
              continue.
            </p>
            <Link
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#143d36] text-sm font-bold text-white transition hover:bg-[#1d5047]"
              href="/login"
            >
              Back to sign in
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
