"use client";

import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StudentBrand } from "../../../components/student-brand";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { requestPasswordReset } from "../../../lib/auth-service";
import { isFirebaseConfigured } from "../../../lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [sending, setSending] = useState(false); const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!isFirebaseConfigured) { toast.error("Password recovery activates after Firebase is connected."); return; } setSending(true); try { await requestPasswordReset(email); setSent(true); toast.success("Password reset email sent."); } catch { toast.error("We could not send a reset email. Confirm your email or contact the administrator."); } finally { setSending(false); } }
  return <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10"><Card className="w-full max-w-md border-slate-200 bg-white shadow-xl shadow-slate-200/60"><CardHeader className="gap-4"><StudentBrand /><div><CardTitle className="text-2xl">Reset your password</CardTitle><CardDescription>Enter your student email and Teza Tech Lab will send a secure reset link.</CardDescription></div></CardHeader><CardContent><form onSubmit={submit} className="space-y-5"><label className="block space-y-1.5"><span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Mail className="size-4 text-teal-700" />Email address</span><Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" required /></label><Button className="w-full" size="lg" disabled={sending || sent}>{sending ? "Sending…" : sent ? "Check your inbox" : <><Send className="size-4" />Send reset link</>}</Button>{sent ? <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-800 ring-1 ring-inset ring-teal-200">If the account exists, Firebase has sent reset instructions. Check the inbox and spam folder.</p> : null}<p className="text-center text-sm text-slate-500"><Link className="font-semibold text-teal-700 hover:text-teal-800" href="/login">Back to login</Link></p></form></CardContent></Card></main>;
}
