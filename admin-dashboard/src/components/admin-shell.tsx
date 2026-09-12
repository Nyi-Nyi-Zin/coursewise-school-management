"use client";

import { hasFirebaseConfiguration } from "@/lib/firebase";
import { signOutAdministrator } from "@/lib/admin-auth-service";
import { OfflineActionPanel } from "@/components/offline-action-panel";
import { OfflineWorkspace } from "@/components/offline-workspace";
import { QuizQuestionPanel } from "@/components/quiz-question-panel";
import {
  emptyOfflineRecords,
  type ManagementSection,
  type OfflineItem,
} from "@/lib/offline-records";
import {
  Bell,
  Award,
  BookOpen,
  BookMarked,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  CloudCog,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminRecords, optimisticallySaveAdminRecord } from "@/lib/use-admin-records";
import { adminRecordQueryKey } from "@/lib/admin-records-query";
import type { CourseBatchScope } from "@/lib/course-batch-scope";
import { buildCourseBatchDashboardData } from "@/lib/course-batch-dashboard";
import { CourseBatchScopeControls } from "@/components/course-batch-scope-controls";
import { createStudentAccount } from "@/lib/admin-student-account-service";
import { useSingleFlight } from "@/lib/use-single-flight";

import { CourseBatchManager } from "@/components/course-batch-manager";
import { AssignmentManager } from "@/components/assignment-manager";
import { CertificateManager } from "@/components/certificate-manager";

type Section =
  | "overview"
  | "courses"
  | "students"
  | "announcements"
  | "lessons"
  | "assignments"
  | "quizzes"
  | "attendance"
  | "certificates"
  | "settings";
type WorkspaceSection = Exclude<Section, "courses" | "certificates">;
function isRecordSection(section: Section): section is ManagementSection {
  return [
    "students",
    "announcements",
    "lessons",
    "assignments",
    "quizzes",
    "attendance",
  ].includes(section);
}

const navigation: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "courses", label: "Courses & batches", icon: BookMarked },
  { id: "students", label: "Students", icon: Users },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "lessons", label: "Lessons", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: ClipboardCheck },
  { id: "quizzes", label: "Quizzes", icon: ClipboardCheck },
  { id: "certificates", label: "Certificates", icon: Award },
  // Temporarily hidden from the admin navigation; keep the attendance page/code intact.
  // { id: "attendance", label: "Attendance", icon: CalendarDays },
  // Temporarily hidden from the admin navigation; keep the settings page/code intact.
  // { id: "settings", label: "Settings", icon: Settings },
];

const sectionPaths: Record<Section, string> = {
  overview: "/overview",
  courses: "/courses",
  students: "/students",
  announcements: "/announcements",
  lessons: "/lessons",
  assignments: "/assignments",
  quizzes: "/quizzes",
  attendance: "/attendance",
  certificates: "/certificates",
  settings: "/settings",
};

function sectionFromPath(pathname: string): Section {
  const matched = navigation.find(item => sectionPaths[item.id] === pathname);
  return matched?.id ?? "overview";
}

const headings: Record<
  Section,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "Administration",
    title: "A clear view of the term.",
    description:
      "Track your learning space and begin the work that matters most.",
  },
  courses: {
    eyebrow: "Academic structure",
    title: "Courses & Batches",
    description:
      "Organize your programs into courses, group learners into batches, and manage student enrollments.",
  },
  students: {
    eyebrow: "People",
    title: "Students",
    description:
      "Manage student identities, access status, and profile details.",
  },
  announcements: {
    eyebrow: "Student communications",
    title: "Announcements",
    description: "Publish timely updates as banners on the Student Website.",
  },
  lessons: {
    eyebrow: "Learning library",
    title: "Lessons",
    description: "Create and organize the resources students need to learn.",
  },
  assignments: {
    eyebrow: "Course work",
    title: "Assignments",
    description: "Publish briefs, due dates, and submission instructions for each batch.",
  },
  quizzes: {
    eyebrow: "Assessment",
    title: "Quizzes",
    description:
      "Build questions, release assessments, and review student results.",
  },
  attendance: {
    eyebrow: "Student records",
    title: "Attendance",
    description: "Record daily attendance using the required school statuses.",
  },
  certificates: {
    eyebrow: "Student achievement",
    title: "Certificate studio",
    description:
      "Issue completion certificates from one reusable design with student, course, batch, date, and serial details.",
  },
  settings: {
    eyebrow: "Configuration",
    title: "Workspace settings",
    description:
      "Connect Firebase, configure access control, and prepare production deployment.",
  },
};

