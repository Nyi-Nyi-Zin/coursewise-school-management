"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StudentBrand } from "@/components/student-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isFirebaseConfigured } from "@/lib/firebase";
import { loginStudent, registerStudent } from "@/lib/auth-service";
import { getStudentAuthenticationErrorMessage } from "@/lib/auth-error";
import { isEnglishName, isStrongPassword, isValidEmail, STRONG_PASSWORD_MESSAGE } from "../../../shared/auth-validation";

export function AuthCard({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFirebaseConfigured) {
      toast.error("Firebase Authentication is not configured yet.", { description: "Add the project web configuration to activate live student accounts." });
      return;
    }
    if (isRegister && password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (isRegister && !isEnglishName(name)) { toast.error("Enter your full name using English letters only."); return; }
    if (!isValidEmail(email)) { toast.error("Enter a valid email address."); return; }
    if (isRegister && !isStrongPassword(password)) { toast.error(STRONG_PASSWORD_MESSAGE); return; }
    setSubmitting(true);
    try {
      if (isRegister) {
        await registerStudent({ name, email, password });
        toast.success("Check your inbox and verify your email before signing in.");
      } else {
        await loginStudent({ email, password });
        toast.success("Welcome back to Teza Tech Lab.");
      }
      window.location.assign(isRegister ? "/login" : "/");
    } catch (error) {
      toast.error(isRegister ? "Registration could not be completed." : "Login could not be completed.", { description: getStudentAuthenticationErrorMessage(error) });
    } finally { setSubmitting(false); }
  }

  return (
    <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl shadow-slate-200/60">
      <CardHeader className="gap-4 pb-3"><StudentBrand /><div><CardTitle className="text-2xl">{isRegister ? "Create your account" : "Welcome back"}</CardTitle><CardDescription>{isRegister ? "Join your Teza Tech Lab learning space." : "Sign in to continue your learning journey."}</CardDescription></div></CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          {isRegister ? <Field icon={UserRound} label="Full name"><Input value={name} onChange={(event) => setName(event.target.value.replace(/[^A-Za-z '\-]/g, ""))} placeholder="Your full name" autoComplete="name" required minLength={2} pattern="[A-Za-z]+(?:[ '-][A-Za-z]+)*" title="Use English letters only." /></Field> : null}
          <Field icon={Mail} label="Email address"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required /></Field>
          <Field icon={LockKeyhole} label="Password"><div className="relative"><Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "8+ upper, lower, number, symbol" : "Your password"} autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : 1} className="pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-teal-700" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></Field>
          {isRegister ? <Field icon={LockKeyhole} label="Confirm password"><div className="relative"><Input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" required minLength={8} className="pr-11" /><button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-teal-700" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>{showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></Field> : null}
          <Button className="w-full" size="lg" disabled={submitting}>{submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}<ArrowRight className="size-4" /></Button>
          <p className="text-center text-sm text-slate-500">{isRegister ? "Already have an account? " : "New to Teza Tech Lab? "}<Link className="font-semibold text-teal-700 hover:text-teal-800" href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Register now"}</Link></p>
          {!isRegister ? <p className="text-center text-sm"><Link className="font-semibold text-teal-700 hover:text-teal-800" href="/forgot-password">Forgot password?</Link></p> : null}
          {!isFirebaseConfigured ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-inset ring-amber-200">Live accounts will activate when the Firebase web project configuration is added.</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon className="size-4 text-teal-700" />{label}</span>{children}</label>;
}
