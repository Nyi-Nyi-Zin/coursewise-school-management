"use client";

import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStudentAuth } from "@/components/student-auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutStudent } from "@/lib/auth-service";

export default function ProfilePage() {
  const { user, firebaseActive } = useStudentAuth(); const router = useRouter();
  async function signOut() { await logoutStudent(); toast.success("You have been signed out."); router.replace("/login"); }
  const name = user?.displayName || "Student"; const email = user?.email || "student@example.com";
  return <section className="max-w-3xl"><p className="text-sm font-medium text-sky-300">Account</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Profile</h1><Card className="mt-8"><CardContent className="p-6 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-2xl font-bold text-slate-950">{name.slice(0, 1).toUpperCase()}</div><div><h2 className="text-2xl font-bold text-white">{name}</h2><p className="mt-1 text-slate-400">Student ID · TL-2026-001</p></div></div><div className="mt-8 grid gap-3 sm:grid-cols-2"><Detail icon={Mail} label="Email" value={email} /><Detail icon={ShieldCheck} label="Account mode" value={firebaseActive ? "Firebase Authentication" : "Demo mode"} /></div><div className="mt-8 border-t border-slate-800 pt-6"><Button variant="outline" onClick={signOut}><LogOut className="size-4" />Sign out</Button></div></CardContent></Card></section>;
}
function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><div className="flex items-center gap-2 text-sm text-slate-500"><Icon className="size-4 text-sky-300" />{label}</div><p className="mt-2 truncate font-medium text-slate-200">{value}</p></div>; }
