"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { hasFirebaseConfiguration } from "../lib/firebase";
import { createStudentAccount } from "../lib/admin-student-account-service";

export function AdminStudentAccountPanel() {
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [resetLink, setResetLink] = useState(""); const [message, setMessage] = useState<string | null>(null); const [creating, setCreating] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!hasFirebaseConfiguration) { setMessage("Connect Firebase before creating student accounts."); return; }
    setCreating(true); setMessage(null); setResetLink("");
    try {
      const account = await createStudentAccount({ name, email });
      setResetLink(account.resetLink); setName(""); setEmail("");
      setMessage(`Student ID ${account.studentId} was assigned. Share the password-setup link below with the student.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The account could not be created. Confirm you are signed in as an administrator."); }
    finally { setCreating(false); }
  }
  return <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><UserPlus size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Student onboarding</p><h3 className="mt-1 font-display text-xl font-semibold">Create a student sign-in account</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Opens a Firebase Authentication account plus the matching student profile, then generates a one-time link the student uses to choose their own password.</p></div></div>
    <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <input value={name} onChange={event => setName(event.target.value)} placeholder="Full name" required minLength={2} className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600" />
      <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="student@example.com" required className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600" />
      <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
    </form>
    {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">{message}</p> : null}
    {resetLink ? <div className="mt-4 rounded-xl bg-stone-50 p-3"><p className="text-xs font-bold text-stone-600">One-time password setup link.</p><textarea readOnly value={resetLink} className="mt-2 min-h-20 w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-600" /></div> : null}
  </section>;
}
