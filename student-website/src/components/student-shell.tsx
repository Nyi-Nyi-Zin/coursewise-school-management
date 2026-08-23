"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, BookOpen, CalendarDays, ClipboardCheck, House, Menu, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { StudentBrand } from "@/components/student-brand";
import { cn } from "@/lib/utils";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { PreferenceControls, usePortalPreferences } from "../../../shared/portal-preferences";
import type { PortalTextKey } from "../../../shared/portal-i18n";

const navigation = [
  { href: "/", label: "Home", icon: House },
  { href: "/lessons", label: "Lessons", icon: BookOpen },
  { href: "/quizzes", label: "Quizzes", icon: ClipboardCheck },
  { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
  { href: "/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];
const studentNavTextKeys: Record<string, PortalTextKey> = { "/": "home", "/lessons": "lessons", "/quizzes": "quizzes", "/assignments": "assignments", "/attendance": "attendance", "/progress": "progress", "/profile": "profile" };

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseActive, loading, user, role } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const { theme, t } = usePortalPreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const mustRedirect = firebaseActive && !loading && (!user || role === "admin");
  useEffect(() => {
    if (mustRedirect) router.replace("/login");
  }, [mustRedirect, router]);
  if (mustRedirect) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-400">Redirecting to secure sign in…</div>;
  }
  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-[#f8f8f6] text-stone-800"}`}>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#f8f8f6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6">
          <StudentBrand />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Student navigation">
            {navigation.slice(0, 5).map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-emerald-50 text-emerald-800" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800")}>{t(studentNavTextKeys[item.href])}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex"><PreferenceControls compact /></span>
            {enrollment ? <span className="hidden rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-sky-200 sm:inline-flex">{enrollment.courseTitle} · {enrollment.batchName}</span> : null}
            <Link href="/notifications" className="grid size-10 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-900 hover:text-sky-300" aria-label="Notifications"><Bell className="size-5" /></Link>
            <Link href="/profile" className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-700 sm:flex"><UserCircle2 className="size-4 text-sky-300" />{t("myProfile")}</Link>
            <button onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-xl border border-slate-800 text-slate-300 lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button>
          </div>
        </div>
      </header>
      {menuOpen ? <><button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/70 lg:hidden" /><aside className="fixed inset-y-0 right-0 z-50 w-72 border-l border-slate-800 bg-slate-950 p-5 shadow-2xl lg:hidden"><div className="mb-8 flex items-center justify-between"><StudentBrand /><button onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-1 text-sm text-slate-400">Close</button></div><nav className="grid gap-2" aria-label="Student navigation">{navigation.map(item => { const Icon = item.icon; const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold", active ? "bg-sky-400/10 text-sky-200" : "text-slate-300 hover:bg-slate-900")}><Icon className="size-5" />{t(studentNavTextKeys[item.href])}</Link>; })}</nav></aside></> : null}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-[#f8f8f6]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Mobile student navigation">
        <div className="mx-auto grid max-w-xl grid-cols-7">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors", active ? "text-emerald-700" : "text-stone-400")}><Icon className="size-5" />{t(studentNavTextKeys[item.href])}</Link>;
          })}
        </div>
      </nav>
    </div>
  );
}
