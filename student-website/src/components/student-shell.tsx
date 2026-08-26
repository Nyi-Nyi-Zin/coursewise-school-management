"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Award, Bell, BookOpen, CalendarDays, ClipboardCheck, House, Menu, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StudentBrand } from "@/components/student-brand";
import { StudentFooter } from "@/components/student-footer";
import { cn } from "@/lib/utils";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { getStudentProfile } from "@/lib/student-repository";
import { attendancePageEnabled, certificatesPageEnabled, notificationsIconEnabled } from "../../../shared/portal-display-settings";

const navigation = [
  { href: "/", label: "Home", icon: House },
  { href: "/lessons", label: "Lessons", icon: BookOpen },
  { href: "/quizzes", label: "Quizzes", icon: ClipboardCheck },
  { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
  ...(attendancePageEnabled ? [{ href: "/attendance", label: "Attendance", icon: CalendarDays }] : []),
  ...(certificatesPageEnabled ? [{ href: "/certificates", label: "Certificates", icon: Award }] : []),
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseActive, loading, user, role } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const profile = useQuery({ queryKey: ["student", "profile", user?.uid], queryFn: () => getStudentProfile(user!.uid), enabled: Boolean(user?.uid), staleTime: 60_000 });
  const photoUrl = profile.data?.photoUrl;
  const [menuOpen, setMenuOpen] = useState(false);
  const mustRedirect = firebaseActive && !loading && (!user || role === "admin");
  useEffect(() => {
    if (mustRedirect) router.replace("/login");
  }, [mustRedirect, router]);
  if (mustRedirect) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-400">Redirecting to secure sign in…</div>;
  }
  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6">
          <StudentBrand />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Student navigation">
            {navigation.filter(item => item.href !== "/profile").map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}>{item.label}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            {enrollment ? <span className="hidden rounded-lg bg-teal-900 px-2.5 py-1.5 text-[10px] font-semibold text-teal-100 sm:inline-flex">{enrollment.courseTitle} · {enrollment.batchName}</span> : null}
            {notificationsIconEnabled ? <button className="grid size-10 place-items-center rounded-xl text-teal-400 transition-colors hover:bg-teal-900 hover:text-teal-200" aria-label="Notifications"><Bell className="size-5" /></button> : null}
            <Link href="/profile" className="hidden items-center gap-2 rounded-xl border border-teal-800 bg-teal-900 px-3 py-2 text-sm font-medium text-teal-200 hover:border-teal-700 sm:flex">{photoUrl ? <img src={photoUrl} alt="My profile" className="size-6 rounded-full object-cover ring-1 ring-teal-300/40" /> : <UserCircle2 className="size-4 text-teal-300" />}My profile</Link>
            <button onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-xl border border-teal-800 text-teal-300 lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button>
          </div>
        </div>
      </header>
      {menuOpen ? <><button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-teal-950/70 lg:hidden" /><aside className="fixed inset-y-0 right-0 z-50 w-72 border-l border-teal-800 bg-teal-950 p-5 shadow-2xl lg:hidden"><div className="mb-8 flex items-center justify-between"><StudentBrand /><button onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-1 text-sm text-teal-400">Close</button></div><nav className="grid gap-2" aria-label="Student navigation">{navigation.map(item => { const Icon = item.icon; const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold", active ? "bg-teal-400/10 text-teal-200" : "text-teal-300 hover:bg-teal-900")}><Icon className="size-5" />{item.label}</Link>; })}</nav></aside></> : null}
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">{children}</main>
      <div className="pb-20 lg:pb-0">
        <StudentFooter />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-[var(--background)]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Mobile student navigation">
        <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${navigation.length}, minmax(0, 1fr))` }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors", active ? "text-teal-700" : "text-slate-400")}><Icon className="size-5" />{item.label}</Link>;
          })}
        </div>
      </nav>
    </div>
  );
}