export function AdminShell() {
  const pathname = usePathname();
  const router = useRouter();
  const section = sectionFromPath(pathname);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [isSigningOut, setSigningOut] = useState(false);
  const runSingleFlight = useSingleFlight();
  const [editingItem, setEditingItem] = useState<OfflineItem | null>(null);
  const [managedQuiz, setManagedQuiz] = useState<OfflineItem | null>(null);
  const [courseBatchScope, setCourseBatchScope] = useState<CourseBatchScope>({
    courseId: "",
    batchId: "",
  });
  const { recordsQuery, saveMutation, deleteMutation } = useAdminRecords();
  const queryClient = useQueryClient();
  const records = recordsQuery.data ?? emptyOfflineRecords;
  const visibleRecords =
    section === "quizzes" || section === "attendance"
      ? buildCourseBatchDashboardData(records, courseBatchScope).visibleRecords
      : records;
  const loadError =
    recordsQuery.error instanceof Error
      ? recordsQuery.error.message
      : "Firebase records could not be loaded.";
  const persistenceError = recordsQuery.isError
    ? `Could not load Firebase records: ${loadError}`
    : null;
  const content = headings[section];
  const navigate = (next: Section | ((current: Section) => Section)) => {
    const target = typeof next === "function" ? next(section) : next;
    router.push(sectionPaths[target]);
  };
  const openCreate = () => {
    if (section === "courses" || section === "assignments") return;
    setEditingItem(null);
    setPanelOpen(true);
  };
  const signOut = async () => {
    await runSingleFlight("admin-sign-out", async () => {
      setSigningOut(true);
      try {
        await signOutAdministrator();
        router.replace("/login");
        router.refresh();
      } finally {
        setSigningOut(false);
      }
    });
  };
  const saveItem = async (draft: Omit<OfflineItem, "id" | "createdAt">) => {
    if (!isRecordSection(section)) return;
    if (section === "students" && !editingItem) {
      try {
        const account = await createStudentAccount({ name: draft.title, email: draft.fields?.email ?? "", photoUrl: draft.fields?.photoUrl, isActive: draft.status === "Active" });
        const item: OfflineItem = {
          id: account.uid,
          title: draft.title,
          description: "",
          status: draft.status,
          createdAt: "Firebase",
          fields: { ...draft.fields, studentId: account.studentId },
        };
        await optimisticallySaveAdminRecord(queryClient, "students", item);
        toast.success(`Student account was created. Assigned Student ID: ${account.studentId}.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message.replace("Firebase: ", "") : "The student account could not be created.");
      } finally {
        setPanelOpen(false);
        setEditingItem(null);
        void queryClient.invalidateQueries({ queryKey: adminRecordQueryKey });
      }
      return;
    }
    const batchScopedDraft =
      (section === "quizzes" || section === "attendance") &&
      courseBatchScope.courseId &&
      courseBatchScope.batchId
        ? { ...draft, fields: { ...draft.fields, ...courseBatchScope } }
        : draft;
    const item = editingItem
      ? { ...editingItem, ...batchScopedDraft }
      : {
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleDateString(),
          ...batchScopedDraft,
        };
    try {
      await saveMutation.mutateAsync({ section, item });
      setPanelOpen(false);
      setEditingItem(null);
    } catch (error) {
      toast.error(formatRecordSaveError(error));
    }
  };
  const deleteItem = async (id: string) => {
    if (!isRecordSection(section)) return;
    try {
      await deleteMutation.mutateAsync({ section, id });
    } catch (error) {
      toast.error(formatRecordSaveError(error) || "The record could not be deleted. Your workspace was restored to its previous state.");
    }
  };
  const toggleStatus = async (item: OfflineItem) => {
    if (!isRecordSection(section)) return;
    const nextStatus = section === "students"
      ? (item.status === "Active" ? "Inactive" : "Active")
      : section === "attendance"
        ? (item.status === "Present" ? "Absent" : "Present")
        : (item.status === "Published" ? "Draft" : "Published");
    try {
      await saveMutation.mutateAsync({ section, item: { ...item, status: nextStatus } });
      toast.success(`Status updated to ${nextStatus}.`);
    } catch (error) {
      toast.error(formatRecordSaveError(error) || "The status could not be updated.");
    }
  };
  return (
    <div className="min-h-screen bg-[#f8f8f6] text-stone-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#143d36] px-3 py-5 text-white transition-transform lg:translate-x-0 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-3">
          <Brand />
          <button
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-2 text-emerald-100/70 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-10 min-h-0 flex-1 overflow-y-auto pb-4 sidebar-scroll">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-100/45">
            Management
          </p>
          <nav className="mt-2 space-y-1">
            {navigation.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.id);
                  setMenuOpen(false);
                }}
                className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm transition ${section === item.id ? "bg-[#d4f59b] font-bold text-emerald-950" : "text-emerald-50 hover:bg-white/10"}`}
              >
                <item.icon size={17} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#d4f59b] text-xs font-bold text-emerald-950">
              AD
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Administrator</p>
              <p className="truncate text-xs text-emerald-100/55">
                Admin
              </p>
            </div>
          </div>
          <button
            disabled={isSigningOut}
            onClick={() => void signOut()}
            className="mt-3 flex items-center gap-2 text-xs text-emerald-100/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={14} />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>
      {isMenuOpen && (
        <button
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-emerald-950/40 lg:hidden"
        />
      )}
      <main className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-20 flex h-[74px] items-center border-b border-stone-200/80 bg-[#f8f8f6]/90 px-5 backdrop-blur-xl lg:px-9">
          <button
            onClick={() => setMenuOpen(true)}
            className="mr-3 rounded-xl border border-stone-200 bg-white p-2 text-stone-600 lg:hidden"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Teza Tech Lab management
            </p>
            <h1 className="font-display text-lg font-semibold">
              {navigation.find(item => item.id === section)?.label}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ConnectionStatus />
          </div>
        </header>
        <div className="p-5 lg:p-9">
          <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-800/55">
                {content.eyebrow}
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                {content.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
                {content.description}
              </p>
              {persistenceError && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {persistenceError}
                </p>
              )}
            </div>
          </section>
          {section === "certificates" ? (
            <CertificateManager />
          ) : section === "courses" ? (
            <CourseBatchManager />
          ) : section === "assignments" ? (
            <AssignmentManager />
          ) : (
            <>
              <OfflineWorkspace
                section={section as WorkspaceSection}
                records={visibleRecords}
                scopeControls={(section === "quizzes" || section === "attendance") ? <CourseBatchScopeControls value={courseBatchScope} onChange={setCourseBatchScope} /> : null}
                onAction={openCreate}
                onNavigate={next =>
                  navigate(current =>
                    typeof next === "function"
                      ? next(current as WorkspaceSection)
                      : next
                  )
                }
                onEdit={item => {
                  setEditingItem(item);
                  setPanelOpen(true);
                }}
                onDelete={deleteItem}
                onToggleStatus={toggleStatus}
                onManageQuiz={setManagedQuiz}
              />
            </>
          )}
        </div>
      </main>
      {isPanelOpen && section !== "courses" && section !== "assignments" && section !== "certificates" && (
        <OfflineActionPanel
          section={section as WorkspaceSection}
          initial={editingItem}
          onClose={() => {
            setPanelOpen(false);
            setEditingItem(null);
          }}
          onSave={saveItem}
        />
      )}
      {managedQuiz && (
        <QuizQuestionPanel
          quizId={managedQuiz.id}
          quizTitle={managedQuiz.title}
          onClose={() => setManagedQuiz(null)}
        />
      )}
    </div>
  );
}

function formatRecordSaveError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  if (code === "permission-denied") {
    return "Firebase denied this save. Sign in with an administrator account, confirm users/{your-user-id} has role: admin, and deploy the current Firestore rules.";
  }
  if (code === "unauthenticated") {
    return "Your Firebase session has expired. Sign in again, then save the assignment.";
  }
  if (code === "unavailable") {
    return "Firebase is temporarily unavailable. Check your connection and try saving again.";
  }
  const message = error instanceof Error ? error.message.replace(/^Firebase:\s*/, "") : "";
  return message ? `The record could not be saved: ${message}` : "The record could not be saved. Your workspace was restored to its previous state.";
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-slate-950 ring-1 ring-[#d4f59b]/30">
        <Image
          src="/teza-tech-lab-logo.svg"
          alt=""
          width={40}
          height={40}
          className="size-full object-cover"
        />
      </span>
      <span>
        <span className="font-display block text-lg font-semibold">
          Teza Tech Lab
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-[.17em] text-emerald-100/50">
          Admin studio
        </span>
      </span>
    </div>
  );
}

function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    // navigator.onLine alone is unreliable: it reports "online" whenever a
    // network adapter exists, even without working internet access. Probe an
    // always-available endpoint to verify real reachability.
    const probe = async () => {
      if (!navigator.onLine) {
        if (!cancelled) setOnline(false);
        return;
      }
      controller?.abort();
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 6000);
      try {
        await fetch("https://www.gstatic.com/generate_204", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        clearTimeout(timeout);
      }
    };
    Promise.resolve().then(probe);
    const interval = setInterval(probe, 15000);
    window.addEventListener("online", probe);
    window.addEventListener("offline", probe);
    window.addEventListener("focus", probe);
    return () => {
      cancelled = true;
      clearInterval(interval);
      controller?.abort();
      window.removeEventListener("online", probe);
      window.removeEventListener("offline", probe);
      window.removeEventListener("focus", probe);
    };
  }, []);
  return (
    <span
      className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset sm:inline-flex ${
        online
          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-red-200"
      }`}
      title={online ? "Connected to the internet" : "No internet connection"}
    >
      <span className="relative flex size-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${online ? "animate-ping bg-emerald-500" : "bg-red-500"}`}
        />
        <span
          className={`relative inline-flex size-2 rounded-full ${online ? "bg-emerald-500" : "bg-red-500"}`}
        />
      </span>
      {online ? "Online" : "Offline"}
    </span>
  );
}

