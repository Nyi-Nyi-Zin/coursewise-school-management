"use client";

/* eslint-disable @next/next/no-img-element -- the bundled SVG logo is already optimized and fixed-size */

import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { hasFirebaseConfiguration } from "@/lib/firebase-config";
import { useSingleFlight } from "@/lib/use-single-flight";
import { getUserFacingErrorMessage } from "../../../../shared/user-facing-errors";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setError] = useState(false);
  const runSingleFlight = useSingleFlight();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!hasFirebaseConfiguration) {
      setError(true);
      setMessage(
        "Firebase Authentication is not configured for this deployment."
      );
      return;
    }
    await runSingleFlight("admin-auth", async () => {
      setSubmitting(true);
      try {
        const { signInAdministrator } = await import("@/lib/admin-auth-service");
        await signInAdministrator({ email, password });
        router.replace("/");
      } catch (error) {
        setError(true);
        setMessage(getUserFacingErrorMessage(error, "Unable to sign in as an administrator. Please check your details and try again."));
      } finally {
        setSubmitting(false);
      }
    });
  }

  async function resetPassword() {
    setMessage(null);
    if (!email.trim()) {
      setError(true);
      setMessage("Enter your administrator email address first.");
      return;
    }
    await runSingleFlight("admin-auth", async () => {
      setSubmitting(true);
      try {
        const { requestAdministratorPasswordReset } = await import(
          "@/lib/admin-auth-service"
        );
        await requestAdministratorPasswordReset(email);
        setError(false);
        setMessage(
          "A password-reset email has been sent if this Firebase account exists."
        );
      } catch (error) {
        setError(true);
        setMessage(getUserFacingErrorMessage(error, "Unable to request a password reset. Please check the email and try again."));
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
          Admin sign in
        </h1>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-stone-700">
            <span className="mb-1.5 flex items-center gap-2">
              <Mail size={15} className="text-emerald-700" />
              Email address
            </span>
            <input
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-stone-700">
            <span className="mb-1.5 flex items-center gap-2">
              <KeyRound size={15} className="text-emerald-700" />
              Password
            </span>
            <span className="relative block">
              <input
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 pr-11 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
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
            {isSubmitting ? (
              "Checking access…"
            ) : (
              <>
                Sign in <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
        <button
          type="button"
          onClick={() => void resetPassword()}
          className="mt-4 w-full text-center text-sm font-semibold text-emerald-800 hover:text-emerald-950 disabled:opacity-60"
          disabled={isSubmitting}
        >
          Forgot password?
        </button>
      </section>
    </main>
  );
}
