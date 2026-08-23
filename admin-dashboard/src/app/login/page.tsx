"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { requestAdministratorPasswordReset, signInAdministrator } from "@/lib/admin-auth-service";
import { hasFirebaseConfiguration } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!hasFirebaseConfiguration) {
      setError(true);
      setMessage("Firebase Authentication is not configured for this deployment.");
      return;
    }
    setSubmitting(true);
    try {
      await signInAdministrator({ email, password });
      router.replace("/");
    } catch (error) {
      setError(true);
      setMessage(error instanceof Error ? error.message.replace("Firebase: ", "") : "Unable to sign in as an administrator.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    setMessage(null);
    if (!email.trim()) {
      setError(true);
      setMessage("Enter your administrator email address first.");
      return;
    }
    setSubmitting(true);
    try {
      await requestAdministratorPasswordReset(email);
      setError(false);
      setMessage("A password-reset email has been sent if this Firebase account exists.");
    } catch (error) {
      setError(true);
      setMessage(error instanceof Error ? error.message.replace("Firebase: ", "") : "Unable to request a password reset.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f8f8f6] p-5 text-stone-900"><section className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-7 shadow-xl shadow-stone-900/5 sm:p-9"><div className="grid size-12 place-items-center rounded-2xl bg-[#143d36] text-[#d4f59b]"><ShieldCheck size={24} /></div><p className="mt-7 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-800/60">Teza Tech Lab</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Admin sign in</h1><p className="mt-3 text-sm leading-6 text-stone-500">Use the Firebase account that has an administrator profile. Student accounts cannot enter this workspace.</p><form className="mt-7 space-y-4" onSubmit={submit}><label className="block text-sm font-semibold text-stone-700"><span className="mb-1.5 flex items-center gap-2"><Mail size={15} className="text-emerald-700" />Email address</span><input className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" type="email" autoComplete="email" placeholder="admin@example.com" value={email} onChange={event => setEmail(event.target.value)} required /></label><label className="block text-sm font-semibold text-stone-700"><span className="mb-1.5 flex items-center gap-2"><KeyRound size={15} className="text-emerald-700" />Password</span><input className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} /></label>{message ? <p className={`rounded-xl px-3 py-2 text-sm leading-5 ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{message}</p> : null}<button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#143d36] text-sm font-bold text-white transition hover:bg-[#1d5047] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>{isSubmitting ? "Checking access…" : <>Sign in <ArrowRight size={16} /></>}</button></form><button type="button" onClick={() => void resetPassword()} className="mt-4 w-full text-center text-sm font-semibold text-emerald-800 hover:text-emerald-950 disabled:opacity-60" disabled={isSubmitting}>Forgot password?</button><p className="mt-7 border-t border-stone-100 pt-5 text-center text-xs leading-5 text-stone-500">Need first-administrator access? Follow the secure <Link className="font-semibold text-emerald-800 hover:text-emerald-950" href="https://github.com/Nyi-Nyi-Zin/coursewise-school-management/blob/main/docs/FIRST_ADMIN_BOOTSTRAP.md" target="_blank">bootstrap guide</Link>.</p></section></main>;
}
