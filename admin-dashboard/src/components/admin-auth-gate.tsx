"use client";

import { getFirebaseClient, hasFirebaseConfiguration } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type AccessState = "checking" | "allowed" | "denied";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<AccessState>(hasFirebaseConfiguration ? "checking" : "allowed");

  useEffect(() => {
    if (!hasFirebaseConfiguration) return;
    const { auth, db } = getFirebaseClient();
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setAccess("denied");
        return;
      }
      const profile = await getDoc(doc(db, "users", user.uid));
      setAccess(profile.data()?.role === "admin" ? "allowed" : "denied");
    });
    return unsubscribe;
  }, []);

  if (access === "allowed") return <>{children}</>;
  if (access === "checking") return <main className="grid min-h-screen place-items-center bg-[#f8f8f6]"><div className="text-center"><span className="mx-auto block size-8 animate-pulse rounded-full bg-emerald-800" /><p className="mt-4 text-sm font-semibold text-stone-500">Checking administrator access…</p></div></main>;
  return <main className="grid min-h-screen place-items-center bg-[#f8f8f6] p-6"><section className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700"><ShieldAlert size={22} /></span><h1 className="mt-5 font-display text-2xl font-semibold text-stone-900">Administrator access required</h1><p className="mt-3 text-sm leading-6 text-stone-500">Sign in with a Firebase account whose matching user document has the role <code className="rounded bg-stone-100 px-1.5 py-0.5">admin</code>.</p></section></main>;
}
