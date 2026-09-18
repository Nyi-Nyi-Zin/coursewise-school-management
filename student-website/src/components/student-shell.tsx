"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  House,
  Menu,
  UserCircle2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StudentBrand } from "@/components/student-brand";
import { StudentFooter } from "@/components/student-footer";
import { StudentNetworkStatus } from "@/components/student-network-status";
import { cn } from "@/lib/utils";
import { useStudentAuth } from "@/components/student-auth-provider";
import { CourseBatchSelector, useCourseBatchSelection } from "@/components/course-batch-selector";
import { getStudentProfile } from "@/lib/student-repository";
import {
  attendancePageEnabled,
  certificatesPageEnabled,
  notificationsIconEnabled,
} from "../../../shared/portal-display-settings";

const navigation = [
  { href: "/", label: "Home", icon: House },
  { href: "/lessons", label: "Lessons", icon: BookOpen },
  { href: "/quizzes", label: "Quizzes", icon: ClipboardCheck },
  { href: "/assignments", label: "Assignments", icon: FileCheck2 },
  ...(attendancePageEnabled
    ? [{ href: "/attendance", label: "Attendance", icon: CalendarDays }]
    : []),
  ...(certificatesPageEnabled
    ? [{ href: "/certificates", label: "Certificates", icon: Award }]
    : []),
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseActive, loading, user, role } = useStudentAuth();
  const { enrollments, selectedKey, selectEnrollment } = useCourseBatchSelection();
  const profile = useQuery({
    queryKey: ["student", "profile", user?.uid],
    queryFn: () => getStudentProfile(user!.uid),
    enabled: Boolean(user?.uid),
    staleTime: 60_000,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const mustRedirect =
    firebaseActive && !loading && (!user || role === "admin");

  useEffect(() => {
    if (mustRedirect) router.replace("/login");
  }, [mustRedirect, router]);

  if (mustRedirect)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-400">
        Redirecting to secure sign in…
      </div>
    );

  const profileName = profile.data?.name || user?.displayName || "Student";
  const photoUrl = profile.data?.photoUrl;
  const isCertificatesPage = pathname.startsWith("/certificates");
  const mobileNavigation = [
    ...navigation,
    { href: "/profile", label: "Profile", icon: UserCircle2 },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-slate-800">
      <StudentNetworkStatus />
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_12px_rgba(15,23,42,0.025)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-10">
          <Link href="/" aria-label="Teza Tech Lab home">
            <StudentBrand />
          </Link>
          <nav
            className="hidden h-full items-center gap-1 lg:flex xl:gap-3"
            aria-label="Student navigation"
          >
            {navigation.map(item => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-full items-center gap-2 px-3 text-sm font-medium transition-colors xl:px-4",
                    active
                      ? "text-teal-800 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-teal-700"
                      : "text-slate-600 hover:text-slate-950"
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={1.9} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:block">
              <CourseBatchSelector
                enrollments={enrollments}
                value={selectedKey}
                onChange={selectEnrollment}
                className="max-w-48 xl:max-w-64"
              />
            </div>
            {notificationsIconEnabled ? (
              <button
                className="grid size-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
              </button>
            ) : null}
            <Link
              href="/profile"
              aria-current={
                pathname.startsWith("/profile") ? "page" : undefined
              }
              className={cn(
                "hidden items-center gap-2.5 rounded-full bg-slate-50 py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors hover:bg-slate-100 sm:flex",
                pathname.startsWith("/profile") && "bg-slate-100 text-teal-800"
              )}
            >
              <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-100 font-bold text-teal-800 ring-1 ring-slate-200">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  profileName.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="max-w-28 truncate">My profile</span>
              <ChevronDown className="size-4 text-slate-500" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-80 max-w-[88vw] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl lg:hidden">
            <div className="mb-8 flex items-center justify-between">
              <StudentBrand />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600"
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </button>
            </div>
            {enrollments.length ? (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Course &amp; batch
                </p>
                <CourseBatchSelector
                  enrollments={enrollments}
                  value={selectedKey}
                  onChange={selectEnrollment}
                  className="mt-1 w-full"
                />
              </div>
            ) : null}
            <nav className="grid gap-2" aria-label="Student navigation">
              {mobileNavigation.map(item => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold",
                      active
                        ? "bg-teal-50 text-teal-800"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      ) : null}

      <main key={isCertificatesPage ? "certificates-page" : selectedKey || "no-enrollment"} className="mx-auto min-w-0 w-full max-w-[1480px] flex-1 overflow-x-hidden px-4 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8 xl:px-10">
        {children}
      </main>
      <div className="pb-20 lg:pb-0">
        <StudentFooter />
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
        aria-label="Mobile student navigation"
      >
        <div className="mx-auto flex max-w-lg gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mobileNavigation.map(item => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[9px] font-medium transition-colors sm:text-[10px]",
                  active ? "text-teal-700" : "text-slate-600"
                )}
              >
                <Icon className="size-5" />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
