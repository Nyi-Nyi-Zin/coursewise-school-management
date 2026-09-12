"use client";

import { getFirebaseClient, hasFirebaseConfiguration } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AccessState = "checking" | "allowed" | "denied" | "unauthenticated";

// Each dashboard route renders its own page component. Keep the result of the
// initial auth check while moving between those routes so navigation does not
// briefly replace the entire workspace with a loading screen.
let cachedAccess: Exclude<AccessState, "checking"> | null = null;

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>(
    cachedAccess ?? (hasFirebaseConfiguration ? "checking" : "allowed")
  );

  useEffect(() => {
    if (!hasFirebaseConfiguration) return;
    const { auth, db } = getFirebaseClient();
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        cachedAccess = "unauthenticated";
        setAccess("unauthenticated");
        router.replace("/login");
        return;
      }
      const profile = await getDoc(doc(db, "users", user.uid));
      const nextAccess = profile.data()?.role === "admin" ? "allowed" : "denied";
      cachedAccess = nextAccess;
      setAccess(nextAccess);
    });
    return unsubscribe;
  }, [router]);

  if (access === "allowed") return <>{children}</>;
  if (access === "checking" || access === "unauthenticated") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f8f6]">
        <div className="text-center">
          <span className="mx-auto block size-8 animate-pulse rounded-full bg-emerald-800" />
          <p className="mt-4 text-sm font-semibold text-stone-500">
            {access === "unauthenticated"
              ? "Redirecting to sign in…"
              : "Checking administrator access…"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f8f6] p-6">
      <section className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700">
          <ShieldAlert size={22} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-stone-900">
          Administrator access required
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Sign in with a Firebase account whose matching user document has the role{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5">admin</code>.
        </p>
        <Link
          className="mt-6 inline-flex rounded-xl bg-[#143d36] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d5047]"
          href="/login"
        >
          Go to admin sign in
        </Link>
      </section>
    </main>
  );
}