// Legacy presentation components are retained as design references while the
// interactive offline workspace above is the active administration surface.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Content({
  section,
  onAction,
  onNavigate,
}: {
  section: Section;
  onAction: () => void;
  onNavigate: (section: Section) => void;
}) {
  if (section === "overview") return <Overview onNavigate={onNavigate} />;
  if (section === "settings") return <SettingsCard />;
  const empty = {
    students: [
      Users,
      "No student profiles yet",
      "Create student profiles after each student has signed in with Firebase Authentication.",
    ],
    announcements: [
      Bell,
      "No announcements yet",
      "Create a banner update and publish it when students should see it.",
    ],
    lessons: [
      BookOpen,
      "Your lesson library is waiting",
      "Create a lesson with video, Telegram, PDF, and thumbnail resources.",
    ],
    quizzes: [
      ClipboardCheck,
      "No quizzes yet",
      "Create an assessment, add multiple-choice questions, and then publish it.",
    ],
    attendance: [
      CalendarDays,
      "No attendance records yet",
      "Select a student, choose a date, and set Present, Absent, Late, or Excused.",
    ],
  } as const;
  const [Icon, title, description] = empty[section as keyof typeof empty];
  return (
    <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-stone-300 bg-white/70 p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Icon size={20} />
        </span>
        <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
          {description}
        </p>
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
        >
          <Plus size={15} />
          {primaryAction(section)}
        </button>
      </div>
    </div>
  );
}

