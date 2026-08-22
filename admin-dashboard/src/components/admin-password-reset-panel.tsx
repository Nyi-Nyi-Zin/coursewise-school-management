"use client";

import { httpsCallable } from "firebase/functions";
import { KeyRound, MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { hasFirebaseConfiguration, getFirebaseClient } from "@/lib/firebase";

export function AdminPasswordResetPanel() {
  const [email, setEmail] = useState(""); const [link, setLink] = useState(""); const [message, setMessage] = useState<string | null>(null); const [sending, setSending] = useState(false);
  async function createResetLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!hasFirebaseConfiguration) { setMessage("Connect Firebase before using administrator password recovery."); return; }
    setSending(true); setMessage(null);
    try {
      const { functions } = getFirebaseClient(); const call = httpsCallable<{ email: string }, { link: string }>(functions, "adminCreatePasswordResetLink");
      const result = await call({ email: email.trim() }); setLink(result.data.link); setMessage("A secure, one-time password reset link was created for this student.");
    } catch { setMessage("The reset link could not be created. Confirm you are signed in as an administrator and deploy the Cloud Function."); }
    finally { setSending(false); }
  }
  return <section className="mt-5 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-800"><KeyRound size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Administrator assistance</p><h3 className="mt-1 font-display text-xl font-semibold">Generate a student password-reset link</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Use this when a student cannot access their email recovery flow. The callable function verifies your administrator user profile before it creates a Firebase reset link.</p></div></div><form onSubmit={createResetLink} className="mt-5 flex flex-col gap-3 sm:flex-row"><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="student@example.com" required className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600" /><Button type="submit" disabled={sending}>{sending ? "Creating…" : <><MailCheck size={16} />Create secure link</>}</Button></form>{message ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">{message}</p> : null}{link ? <div className="mt-4 rounded-xl bg-stone-50 p-3"><p className="text-xs font-bold text-stone-600">Share this one-time link with the verified student through a trusted channel.</p><textarea readOnly value={link} className="mt-2 min-h-20 w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-600" /></div> : null}</section>;
}
