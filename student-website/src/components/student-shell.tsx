"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, CalendarDays, ClipboardCheck, House, Menu, UserCircle2 } from "lucide-react";
import { useEffect } from "react";
import { StudentBrand } from "@/components/student-brand";
import { cn } from "@/lib/utils";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";

const navigation = [
  { href: "/", label: "Home", icon: House },
  { href: "/lessons", label: "Lessons", icon: BookOpen },
  { href: "/quizzes", label: "Quizzes", icon: ClipboardCheck },
  { href: "/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseActive, loading, user, role } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const mustRedirect = firebaseActive && !loading && (!user || role === "admin");
  useEffect(() => {
    if (mustRedirect) router.replace("/login");
  }, [mustRedirect, router]);
  if (mustRedirect) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-400">Redirecting to secure sign in…</div>;
  }
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6">
          <StudentBrand />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Student navigation">
            {navigation.slice(0, 4).map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-sky-400/10 text-sky-300" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100")}>{item.label}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            {enrollment ? <span className="hidden rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-sky-200 sm:inline-flex">{enrollment.courseTitle} · {enrollment.batchName}</span> : null}
            <button className="grid size-10 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-900 hover:text-sky-300" aria-label="Notifications"><Bell className="size-5" /></button>
            <Link href="/profile" className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-700 sm:flex"><UserCircle2 className="size-4 text-sky-300" />My profile</Link>
            <button className="grid size-10 place-items-center rounded-xl border border-slate-800 text-slate-300 lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Mobile student navigation">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors", active ? "text-sky-300" : "text-slate-500")}><Icon className="size-5" />{item.label}</Link>;
          })}
        </div>
      </nav>
    </div>
  );
}