function Overview({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const cards = [
    {
      label: "Active students",
      detail: "No enrolled students",
      icon: Users,
      section: "students" as const,
      tone: "bg-emerald-50 text-emerald-800",
    },
    {
      label: "Published lessons",
      detail: "Learning library",
      icon: BookOpen,
      section: "lessons" as const,
      tone: "bg-blue-50 text-blue-800",
    },
    {
      label: "Live quizzes",
      detail: "Student assessments",
      icon: ClipboardCheck,
      section: "quizzes" as const,
      tone: "bg-amber-50 text-amber-800",
    },
    {
      label: "Announcements",
      detail: "Visible to students",
      icon: Bell,
      section: "announcements" as const,
      tone: "bg-violet-50 text-violet-800",
    },
  ];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <button
            key={card.label}
            onClick={() => onNavigate(card.section)}
            className="group rounded-3xl border border-stone-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span
                className={`grid size-10 place-items-center rounded-2xl ${card.tone}`}
              >
                <card.icon size={18} />
              </span>
              <ChevronRight
                size={16}
                className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
              />
            </div>
            <p className="mt-7 font-display text-3xl font-semibold">0</p>
            <p className="mt-1 text-sm font-bold text-stone-700">
              {card.label}
            </p>
            <p className="mt-1 text-xs text-stone-400">{card.detail}</p>
          </button>
        ))}
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
            Start here
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            Build a useful learning space
          </h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StartCard
              index="01"
              title="Connect Firebase"
              body="Add project credentials and set Firestore rules."
              section="settings"
              onNavigate={onNavigate}
            />
            <StartCard
              index="02"
              title="Invite students"
              body="Create student profiles tied to authenticated users."
              section="students"
              onNavigate={onNavigate}
            />
            <StartCard
              index="03"
              title="Share a lesson"
              body="Publish learning resources at the right moment."
              section="lessons"
              onNavigate={onNavigate}
            />
          </div>
        </div>
        <div className="rounded-3xl bg-[#143d36] p-6 text-white">
          <CloudCog className="text-[#d4f59b]" size={22} />
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[.18em] text-[#d4f59b]/75">
            Firebase-ready
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            One controlled source of truth for your school.
          </h3>
          <p className="mt-3 text-sm leading-6 text-emerald-100/70">
            The Next.js admin dashboard is structured around Firebase
            Authentication, Firestore, and role-based security rules.
          </p>
        </div>
      </div>
    </>
  );
}

