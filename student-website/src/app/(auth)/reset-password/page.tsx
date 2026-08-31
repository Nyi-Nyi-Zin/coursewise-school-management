"use client";

import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { toast } from "sonner";
import { StudentBrand } from "../../../components/student-brand";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { firebaseAuth, isFirebaseConfigured } from "../../../lib/firebase";
import { verifyStudentAuthSecurity } from "../../../lib/recaptcha";
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from "../../../../../shared/auth-validation";

type Stage = "loading" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [oobCode, setOobCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!isFirebaseConfigured || !firebaseAuth) throw new Error("unconfigured");
        const params = new URLSearchParams(window.location.search);
        const code = params.get("oobCode");
        if (params.get("mode") !== "resetPassword" || !code) throw new Error("invalid");
        return verifyPasswordResetCode(firebaseAuth, code).then(email => ({ code, email }));
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
    return () => { cancelled = true; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!isStrongPassword(password)) { toast.error(STRONG_PASSWORD_MESSAGE); return; }
    setSubmitting(true);
    try {
      await verifyStudentAuthSecurity("student_reset_confirm", resetEmail);
      await confirmPasswordReset(firebaseAuth!, oobCode, password);
      setStage("done");
    } catch {
      toast.error("The reset link is no longer valid. Request a new one.");
      setStage("invalid");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10"><Card className="w-full max-w-md border-slate-200 bg-white shadow-xl shadow-slate-200/60"><CardHeader className="gap-4"><StudentBrand /><div><CardTitle className="text-2xl">Choose a new password</CardTitle><CardDescription>{stage === "done" ? "Your password has been updated." : resetEmail ? `Setting a new password for ${resetEmail}.` : "Pick a strong password of at least 6 characters."}</CardDescription></div></CardHeader><CardContent>{stage === "loading" ? <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">Verifying your reset link…</p> : null}{stage === "invalid" ? <div className="space-y-4"><p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-inset ring-amber-200"><ShieldAlert className="mt-0.5 size-4 shrink-0" />This password reset link is invalid or has expired. Request a fresh link to continue.</p><Link href="/forgot-password" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-700 text-base font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.20)] transition-all duration-150 hover:bg-teal-800 active:scale-[0.97]">Request a new link</Link></div> : null}{stage === "ready" ? <form onSubmit={submit} className="space-y-5"><label className="block space-y-1.5"><span className="flex items-center gap-2 text-sm font-medium text-slate-700"><KeyRound className="size-4 text-teal-700" />New password</span><div className="relative"><Input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" required minLength={6} className="pr-11" /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-teal-700" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label><label className="block space-y-1.5"><span className="flex items-center gap-2 text-sm font-medium text-slate-700"><KeyRound className="size-4 text-teal-700" />Confirm password</span><Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat your new password" autoComplete="new-password" required minLength={6} /></label><Button className="w-full" size="lg" disabled={submitting}>{submitting ? "Updating…" : "Update password"}</Button></form> : null}{stage === "done" ? <div className="space-y-4"><p className="flex items-start gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-800 ring-1 ring-inset ring-teal-200"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />Your password has been changed. You can now sign in with your new password.</p><Link href="/login" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-700 text-base font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.20)] transition-all duration-150 hover:bg-teal-800 active:scale-[0.97]">Back to login</Link></div> : null}</CardContent></Card></main>;
}
