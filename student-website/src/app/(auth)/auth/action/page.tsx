"use client";

import Link from "next/link";
import { applyActionCode } from "firebase/auth";
import { CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { StudentBrand } from "@/components/student-brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { resolveEmailActionReturnUrl } from "../../../../../../shared/email-action-url";

type EmailActionStage = "loading" | "success" | "invalid";
type SupportedEmailAction = "verifyEmail" | "recoverEmail";

const actionCopy: Record<
  SupportedEmailAction,
  { title: string; success: string }
> = {
  verifyEmail: {
    title: "Verify your email",
    success: "Your email address has been verified. You can now sign in.",
  },
  recoverEmail: {
    title: "Restore your email",
    success: "Your previous email address has been restored.",
  },
};

export default function EmailActionPage() {
  const [stage, setStage] = useState<EmailActionStage>("loading");
  const [action, setAction] = useState<SupportedEmailAction>("verifyEmail");
  const returnUrl =
    typeof window === "undefined"
      ? "/login"
      : resolveEmailActionReturnUrl(
          new URLSearchParams(window.location.search).get("continueUrl"),
          "/login",
          [window.location.origin]
        );

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(async () => {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get("mode");
        const code = params.get("oobCode");

        if (mode === "resetPassword") {
          const resetUrl = new URL("/reset-password", window.location.origin);
          resetUrl.search = params.toString();
          window.location.replace(resetUrl.toString());
          return;
        }

        if (
          !isFirebaseConfigured ||
          !firebaseAuth ||
          !code ||
          (mode !== "verifyEmail" && mode !== "recoverEmail")
        ) {
          throw new Error("invalid-email-action");
        }

        if (!cancelled) setAction(mode);
        await applyActionCode(firebaseAuth, code);
        if (!cancelled) setStage("success");
      })
      .catch(() => {
        if (!cancelled) setStage("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const copy = actionCopy[action];

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10">
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <CardHeader className="gap-4">
          <StudentBrand />
          <div>
            <CardTitle className="text-2xl">
              {stage === "invalid" ? "Email link unavailable" : copy.title}
            </CardTitle>
            <CardDescription>
              Teza Tech Lab is securely checking your email action.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage === "loading" ? (
            <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
              <LoaderCircle className="size-4 animate-spin text-teal-700" />
              Verifying your secure link…
            </p>
          ) : null}
          {stage === "success" ? (
            <p className="flex items-start gap-2 rounded-lg bg-teal-50 px-3 py-3 text-sm leading-5 text-teal-800 ring-1 ring-inset ring-teal-200">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              {copy.success}
            </p>
          ) : null}
          {stage === "invalid" ? (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-3 text-sm leading-5 text-amber-800 ring-1 ring-inset ring-amber-200">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              This email action link is invalid or has expired. Request a new
              email and try again.
            </p>
          ) : null}
          {stage !== "loading" ? (
            <a
              href={returnUrl}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-700 text-base font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.20)] transition-all duration-150 hover:bg-teal-800 active:scale-[0.97]"
            >
              Back to login
            </a>
          ) : null}
          {stage === "invalid" ? (
            <p className="text-center text-sm text-slate-500">
              <Link
                className="font-semibold text-teal-700 hover:text-teal-800"
                href="/forgot-password"
              >
                Request a password reset
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