function StartCard({
  index,
  title,
  body,
  section,
  onNavigate,
}: {
  index: string;
  title: string;
  body: string;
  section: Section;
  onNavigate: (section: Section) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(section)}
      className="rounded-2xl bg-[#f8f8f6] p-4 text-left transition hover:bg-emerald-50"
    >
      <span className="text-[10px] font-bold tracking-[.16em] text-emerald-700">
        {index}
      </span>
      <p className="mt-4 text-sm font-bold text-stone-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{body}</p>
    </button>
  );
}

function SettingsCard() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Backend connection
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              Firebase configuration
            </h3>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${hasFirebaseConfiguration ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
          >
            {hasFirebaseConfiguration ? "Connected" : "Awaiting variables"}
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-500">
          Add the public Firebase web configuration to{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">
            .env.local
          </code>
          . The application will then initialize Firebase Authentication and
          Cloud Firestore from the typed client boundary.
        </p>
        <div className="mt-6 rounded-2xl bg-stone-50 p-4 font-mono text-xs leading-6 text-stone-600">
          NEXT_PUBLIC_FIREBASE_API_KEY=...
          <br />
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
          <br />
          NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
          <br />
          NEXT_PUBLIC_FIREBASE_APP_ID=...
        </div>
      </section>
      <section className="rounded-3xl bg-[#143d36] p-6 text-white">
        <ShieldCheck className="text-[#d4f59b]" size={22} />
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[.18em] text-[#d4f59b]/75">
          Access control
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold">
          Only administrators can manage school data.
        </h3>
        <p className="mt-3 text-sm leading-6 text-emerald-100/70">
          Enforce administrator access with a Firestore user profile role and
          Firebase security rules. Keep Firebase Admin credentials server-side
          only.
        </p>
      </section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ActionPanel({
  section,
  onClose,
}: {
  section: Section;
  onClose: () => void;
}) {
  const title = primaryAction(section);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-emerald-950/30 p-0 sm:p-4">
      <section className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-stone-100 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Admin action
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 p-6">
          <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <Sparkles className="mb-2 text-amber-700" size={17} />
            This Next.js panel is ready for Firebase. Add the Firebase
            environment variables and connect this form to its Firestore
            collection before creating production records.
          </div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-stone-700">
              Title or name
              <input
                className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
                placeholder="Enter details"
              />
            </label>
            <label className="block text-sm font-bold text-stone-700">
              Description
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-emerald-600"
                placeholder="Add optional context"
              />
            </label>
          </div>
        </div>
        <div className="border-t border-stone-100 p-6">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Save after Firebase setup
          </button>
        </div>
      </section>
    </div>
  );
}

function primaryAction(section: Section) {
  return (
    {
      overview: "Create record",
      courses: "New course",
      students: "Add student",
      announcements: "New announcement",
      lessons: "New lesson",
      quizzes: "New quiz",
      attendance: "Record attendance",
      certificates: "Issue certificate",
      settings: "Configure Firebase",
    } as Record<Section, string>
  )[section];
}
