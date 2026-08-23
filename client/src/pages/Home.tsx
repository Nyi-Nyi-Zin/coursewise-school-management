import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, {
  type DashboardNavItem,
} from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type StudentRecord = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  studentId: string | null;
  profilePhotoUrl: string | null;
  isActive: boolean;
};

type ManageForm = {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  isPublished: boolean;
  sortOrder: number;
};

const adminMenu: DashboardNavItem[] = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Users, label: "Students", path: "/admin/students" },
  { icon: Bell, label: "Announcements", path: "/admin/announcements" },
  { icon: BookOpen, label: "Lessons", path: "/admin/lessons" },
  { icon: ClipboardCheck, label: "Quizzes", path: "/admin/quizzes" },
  { icon: CalendarDays, label: "Attendance", path: "/admin/attendance" },
];

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toDateTimeLocal(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function initials(name?: string | null) {
  return (name ?? "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(item => item[0])
    .join("")
    .toUpperCase();
}

function PageHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-800/55">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900">
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">{body}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-3xl border border-dashed border-stone-300 bg-white/60 p-8 text-center">
      <div>
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Sparkles size={19} />
        </div>
        <h3 className="font-display text-lg font-semibold text-stone-900">
          {title}
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-stone-500">
          {body}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

function StatusPill({
  active,
  published,
}: {
  active?: boolean;
  published?: boolean;
}) {
  const value = active ?? published ?? false;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        value ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          value ? "bg-emerald-500" : "bg-stone-400"
        )}
      />
      {value
        ? active !== undefined
          ? "Active"
          : "Published"
        : active !== undefined
          ? "Inactive"
          : "Draft"}
    </span>
  );
}

function MediaUpload({
  folder,
  accept,
  value,
  onChange,
  label,
}: {
  folder: "profiles" | "announcements" | "lessons" | "pdfs";
  accept: string;
  value?: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const upload = trpc.school.upload.useMutation({
    onSuccess: data => {
      onChange(data.url);
      toast.success("File uploaded to secure storage.");
    },
    onError: error => toast.error(error.message),
  });
  const handleFile = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      upload.mutate({
        folder,
        fileName: file.name,
        contentType:
          file.type || (folder === "pdfs" ? "application/pdf" : "image/jpeg"),
        base64: result.split(",")[1] ?? "",
      });
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-3">
      <div className="flex flex-wrap items-center gap-3">
        {value && folder !== "pdfs" ? (
          <img
            src={value}
            alt="Uploaded preview"
            className="size-12 rounded-xl object-cover"
          />
        ) : (
          <span className="grid size-12 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
            <Upload size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-700">{label}</p>
          <p className="mt-0.5 truncate text-xs text-stone-400">
            {value
              ? folder === "pdfs"
                ? "PDF attached"
                : "File attached"
              : "Upload to S3 storage"}
          </p>
        </div>
        <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50">
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={event => handleFile(event.target.files?.[0])}
          />
          <Upload size={14} />
          {upload.isPending ? "Uploading" : "Choose file"}
        </label>
      </div>
    </div>
  );
}

function RoleGate({
  role,
  children,
}: {
  role: "admin" | "student";
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f8f6]">
        <Loader2 className="animate-spin text-emerald-800" />
      </div>
    );
  if (!user)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f8f6] p-5">
        <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-9 text-center shadow-[0_24px_80px_rgba(41,37,36,.10)]">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-900 text-[#d4f59b]">
            <ShieldCheck size={26} />
          </div>
          <h1 className="mt-6 font-display text-2xl font-semibold text-stone-900">
            Your secure learning space
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            Sign in with Manus OAuth to continue to the school workspace.
          </p>
          <Button
            onClick={() => startLogin()}
            className="mt-7 w-full rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            Sign in with Manus
          </Button>
        </div>
      </div>
    );
  if (user.role !== role)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f8f6] p-5">
        <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-9 text-center shadow-[0_24px_80px_rgba(41,37,36,.10)]">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <ShieldCheck size={26} />
          </div>
          <h1 className="mt-6 font-display text-2xl font-semibold text-stone-900">
            This space is not assigned to you
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            Your Manus account has a {user.role} role. Use the workspace
            assigned to your account instead.
          </p>
          <Button
            onClick={() =>
              setLocation(user.role === "admin" ? "/admin" : "/student")
            }
            className="mt-7 rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            Open my workspace
          </Button>
        </div>
      </div>
    );
  return <>{children}</>;
}

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f6f1] text-stone-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_18%_20%,rgba(212,245,155,.8),transparent_29%),radial-gradient(circle_at_80%_15%,rgba(173,225,202,.55),transparent_25%)]" />
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-8">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-3"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-900 text-[#d4f59b] shadow-lg shadow-emerald-950/15">
            <BookOpenCheck size={20} />
          </span>
          <span>
            <span className="font-display block text-base font-semibold tracking-tight">
              Coursewise
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.2em] text-stone-400">
              Learning management
            </span>
          </span>
        </button>
        {!loading && user ? (
          <Button
            onClick={() =>
              setLocation(user.role === "admin" ? "/admin" : "/student")
            }
            className="rounded-xl bg-emerald-900 px-5 hover:bg-emerald-800"
          >
            Open workspace <ArrowRight size={16} />
          </Button>
        ) : (
          <Button
            onClick={() => startLogin()}
            variant="outline"
            className="rounded-xl border-stone-200 bg-white/75 px-5"
          >
            Sign in
          </Button>
        )}
      </nav>
      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.06fr_.94fr] lg:px-8 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            One shared space for learning
          </span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[.98] tracking-[-.055em] text-emerald-950 sm:text-6xl">
            A calmer way to run your{" "}
            <em className="font-normal text-emerald-700">learning day.</em>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-stone-600">
            Coursewise brings student progress, learning materials, assessment,
            and attendance into one intentional space—designed for focused
            teaching and confident learning.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button
              onClick={() => startLogin()}
              className="h-12 rounded-xl bg-emerald-900 px-5 text-sm hover:bg-emerald-800"
            >
              Continue with Manus <ArrowRight size={16} />
            </Button>
            <button
              onClick={() => setLocation("/student")}
              className="h-12 rounded-xl border border-stone-200 bg-white/80 px-5 text-sm font-semibold text-stone-700 transition hover:bg-white"
            >
              Student portal
            </button>
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
            <MetricMini value="01" label="Focused workspace" />
            <MetricMini value="04" label="Student sections" />
            <MetricMini value="∞" label="Learning momentum" />
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[3rem] bg-emerald-900/5 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_32px_100px_rgba(48,76,60,.16)] backdrop-blur">
            <div className="rounded-[1.45rem] bg-[#143d36] p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-100/65">
                  Good morning, learner
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#d4f59b]">
                  Student view
                </span>
              </div>
              <h2 className="mt-9 font-display text-3xl font-semibold tracking-tight">
                Ready for your next chapter?
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                Keep every learning moment close at hand.
              </p>
              <div className="mt-7 rounded-2xl bg-[#d4f59b] p-4 text-emerald-950">
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-800">
                  This week
                </p>
                <p className="mt-1 font-display text-xl font-semibold">
                  Progress in motion
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-950/10">
                  <div className="h-full w-[72%] rounded-full bg-emerald-900" />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <PreviewTile
                icon={BookOpen}
                title="Lessons"
                meta="Resource library"
              />
              <PreviewTile
                icon={ClipboardCheck}
                title="Quizzes"
                meta="Check understanding"
              />
              <PreviewTile
                icon={CalendarDays}
                title="Attendance"
                meta="Track the term"
              />
              <PreviewTile icon={Bell} title="Updates" meta="Stay in sync" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricMini({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-l border-stone-300/80 pl-3">
      <p className="font-display text-xl font-semibold text-emerald-950">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.12em] text-stone-400">
        {label}
      </p>
    </div>
  );
}
function PreviewTile({
  icon: Icon,
  title,
  meta,
}: {
  icon: typeof BookOpen;
  title: string;
  meta: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4">
      <Icon size={17} className="text-emerald-700" />
      <p className="mt-6 text-sm font-semibold text-stone-900">{title}</p>
      <p className="mt-1 text-[11px] text-stone-400">{meta}</p>
    </div>
  );
}

export function AdminPortal() {
  return (
    <RoleGate role="admin">
      <AdminWorkspace />
    </RoleGate>
  );
}

function AdminWorkspace() {
  const [location] = useLocation();
  let page: React.ReactNode = <AdminOverview />;
  if (location === "/admin/students") page = <StudentsAdmin />;
  if (location === "/admin/announcements") page = <AnnouncementsAdmin />;
  if (location === "/admin/lessons") page = <LessonsAdmin />;
  if (location === "/admin/quizzes") page = <QuizzesAdmin />;
  if (location === "/admin/attendance") page = <AttendanceAdmin />;
  return (
    <DashboardLayout title="Coursewise Admin" menuItems={adminMenu}>
      {page}
    </DashboardLayout>
  );
}

function AdminOverview() {
  const { data, isLoading } = trpc.school.admin.dashboard.useQuery();
  const [, setLocation] = useLocation();
  const stats = [
    {
      label: "Active students",
      value: data?.activeStudentCount ?? 0,
      note: `${data?.studentCount ?? 0} enrolled`,
      icon: Users,
      path: "/admin/students",
      tone: "bg-[#e6f7ef] text-emerald-800",
    },
    {
      label: "Published lessons",
      value: data?.publishedLessons ?? 0,
      note: "Learning library",
      icon: BookOpen,
      path: "/admin/lessons",
      tone: "bg-[#eaf1ff] text-blue-800",
    },
    {
      label: "Live quizzes",
      value: data?.publishedQuizzes ?? 0,
      note: `${data?.attemptCount ?? 0} attempts total`,
      icon: ClipboardCheck,
      path: "/admin/quizzes",
      tone: "bg-[#fff3df] text-amber-800",
    },
    {
      label: "Announcements",
      value: data?.publishedAnnouncements ?? 0,
      note: "Visible to students",
      icon: Bell,
      path: "/admin/announcements",
      tone: "bg-[#f3edff] text-violet-800",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="A clear view of the term."
        body="Monitor your learning space and move directly into the work that matters."
        action={
          <Button
            onClick={() => setLocation("/admin/students")}
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            <Plus size={16} />
            Add student
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(stat => (
          <button
            key={stat.label}
            onClick={() => setLocation(stat.path)}
            className="group rounded-3xl border border-stone-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-2xl",
                  stat.tone
                )}
              >
                <stat.icon size={18} />
              </span>
              <ArrowRight
                size={16}
                className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
              />
            </div>
            <p className="mt-7 font-display text-3xl font-semibold tracking-tight text-stone-900">
              {isLoading ? "—" : stat.value}
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-700">
              {stat.label}
            </p>
            <p className="mt-1 text-xs text-stone-400">{stat.note}</p>
          </button>
        ))}
      </div>
      <section className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
                Start here
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold text-stone-900">
                Build a useful learning space
              </h3>
            </div>
            <Sparkles className="text-[#92bc52]" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <ActionCard
              index="01"
              title="Invite students"
              body="Create student profiles tied to Manus identity."
              onClick={() => setLocation("/admin/students")}
            />
            <ActionCard
              index="02"
              title="Share a lesson"
              body="Publish resources and helpful links."
              onClick={() => setLocation("/admin/lessons")}
            />
            <ActionCard
              index="03"
              title="Check progress"
              body="Create a quiz and review results."
              onClick={() => setLocation("/admin/quizzes")}
            />
          </div>
        </div>
        <div className="rounded-3xl bg-[#143d36] p-6 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#d4f59b]/75">
            A considered system
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Every student view begins with what is published.
          </h3>
          <p className="mt-3 text-sm leading-6 text-emerald-100/70">
            Draft freely in the admin studio. Students only see the
            announcements, lessons, and quizzes that you choose to release.
          </p>
          <button
            onClick={() => setLocation("/admin/announcements")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#d4f59b]"
          >
            Manage announcements <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </>
  );
}
function ActionCard({
  index,
  title,
  body,
  onClick,
}: {
  index: string;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-[#f8f8f6] p-4 text-left transition hover:bg-emerald-50"
    >
      <span className="text-[10px] font-bold tracking-[.16em] text-emerald-700">
        {index}
      </span>
      <p className="mt-4 text-sm font-semibold text-stone-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{body}</p>
    </button>
  );
}

function StudentsAdmin() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const input = useMemo(() => ({ search }), [search]);
  const { data: students, isLoading } =
    trpc.school.admin.students.list.useQuery(input);
  const utils = trpc.useUtils();
  const refresh = () => {
    utils.school.admin.students.list.invalidate();
    utils.school.admin.dashboard.invalidate();
  };
  const create = trpc.school.admin.students.create.useMutation({
    onSuccess: () => {
      toast.success("Student profile created.");
      refresh();
      setShowForm(false);
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.school.admin.students.update.useMutation({
    onSuccess: () => {
      toast.success("Student profile updated.");
      refresh();
      setEditing(null);
      setShowForm(false);
    },
    onError: error => toast.error(error.message),
  });
  return (
    <>
      <PageHeading
        eyebrow="People"
        title="Students"
        body="Create and maintain student profiles connected to their Manus OAuth identity."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            <Plus size={16} />
            New student
          </Button>
        }
      />
      {showForm && (
        <StudentForm
          initial={editing}
          pending={create.isPending || update.isPending}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={values =>
            editing
              ? update.mutate({
                  id: editing.id,
                  name: values.name,
                  email: values.email,
                  studentId: values.studentId,
                  profilePhotoUrl: values.profilePhotoUrl || null,
                  isActive: values.isActive,
                })
              : create.mutate({
                  openId: values.openId,
                  name: values.name,
                  email: values.email,
                  studentId: values.studentId,
                  profilePhotoUrl: values.profilePhotoUrl || null,
                  isActive: values.isActive,
                })
          }
        />
      )}
      <div className="mt-6 rounded-3xl border border-stone-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search name, email, or ID"
              className="h-10 rounded-xl border-stone-200 bg-stone-50 pl-9 text-sm"
            />
          </div>
          <p className="text-xs text-stone-400">
            {students?.length ?? 0} student profiles
          </p>
        </div>
        {isLoading ? (
          <div className="grid min-h-56 place-items-center">
            <Loader2 className="animate-spin text-emerald-700" />
          </div>
        ) : students?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[.16em] text-stone-400">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-4 py-4">Student ID</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Joined</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr
                    key={student.id}
                    className="border-t border-stone-100 text-sm"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {student.profilePhotoUrl ? (
                          <img
                            src={student.profilePhotoUrl}
                            alt=""
                            className="size-9 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800">
                            {initials(student.name)}
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-stone-800">
                            {student.name}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-stone-500">
                      {student.studentId ?? "Not assigned"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill active={student.isActive} />
                    </td>
                    <td className="px-4 py-4 text-xs text-stone-400">
                      {formatDate(
                        (student as unknown as { createdAt: Date }).createdAt
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        onClick={() => {
                          setEditing(student);
                          setShowForm(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-emerald-800"
                      >
                        <Pencil size={14} />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No student profiles yet"
            body="Create a profile for a student who has a Manus OAuth identity, then assign their student ID and access status."
            action={
              <Button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
              >
                Create student
              </Button>
            }
          />
        )}
      </div>
    </>
  );
}

function StudentForm({
  initial,
  pending,
  onCancel,
  onSave,
}: {
  initial: StudentRecord | null;
  pending: boolean;
  onCancel: () => void;
  onSave: (values: {
    openId: string;
    name: string;
    email: string;
    studentId: string;
    profilePhotoUrl: string;
    isActive: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    openId: initial?.openId ?? "",
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    studentId: initial?.studentId ?? "",
    profilePhotoUrl: initial?.profilePhotoUrl ?? "",
    isActive: initial?.isActive ?? true,
  });
  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => setForm(current => ({ ...current, [key]: value }));
  return (
    <section className="mb-6 rounded-3xl border border-emerald-900/10 bg-emerald-50/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            {initial ? "Profile update" : "New profile"}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-stone-900">
            {initial ? "Edit student" : "Create student"}
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Full name">
          <Input
            value={form.name}
            onChange={event => update("name", event.target.value)}
            placeholder="Student name"
          />
        </Field>
        <Field label="Student ID">
          <Input
            value={form.studentId}
            onChange={event => update("studentId", event.target.value)}
            placeholder="e.g. STU-014"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={event => update("email", event.target.value)}
            placeholder="student@example.com"
          />
        </Field>
        <Field
          label="Manus user ID"
          hint={
            initial
              ? "OAuth identity cannot be changed here."
              : "The student must have authenticated with Manus first."
          }
        >
          <Input
            disabled={Boolean(initial)}
            value={form.openId}
            onChange={event => update("openId", event.target.value)}
            placeholder="Manus Open ID"
          />
        </Field>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
        <MediaUpload
          folder="profiles"
          accept="image/*"
          value={form.profilePhotoUrl}
          onChange={url => update("profilePhotoUrl", url)}
          label="Profile photo"
        />
        <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700">
          <Switch
            checked={form.isActive}
            onCheckedChange={value => update("isActive", value)}
          />
          Account active
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} variant="ghost" className="rounded-xl">
          Cancel
        </Button>
        <Button
          disabled={
            pending ||
            !form.name ||
            !form.email ||
            !form.studentId ||
            (!initial && !form.openId)
          }
          onClick={() => onSave(form)}
          className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}
          {initial ? "Save changes" : "Create profile"}
        </Button>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-stone-600">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] leading-4 text-stone-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function AnnouncementsAdmin() {
  const { data: items, isLoading } =
    trpc.school.admin.announcements.list.useQuery();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<({ id: number } & ManageForm) | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const refresh = () => {
    utils.school.admin.announcements.list.invalidate();
    utils.school.admin.dashboard.invalidate();
  };
  const create = trpc.school.admin.announcements.create.useMutation({
    onSuccess: () => {
      toast.success("Announcement saved.");
      setShowForm(false);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.school.admin.announcements.update.useMutation({
    onSuccess: () => {
      toast.success("Announcement updated.");
      setShowForm(false);
      setEditing(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.school.admin.announcements.remove.useMutation({
    onSuccess: () => {
      toast.success("Announcement removed.");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  return (
    <>
      <PageHeading
        eyebrow="Student communications"
        title="Announcements"
        body="Publish timely updates as polished banners on the student home screen."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            <Plus size={16} />
            New announcement
          </Button>
        }
      />
      {showForm && (
        <AnnouncementForm
          initial={editing}
          pending={create.isPending || update.isPending}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={values =>
            editing
              ? update.mutate({
                  id: editing.id,
                  title: values.title,
                  description: values.description || null,
                  bannerUrl: values.imageUrl || null,
                  linkUrl: values.linkUrl || null,
                  isPublished: values.isPublished,
                  sortOrder: values.sortOrder,
                })
              : create.mutate({
                  title: values.title,
                  description: values.description || null,
                  bannerUrl: values.imageUrl || null,
                  linkUrl: values.linkUrl || null,
                  isPublished: values.isPublished,
                  sortOrder: values.sortOrder,
                })
          }
        />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          <div className="col-span-full grid min-h-64 place-items-center">
            <Loader2 className="animate-spin text-emerald-700" />
          </div>
        ) : items?.length ? (
          items.map(item => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm"
            >
              <div className="h-32 bg-[linear-gradient(120deg,#1d4c43,#467d65)]">
                {item.bannerUrl && (
                  <img
                    src={item.bannerUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <StatusPill published={item.isPublished} />
                    <h3 className="mt-3 font-display text-xl font-semibold text-stone-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-500">
                      {item.description || "No description provided."}
                    </p>
                  </div>
                  <div className="flex">
                    <Button
                      onClick={() => {
                        setEditing({
                          id: item.id,
                          title: item.title,
                          description: item.description ?? "",
                          imageUrl: item.bannerUrl ?? "",
                          linkUrl: item.linkUrl ?? "",
                          isPublished: item.isPublished,
                          sortOrder: item.sortOrder,
                        });
                        setShowForm(true);
                      }}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm("Remove this announcement?"))
                          remove.mutate({ id: item.id });
                      }}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-stone-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-xs text-stone-400">
                  <span>Banner order {item.sortOrder}</span>
                  {item.linkUrl && (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-700"
                    >
                      Open link <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="lg:col-span-2">
            <EmptyState
              title="Share your first update"
              body="Create an announcement to greet students on the home screen."
              action={
                <Button
                  onClick={() => setShowForm(true)}
                  className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
                >
                  New announcement
                </Button>
              }
            />
          </div>
        )}
      </div>
    </>
  );
}

function AnnouncementForm({
  initial,
  pending,
  onCancel,
  onSave,
}: {
  initial: ({ id: number } & ManageForm) | null;
  pending: boolean;
  onCancel: () => void;
  onSave: (value: ManageForm) => void;
}) {
  const [form, setForm] = useState<ManageForm>(
    initial ?? {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      isPublished: false,
      sortOrder: 0,
    }
  );
  const update = <K extends keyof ManageForm>(key: K, value: ManageForm[K]) =>
    setForm(current => ({ ...current, [key]: value }));
  return (
    <section className="mb-6 rounded-3xl border border-emerald-900/10 bg-emerald-50/50 p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            Announcement studio
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            {initial ? "Edit announcement" : "Create announcement"}
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Announcement title">
          <Input
            value={form.title}
            onChange={event => update("title", event.target.value)}
            placeholder="What should students know?"
          />
        </Field>
        <Field label="Banner order">
          <Input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={event => update("sortOrder", Number(event.target.value))}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={event => update("description", event.target.value)}
              placeholder="Add helpful context for students."
              className="min-h-20"
            />
          </Field>
        </div>
        <Field label="Optional destination URL">
          <Input
            value={form.linkUrl}
            onChange={event => update("linkUrl", event.target.value)}
            placeholder="https://..."
          />
        </Field>
        <label className="flex items-center gap-3 self-end rounded-xl bg-white px-4 py-3 text-sm font-semibold text-stone-700">
          <Switch
            checked={form.isPublished}
            onCheckedChange={value => update("isPublished", value)}
          />
          Publish for students
        </label>
      </div>
      <div className="mt-4">
        <MediaUpload
          folder="announcements"
          accept="image/*"
          value={form.imageUrl}
          onChange={url => update("imageUrl", url)}
          label="Announcement banner"
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} variant="ghost" className="rounded-xl">
          Cancel
        </Button>
        <Button
          disabled={pending || !form.title}
          onClick={() => onSave(form)}
          className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}Save
          announcement
        </Button>
      </div>
    </section>
  );
}

function LessonsAdmin() {
  const { data: items, isLoading } = trpc.school.admin.lessons.list.useQuery();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<
    (LessonFormValue & { id: number }) | null
  >(null);
  const [showForm, setShowForm] = useState(false);
  const refresh = () => {
    utils.school.admin.lessons.list.invalidate();
    utils.school.admin.dashboard.invalidate();
  };
  const create = trpc.school.admin.lessons.create.useMutation({
    onSuccess: () => {
      toast.success("Lesson saved.");
      setShowForm(false);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.school.admin.lessons.update.useMutation({
    onSuccess: () => {
      toast.success("Lesson updated.");
      setShowForm(false);
      setEditing(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.school.admin.lessons.remove.useMutation({
    onSuccess: () => {
      toast.success("Lesson removed.");
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  return (
    <>
      <PageHeading
        eyebrow="Learning library"
        title="Lessons"
        body="Curate rich lesson resources, then publish them when they are ready for students."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            <Plus size={16} />
            New lesson
          </Button>
        }
      />
      {showForm && (
        <LessonForm
          initial={editing}
          pending={create.isPending || update.isPending}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={values =>
            editing
              ? update.mutate({
                  id: editing.id,
                  ...values,
                  description: values.description || null,
                  thumbnailUrl: values.thumbnailUrl || null,
                  telegramUrl: values.telegramUrl || null,
                  videoUrl: values.videoUrl || null,
                  pdfUrl: values.pdfUrl || null,
                })
              : create.mutate({
                  ...values,
                  description: values.description || null,
                  thumbnailUrl: values.thumbnailUrl || null,
                  telegramUrl: values.telegramUrl || null,
                  videoUrl: values.videoUrl || null,
                  pdfUrl: values.pdfUrl || null,
                })
          }
        />
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full grid min-h-64 place-items-center">
            <Loader2 className="animate-spin text-emerald-700" />
          </div>
        ) : items?.length ? (
          items.map(item => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm"
            >
              <div className="relative h-36 bg-[#e7efe9]">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-emerald-700">
                    <BookOpen size={28} />
                  </div>
                )}
                <span className="absolute left-4 top-4">
                  <StatusPill published={item.isPublished} />
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-700">
                      Lesson {String(item.sortOrder).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-stone-900">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex">
                    <Button
                      onClick={() => {
                        setEditing({
                          id: item.id,
                          title: item.title,
                          description: item.description ?? "",
                          thumbnailUrl: item.thumbnailUrl ?? "",
                          telegramUrl: item.telegramUrl ?? "",
                          videoUrl: item.videoUrl ?? "",
                          pdfUrl: item.pdfUrl ?? "",
                          isPublished: item.isPublished,
                          sortOrder: item.sortOrder,
                        });
                        setShowForm(true);
                      }}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm("Remove this lesson?"))
                          remove.mutate({ id: item.id });
                      }}
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-stone-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
                  {item.description || "No lesson description provided."}
                </p>
                <div className="mt-5 flex gap-2 border-t border-stone-100 pt-4 text-xs font-semibold text-stone-500">
                  {item.videoUrl && (
                    <Video size={15} className="text-emerald-700" />
                  )}
                  {item.telegramUrl && (
                    <Send size={15} className="text-sky-600" />
                  )}
                  {item.pdfUrl && (
                    <FileText size={15} className="text-red-500" />
                  )}
                  <span>
                    {
                      [item.videoUrl, item.telegramUrl, item.pdfUrl].filter(
                        Boolean
                      ).length
                    }{" "}
                    resources
                  </span>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              title="Your lesson library is waiting"
              body="Create a lesson with the resources students need in one clear place."
              action={
                <Button
                  onClick={() => setShowForm(true)}
                  className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
                >
                  Create lesson
                </Button>
              }
            />
          </div>
        )}
      </div>
    </>
  );
}

type LessonFormValue = {
  title: string;
  description: string;
  thumbnailUrl: string;
  telegramUrl: string;
  videoUrl: string;
  pdfUrl: string;
  isPublished: boolean;
  sortOrder: number;
};
function LessonForm({
  initial,
  pending,
  onCancel,
  onSave,
}: {
  initial: (LessonFormValue & { id: number }) | null;
  pending: boolean;
  onCancel: () => void;
  onSave: (values: LessonFormValue) => void;
}) {
  const [form, setForm] = useState<LessonFormValue>(
    initial ?? {
      title: "",
      description: "",
      thumbnailUrl: "",
      telegramUrl: "",
      videoUrl: "",
      pdfUrl: "",
      isPublished: false,
      sortOrder: 0,
    }
  );
  const update = <K extends keyof LessonFormValue>(
    key: K,
    value: LessonFormValue[K]
  ) => setForm(current => ({ ...current, [key]: value }));
  return (
    <section className="mb-6 rounded-3xl border border-emerald-900/10 bg-emerald-50/50 p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            Lesson builder
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            {initial ? "Edit lesson" : "Create lesson"}
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Lesson title">
          <Input
            value={form.title}
            onChange={event => update("title", event.target.value)}
            placeholder="e.g. Foundations of algebra"
          />
        </Field>
        <Field label="Lesson order">
          <Input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={event => update("sortOrder", Number(event.target.value))}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={event => update("description", event.target.value)}
              placeholder="Set expectations and add a concise overview."
              className="min-h-20"
            />
          </Field>
        </div>
        <Field label="Telegram URL">
          <Input
            value={form.telegramUrl}
            onChange={event => update("telegramUrl", event.target.value)}
            placeholder="https://t.me/..."
          />
        </Field>
        <Field label="Video URL">
          <Input
            value={form.videoUrl}
            onChange={event => update("videoUrl", event.target.value)}
            placeholder="https://..."
          />
        </Field>
        <label className="flex items-center gap-3 self-end rounded-xl bg-white px-4 py-3 text-sm font-semibold text-stone-700">
          <Switch
            checked={form.isPublished}
            onCheckedChange={value => update("isPublished", value)}
          />
          Publish lesson
        </label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <MediaUpload
          folder="lessons"
          accept="image/*"
          value={form.thumbnailUrl}
          onChange={url => update("thumbnailUrl", url)}
          label="Lesson thumbnail"
        />
        <MediaUpload
          folder="pdfs"
          accept="application/pdf"
          value={form.pdfUrl}
          onChange={url => update("pdfUrl", url)}
          label="Lesson PDF resource"
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} variant="ghost" className="rounded-xl">
          Cancel
        </Button>
        <Button
          disabled={pending || !form.title}
          onClick={() => onSave(form)}
          className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}Save lesson
        </Button>
      </div>
    </section>
  );
}

function QuizzesAdminLegacy() {
  const { data: quizzes, isLoading } =
    trpc.school.admin.quizzes.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const utils = trpc.useUtils();
  const quizInput = useMemo(() => ({ quizId: selectedId ?? 1 }), [selectedId]);
  const { data: details } = trpc.school.admin.quizzes.details.useQuery(
    quizInput,
    { enabled: Boolean(selectedId) }
  );
  const { data: results } = trpc.school.admin.quizzes.results.useQuery();
  const refresh = () => {
    utils.school.admin.quizzes.list.invalidate();
    utils.school.admin.quizzes.details.invalidate();
    utils.school.admin.quizzes.results.invalidate();
    utils.school.admin.dashboard.invalidate();
  };
  const remove = trpc.school.admin.quizzes.remove.useMutation({
    onSuccess: () => {
      toast.success("Quiz removed.");
      setSelectedId(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const deleteQuestion = trpc.school.admin.quizzes.questions.remove.useMutation(
    {
      onSuccess: () => {
        toast.success("Question removed.");
        refresh();
      },
      onError: error => toast.error(error.message),
    }
  );
  return (
    <>
      <PageHeading
        eyebrow="Assessment"
        title="Quizzes"
        body="Create focused assessments, define correct answers, and review student performance."
        action={
          <Button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            <Plus size={16} />
            New quiz
          </Button>
        }
      />
      {showCreate && (
        <QuizCreateForm
          onCancel={() => setShowCreate(false)}
          onDone={id => {
            setShowCreate(false);
            setSelectedId(id);
            refresh();
          }}
        />
      )}
      <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-3xl border border-stone-200/80 bg-white shadow-sm">
          <div className="border-b border-stone-100 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
              Assessment library
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              All quizzes
            </h3>
          </div>
          {isLoading ? (
            <div className="grid h-44 place-items-center">
              <Loader2 className="animate-spin text-emerald-700" />
            </div>
          ) : quizzes?.length ? (
            <div className="p-2">
              {quizzes.map(quiz => (
                <button
                  key={quiz.id}
                  onClick={() => setSelectedId(quiz.id)}
                  className={cn(
                    "w-full rounded-2xl p-4 text-left transition",
                    selectedId === quiz.id
                      ? "bg-emerald-50"
                      : "hover:bg-stone-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <StatusPill published={quiz.isPublished} />
                      <p className="mt-2 text-sm font-semibold text-stone-800">
                        {quiz.title}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">
                        {quiz.totalMarks} marks{" "}
                        {quiz.durationMinutes
                          ? `· ${quiz.durationMinutes} min`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 text-stone-400" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No quizzes yet"
                body="Create an assessment to begin checking understanding."
                action={
                  <Button
                    onClick={() => setShowCreate(true)}
                    className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
                  >
                    New quiz
                  </Button>
                }
              />
            </div>
          )}
        </div>
        <div>
          {selectedId && details ? (
            <section className="rounded-3xl border border-stone-200/80 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusPill published={details.quiz.isPublished} />
                    <span className="text-xs text-stone-400">
                      {details.quiz.totalMarks} total marks
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-stone-900">
                    {details.quiz.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    {details.quiz.description || "No description provided."}
                  </p>
                </div>
                <div className="flex">
                  <Button
                    onClick={() => setShowQuestion(true)}
                    className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
                  >
                    <Plus size={15} />
                    Question
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm("Remove this quiz and all questions?"))
                        remove.mutate({ id: details.quiz.id });
                    }}
                    variant="ghost"
                    size="icon"
                    className="ml-1 rounded-xl text-stone-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              {showQuestion && (
                <QuestionForm
                  quizId={details.quiz.id}
                  sortOrder={details.questions.length}
                  onCancel={() => setShowQuestion(false)}
                  onDone={() => {
                    setShowQuestion(false);
                    refresh();
                  }}
                />
              )}
              <div className="divide-y divide-stone-100">
                {details.questions.length ? (
                  details.questions.map((question, index) => (
                    <div key={question.id} className="p-5">
                      <div className="flex items-start gap-4">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-800">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-6 text-stone-800">
                              {question.question}
                            </p>
                            <Button
                              onClick={() =>
                                deleteQuestion.mutate({
                                  id: question.id,
                                  quizId: details.quiz.id,
                                })
                              }
                              variant="ghost"
                              size="icon"
                              className="-mt-2 shrink-0 rounded-lg text-stone-300 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {question.options.map((option, optionIndex) => (
                              <div
                                key={option}
                                className={cn(
                                  "rounded-xl border px-3 py-2 text-xs",
                                  optionIndex === question.correctAnswerIndex
                                    ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
                                    : "border-stone-100 bg-stone-50 text-stone-500"
                                )}
                              >
                                <span className="mr-2 font-mono text-[10px]">
                                  {String.fromCharCode(65 + optionIndex)}
                                </span>
                                {option}
                                {optionIndex ===
                                  question.correctAnswerIndex && (
                                  <Check size={13} className="float-right" />
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-[11px] font-semibold text-stone-400">
                            {question.marks} mark
                            {question.marks === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8">
                    <EmptyState
                      title="Add the first question"
                      body="Each question needs at least two choices and a designated correct answer."
                      action={
                        <Button
                          onClick={() => setShowQuestion(true)}
                          className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
                        >
                          Add question
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            </section>
          ) : (
            <EmptyState
              title="Select a quiz"
              body="Choose an assessment from the library to build its questions and review its structure."
            />
          )}
        </div>
      </div>
      <section className="mt-7 rounded-3xl border border-stone-200/80 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            Performance review
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            Recent quiz attempts
          </h3>
        </div>
        {results?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[.16em] text-stone-400">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-4 py-4">Quiz</th>
                  <th className="px-4 py-4">Score</th>
                  <th className="px-4 py-4">Result</th>
                  <th className="px-5 py-4">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 8).map(row => (
                  <tr
                    key={row.attempt.id}
                    className="border-t border-stone-100 text-sm"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-stone-800">
                        {row.student.name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {row.student.studentId}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {row.quiz.title}
                    </td>
                    <td className="px-4 py-4 font-semibold text-stone-800">
                      {row.attempt.score}/{row.attempt.totalMarks}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {row.attempt.percentage}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-400">
                      {formatDate(row.attempt.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              title="No attempts to review"
              body="Student quiz submissions will appear here after a published assessment is completed."
            />
          </div>
        )}
      </section>
    </>
  );
}

function QuizCreateForm({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: (id: number) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationMinutes: "20",
    opensAt: "",
    closesAt: "",
    isPublished: false,
  });
  const create = trpc.school.admin.quizzes.create.useMutation({
    onSuccess: data => {
      toast.success("Quiz created. Add questions next.");
      onDone(data.id);
    },
    onError: error => toast.error(error.message),
  });
  return (
    <section className="mb-6 rounded-3xl border border-emerald-900/10 bg-emerald-50/50 p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            Assessment builder
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            Create a quiz
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Quiz title">
          <Input
            value={form.title}
            onChange={event =>
              setForm(current => ({ ...current, title: event.target.value }))
            }
            placeholder="e.g. Week 1 checkpoint"
          />
        </Field>
        <Field label="Duration in minutes">
          <Input
            type="number"
            min="1"
            value={form.durationMinutes}
            onChange={event =>
              setForm(current => ({
                ...current,
                durationMinutes: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Opens at (optional)">
          <Input type="datetime-local" value={form.opensAt} onChange={event => setForm(current => ({ ...current, opensAt: event.target.value }))} />
        </Field>
        <Field label="Closes at (optional)">
          <Input type="datetime-local" value={form.closesAt} onChange={event => setForm(current => ({ ...current, closesAt: event.target.value }))} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Set the context for this quiz."
              className="min-h-20"
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-stone-700">
          <Switch
            checked={form.isPublished}
            onCheckedChange={value =>
              setForm(current => ({ ...current, isPublished: value }))
            }
          />
          Publish immediately
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} variant="ghost" className="rounded-xl">
          Cancel
        </Button>
        <Button
          disabled={create.isPending || !form.title}
          onClick={() =>
            create.mutate({
              title: form.title,
              description: form.description || null,
              durationMinutes: form.durationMinutes
                ? Number(form.durationMinutes)
                : null,
              opensAt: form.opensAt ? new Date(form.opensAt).toISOString() : null,
              closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
              isPublished: form.isPublished,
            })
          }
          className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
        >
          {create.isPending && <Loader2 size={15} className="animate-spin" />}
          Create quiz
        </Button>
      </div>
    </section>
  );
}

function QuestionFormLegacy({
  quizId,
  sortOrder,
  onCancel,
  onDone,
}: {
  quizId: number;
  sortOrder: number;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [marks, setMarks] = useState(1);
  const create = trpc.school.admin.quizzes.questions.create.useMutation({
    onSuccess: () => {
      toast.success("Question added.");
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  return (
    <div className="border-b border-stone-100 bg-stone-50/70 p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-800/55">
            Question {sortOrder + 1}
          </p>
          <h4 className="mt-1 font-display text-lg font-semibold">
            Add a multiple-choice question
          </h4>
        </div>
        <button
          onClick={onCancel}
          className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-4">
        <Field label="Question">
          <Textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder="Write a clear, single-focus question."
            className="min-h-20 bg-white"
          />
        </Field>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option, index) => (
          <label
            key={index}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5",
              correctAnswerIndex === index
                ? "border-emerald-300 ring-2 ring-emerald-100"
                : "border-stone-200"
            )}
          >
            <input
              type="radio"
              name="correct"
              checked={correctAnswerIndex === index}
              onChange={() => setCorrectAnswerIndex(index)}
              className="accent-emerald-800"
            />
            <Input
              value={option}
              onChange={event =>
                setOptions(current =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item
                  )
                )
              }
              placeholder={`Option ${String.fromCharCode(65 + index)}`}
              className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <Field label="Marks">
          <Input
            type="number"
            min="1"
            value={marks}
            onChange={event => setMarks(Number(event.target.value))}
            className="w-24 bg-white"
          />
        </Field>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="ghost" className="rounded-xl">
            Cancel
          </Button>
          <Button
            disabled={
              create.isPending || !question || options.some(option => !option)
            }
            onClick={() =>
              create.mutate({
                quizId,
                question,
                options,
                correctAnswerIndex,
                marks,
                sortOrder,
              })
            }
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            {create.isPending && <Loader2 size={15} className="animate-spin" />}
            Add question
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttendanceAdmin() {
  const { data: students } = trpc.school.admin.students.list.useQuery(
    useMemo(() => ({ search: "" }), [])
  );
  const { data: records, isLoading } =
    trpc.school.admin.attendance.list.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    studentUserId: "",
    date: new Date().toISOString().slice(0, 10),
    status: "Present" as "Present" | "Absent" | "Late" | "Excused",
    note: "",
  });
  const save = trpc.school.admin.attendance.upsert.useMutation({
    onSuccess: () => {
      toast.success("Attendance saved.");
      utils.school.admin.attendance.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  return (
    <>
      <PageHeading
        eyebrow="Student records"
        title="Attendance"
        body="Record the daily presence of each student, with clear statuses and supporting notes."
      />
      <section className="rounded-3xl border border-emerald-900/10 bg-emerald-50/50 p-5">
        <div className="flex items-center gap-2">
          <CalendarDays size={17} className="text-emerald-800" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
              Daily check-in
            </p>
            <h3 className="font-display text-xl font-semibold text-stone-900">
              Record attendance
            </h3>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Student">
            <select
              value={form.studentUserId}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  studentUserId: event.target.value,
                }))
              }
              className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700"
            >
              <option value="">Select student</option>
              {students?.map(student => (
                <option value={student.id} key={student.id}>
                  {student.name}{" "}
                  {student.studentId ? `(${student.studentId})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={form.date}
              onChange={event =>
                setForm(current => ({ ...current, date: event.target.value }))
              }
              className="bg-white"
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  status: event.target.value as typeof form.status,
                }))
              }
              className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700"
            >
              <option>Present</option>
              <option>Absent</option>
              <option>Late</option>
              <option>Excused</option>
            </select>
          </Field>
          <Field label="Optional note">
            <Input
              value={form.note}
              onChange={event =>
                setForm(current => ({ ...current, note: event.target.value }))
              }
              placeholder="e.g. medical appointment"
              className="bg-white"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            disabled={save.isPending || !form.studentUserId}
            onClick={() =>
              save.mutate({
                studentUserId: Number(form.studentUserId),
                date: form.date,
                status: form.status,
                note: form.note || null,
              })
            }
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            {save.isPending && <Loader2 size={15} className="animate-spin" />}
            Save attendance
          </Button>
        </div>
      </section>
      <section className="mt-7 rounded-3xl border border-stone-200/80 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            Record book
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            Attendance history
          </h3>
        </div>
        {isLoading ? (
          <div className="grid min-h-52 place-items-center">
            <Loader2 className="animate-spin text-emerald-700" />
          </div>
        ) : records?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[.16em] text-stone-400">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-5 py-4">Note</th>
                </tr>
              </thead>
              <tbody>
                {records.map(row => (
                  <tr
                    key={row.record.id}
                    className="border-t border-stone-100 text-sm"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-stone-800">
                        {row.student.name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {row.student.studentId}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {row.record.date}
                    </td>
                    <td className="px-4 py-4">
                      <AttendancePill status={row.record.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">
                      {row.record.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              title="No attendance records"
              body="Start by selecting a student and recording today's attendance."
            />
          </div>
        )}
      </section>
    </>
  );
}
function AttendancePill({
  status,
}: {
  status: "Present" | "Absent" | "Late" | "Excused";
}) {
  const styles = {
    Present: "bg-emerald-50 text-emerald-700",
    Absent: "bg-red-50 text-red-700",
    Late: "bg-amber-50 text-amber-700",
    Excused: "bg-sky-50 text-sky-700",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}

export function StudentPortal() {
  return (
    <RoleGate role="student">
      <StudentWorkspace />
    </RoleGate>
  );
}

function StudentWorkspace() {
  const [location, setLocation] = useLocation();
  let content: React.ReactNode = <StudentHome />;
  if (location === "/student/lessons") content = <StudentLessons />;
  else if (location === "/student/quizzes") content = <StudentQuizzes />;
  else if (location.startsWith("/student/quizzes/"))
    content = <StudentQuizFlow quizId={Number(location.split("/").pop())} />;
  else if (location === "/student/attendance") content = <StudentAttendance />;
  else if (location === "/student/assignments")
    content = <StudentAssignments />;
  else if (location === "/student/profile") content = <StudentProfile />;
  const nav = [
    { icon: LayoutDashboard, label: "Home", path: "/student" },
    { icon: BookOpen, label: "Lessons", path: "/student/lessons" },
    { icon: ClipboardCheck, label: "Quizzes", path: "/student/quizzes" },
    { icon: UserCheck, label: "Profile", path: "/student/profile" },
  ];
  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24 text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f8f8f6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-5xl items-center justify-between px-5">
          <button
            onClick={() => setLocation("/student")}
            className="flex items-center gap-2.5"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-900 text-[#d4f59b]">
              <BookOpenCheck size={18} />
            </span>
            <span className="font-display text-base font-semibold">
              Coursewise
            </span>
          </button>
          <button
            onClick={() => setLocation("/student/profile")}
            className="grid size-9 place-items-center rounded-full bg-white text-emerald-800 shadow-sm ring-1 ring-stone-200"
          >
            <UserCheck size={17} />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-7 md:py-10">{content}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/90 bg-white/95 px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {nav.map(item => {
            const active = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition",
                  active ? "text-emerald-800" : "text-stone-400"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-lg",
                    active && "bg-emerald-50"
                  )}
                >
                  <item.icon size={17} />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function StudentHome() {
  const { data, isLoading } = trpc.school.student.home.useQuery();
  const [, setLocation] = useLocation();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!data?.announcements.length || data.announcements.length < 2) return;
    const timer = window.setInterval(
      () => setActive(current => (current + 1) % data.announcements.length),
      5000
    );
    return () => window.clearInterval(timer);
  }, [data?.announcements.length]);
  if (isLoading)
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader2 className="animate-spin text-emerald-700" />
      </div>
    );
  const profile = data?.profile;
  const announcement = data?.announcements[active];
  return (
    <>
      <section className="overflow-hidden rounded-[2rem] bg-[#143d36] p-6 text-white shadow-[0_18px_50px_rgba(20,61,54,.18)] md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.19em] text-[#d4f59b]/80">
              Student home
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              Hello, {profile?.name?.split(" ")[0] ?? "Learner"}.
            </h1>
            <p className="mt-1 text-sm text-emerald-100/70">
              Student ID ·{" "}
              <span className="font-mono text-[#d4f59b]">
                {profile?.studentId ?? "Not assigned"}
              </span>
            </p>
          </div>
          <span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-[#d4f59b]">
            <GraduationCap size={22} />
          </span>
        </div>
        <div className="mt-9 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
          <StudentMetric
            value={data?.attendance.attendanceRate ?? 0}
            label="Attendance"
            suffix="%"
          />
          <StudentMetric
            value={data?.attendance.Present ?? 0}
            label="Present"
          />
          <StudentMetric
            value={data?.attendance.recorded ?? 0}
            label="Recorded"
          />
        </div>
      </section>
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
              What’s new
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              Announcements
            </h2>
          </div>
          {data?.announcements.length ? (
            <span className="text-xs text-stone-400">
              {active + 1} of {data.announcements.length}
            </span>
          ) : null}
        </div>
        {announcement ? (
          <article className="relative min-h-52 overflow-hidden rounded-[1.7rem] bg-[linear-gradient(130deg,#245c4f,#4a816d)] p-6 text-white shadow-sm">
            {announcement.bannerUrl && (
              <img
                src={announcement.bannerUrl}
                alt=""
                className="absolute inset-0 size-full object-cover opacity-45"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/20 to-transparent" />
            <div className="relative flex h-full min-h-40 flex-col justify-end">
              <span className="mb-auto inline-flex w-fit rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.16em] backdrop-blur">
                School update
              </span>
              <h3 className="mt-8 font-display text-2xl font-semibold tracking-tight">
                {announcement.title}
              </h3>
              <p className="mt-1 max-w-lg text-sm leading-6 text-emerald-50/80">
                {announcement.description}
              </p>
              {announcement.linkUrl && (
                <a
                  href={announcement.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-2 text-xs font-bold text-[#d4f59b]"
                >
                  Open update <ArrowRight size={13} />
                </a>
              )}
            </div>
          </article>
        ) : (
          <EmptyState
            title="Nothing new just yet"
            body="Your instructor’s published updates will appear here."
          />
        )}
        {data?.announcements.length && data.announcements.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {data.announcements.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActive(index)}
                aria-label={`Show announcement ${index + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === active ? "w-5 bg-emerald-800" : "w-1.5 bg-stone-300"
                )}
              />
            ))}
          </div>
        ) : null}
      </section>
      <section className="mt-9">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
          Keep moving
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold">
          Your learning space
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: BookOpen,
              title: "Lessons",
              body: "Explore course resources",
              path: "/student/lessons",
              tone: "bg-[#e5f5ed] text-emerald-800",
            },
            {
              icon: ClipboardCheck,
              title: "Quizzes",
              body: "Check your understanding",
              path: "/student/quizzes",
              tone: "bg-[#fff3df] text-amber-800",
            },
            {
              icon: FileText,
              title: "Assignments",
              body: "View what is next",
              path: "/student/assignments",
              tone: "bg-[#eef2ff] text-indigo-800",
            },
            {
              icon: CalendarDays,
              title: "Attendance",
              body: "Review your record",
              path: "/student/attendance",
              tone: "bg-[#f4ebff] text-violet-800",
            },
          ].map(tile => (
            <button
              key={tile.title}
              onClick={() => setLocation(tile.path)}
              className="group flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-xl",
                  tile.tone
                )}
              >
                <tile.icon size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-stone-800">
                  {tile.title}
                </span>
                <span className="mt-0.5 block text-xs text-stone-400">
                  {tile.body}
                </span>
              </span>
              <ArrowRight
                size={16}
                className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
              />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
function StudentMetric({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div>
      <p className="font-display text-2xl font-semibold text-white">
        {value}
        {suffix}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.15em] text-emerald-100/55">
        {label}
      </p>
    </div>
  );
}

function StudentLessons() {
  const { data: lessons, isLoading } = trpc.school.student.lessons.useQuery();
  return (
    <>
      <StudentHeading
        eyebrow="Learning library"
        title="Lessons"
        body="Everything your instructor has prepared, gathered in one clear place."
      />
      {isLoading ? (
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-emerald-700" />
        </div>
      ) : lessons?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map(lesson => (
            <article
              key={lesson.id}
              className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm"
            >
              <div className="h-36 bg-[#e7efe9]">
                {lesson.thumbnailUrl ? (
                  <img
                    src={lesson.thumbnailUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-emerald-700">
                    <BookOpen size={28} />
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-700">
                  Lesson {String(lesson.sortOrder).padStart(2, "0")}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-stone-900">
                  {lesson.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  {lesson.description ||
                    "Your instructor has shared this lesson resource."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {lesson.videoUrl && (
                    <a
                      href={lesson.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-3 py-2 text-xs font-bold text-white"
                    >
                      <Play size={13} />
                      Watch video
                    </a>
                  )}
                  {lesson.pdfUrl && (
                    <a
                      href={lesson.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700"
                    >
                      <FileText size={13} className="text-red-500" />
                      Open PDF
                    </a>
                  )}
                  {lesson.telegramUrl && (
                    <a
                      href={lesson.telegramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700"
                    >
                      <Send size={13} />
                      Telegram
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No lessons available"
          body="Published lesson resources will appear here when your instructor is ready to share them."
        />
      )}
    </>
  );
}
function StudentHeading({
  eyebrow,
  title,
  body,
  back,
}: {
  eyebrow: string;
  title: string;
  body: string;
  back?: () => void;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-start gap-3">
        {back && (
          <button
            onClick={back}
            className="mt-1 grid size-9 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900">
            {title}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-stone-500">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentQuizzes() {
  const { data: quizzes, isLoading } =
    trpc.school.student.quizzes.list.useQuery();
  const { data: attempts } = trpc.school.student.quizzes.attempts.useQuery();
  const [, setLocation] = useLocation();
  return (
    <>
      <StudentHeading
        eyebrow="Assessment"
        title="Quizzes"
        body="Take your time, work through each question, and see your result as soon as you submit."
      />
      {isLoading ? (
        <div className="grid min-h-52 place-items-center">
          <Loader2 className="animate-spin text-emerald-700" />
        </div>
      ) : quizzes?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes.map(quiz => (
            <article
              key={quiz.id}
              className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                  <ClipboardCheck size={18} />
                </span>
                <span className="text-xs font-semibold text-stone-400">
                  {quiz.durationMinutes
                    ? `${quiz.durationMinutes} min`
                    : "Untimed"}
                </span>
              </div>
              <h2 className="mt-7 font-display text-xl font-semibold text-stone-900">
                {quiz.title}
              </h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">
                {quiz.description || "A focused checkpoint for your learning."}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                <span className="text-xs font-semibold text-stone-400">
                  {quiz.totalMarks} marks
                </span>
                <Button
                  onClick={() => setLocation(`/student/quizzes/${quiz.id}`)}
                  className="h-9 rounded-xl bg-emerald-900 px-3 text-xs hover:bg-emerald-800"
                >
                  Start quiz <ArrowRight size={14} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No quizzes available"
          body="Published assessments will appear here when your instructor is ready."
        />
      )}
      <section className="mt-9">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            Your progress
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            Past attempts
          </h2>
        </div>
        {attempts?.length ? (
          <div className="space-y-2">
            {attempts.map(row => (
              <div
                key={row.attempt.id}
                className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                  <BadgeCheck size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-800">
                    {row.quiz.title}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {formatDate(row.attempt.submittedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-semibold text-emerald-800">
                    {row.attempt.percentage}%
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    {row.attempt.score}/{row.attempt.totalMarks}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No quiz attempts yet"
            body="Your completed quiz results will be collected here."
          />
        )}
      </section>
    </>
  );
}

function StudentQuizFlow({ quizId }: { quizId: number }) {
  const [, setLocation] = useLocation();
  const input = useMemo(() => ({ quizId }), [quizId]);
  const { data, isLoading, error } =
    trpc.school.student.quizzes.take.useQuery(input);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{
    score: number;
    totalMarks: number;
    percentage: number;
  } | null>(null);
  const submit = trpc.school.student.quizzes.submit.useMutation({
    onSuccess: value => setResult(value),
    onError: issue => toast.error(issue.message),
  });
  if (isLoading)
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader2 className="animate-spin text-emerald-700" />
      </div>
    );
  if (error || !data)
    return (
      <>
        <StudentHeading
          eyebrow="Assessment"
          title="Quiz unavailable"
          body={error?.message ?? "This assessment could not be loaded."}
          back={() => setLocation("/student/quizzes")}
        />
        <EmptyState
          title="Try another quiz"
          body="The quiz may have been unpublished or removed by your instructor."
        />
      </>
    );
  if (result)
    return (
      <section className="mx-auto max-w-xl rounded-[2rem] border border-stone-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <BadgeCheck size={30} />
        </div>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
          Quiz completed
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-stone-900">
          Well done for showing up.
        </h1>
        <div className="mt-7 rounded-3xl bg-[#143d36] p-6 text-white">
          <p className="text-sm text-emerald-100/70">Your score</p>
          <p className="mt-1 font-display text-5xl font-semibold">
            {result.score}
            <span className="text-2xl text-emerald-100/60">
              /{result.totalMarks}
            </span>
          </p>
          <p className="mt-3 inline-flex rounded-full bg-[#d4f59b] px-3 py-1 text-sm font-bold text-emerald-950">
            {result.percentage}%
          </p>
        </div>
        <Button
          onClick={() => setLocation("/student/quizzes")}
          className="mt-7 rounded-xl bg-emerald-900 hover:bg-emerald-800"
        >
          Back to quizzes
        </Button>
      </section>
    );
  const question = data.questions[current];
  const complete = Object.keys(answers).length === data.questions.length;
  return (
    <>
      <StudentHeading
        eyebrow="Assessment"
        title={data.quiz.title}
        body={
          data.quiz.description ||
          "Work through each question and submit when you are ready."
        }
        back={() => setLocation("/student/quizzes")}
      />
      <section className="mx-auto max-w-2xl rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-400">
          <span>
            Question {current + 1} of {data.questions.length}
          </span>
          {data.quiz.durationMinutes && (
            <span className="inline-flex items-center gap-1">
              <Clock3 size={13} />
              {data.quiz.durationMinutes} min
            </span>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-emerald-700 transition-all"
            style={{
              width: `${((current + 1) / data.questions.length) * 100}%`,
            }}
          />
        </div>
        <h2 className="mt-8 font-display text-2xl font-semibold leading-8 text-stone-900">
          {question.question}
        </h2>
        <div className="mt-6 space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() =>
                setAnswers(currentAnswers => ({
                  ...currentAnswers,
                  [question.id]: index,
                }))
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm transition",
                answers[question.id] === index
                  ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100"
                  : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold",
                  answers[question.id] === index
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-stone-300 text-stone-500"
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-stone-100 pt-5">
          <Button
            onClick={() => setCurrent(value => Math.max(0, value - 1))}
            disabled={current === 0}
            variant="ghost"
            className="rounded-xl"
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          {current < data.questions.length - 1 ? (
            <Button
              onClick={() => setCurrent(value => value + 1)}
              className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
            >
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              disabled={!complete || submit.isPending}
              onClick={() =>
                submit.mutate({
                  quizId,
                  answers: Object.entries(answers).map(
                    ([questionId, selectedAnswerIndex]) => ({
                      questionId: Number(questionId),
                      selectedAnswerIndex,
                    })
                  ),
                })
              }
              className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
            >
              {submit.isPending && (
                <Loader2 size={15} className="animate-spin" />
              )}
              Submit quiz
            </Button>
          )}
        </div>
        {current === data.questions.length - 1 && !complete && (
          <p className="mt-3 text-center text-xs text-amber-700">
            Answer each question before submitting.
          </p>
        )}
      </section>
    </>
  );
}

function StudentAttendance() {
  const { data, isLoading } = trpc.school.student.attendance.useQuery();
  return (
    <>
      <StudentHeading
        eyebrow="Your record"
        title="Attendance"
        body="A simple view of your attendance through the term."
      />
      {isLoading ? (
        <div className="grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-emerald-700" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Present",
                value: data?.summary.Present ?? 0,
                tone: "text-emerald-800 bg-emerald-50",
              },
              {
                label: "Absent",
                value: data?.summary.Absent ?? 0,
                tone: "text-red-700 bg-red-50",
              },
              {
                label: "Late",
                value: data?.summary.Late ?? 0,
                tone: "text-amber-700 bg-amber-50",
              },
              {
                label: "Excused",
                value: data?.summary.Excused ?? 0,
                tone: "text-sky-700 bg-sky-50",
              },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm"
              >
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                    item.tone
                  )}
                >
                  {item.label}
                </span>
                <p className="mt-5 font-display text-3xl font-semibold text-stone-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <section className="mt-5 overflow-hidden rounded-3xl bg-[#143d36] p-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#d4f59b]/75">
              Attendance rate
            </p>
            <div className="mt-4 flex items-end justify-between">
              <p className="font-display text-5xl font-semibold">
                {data?.summary.attendanceRate ?? 0}%
              </p>
              <p className="mb-1 text-xs text-emerald-100/60">
                Present and late days
              </p>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#d4f59b]"
                style={{ width: `${data?.summary.attendanceRate ?? 0}%` }}
              />
            </div>
          </section>
          <section className="mt-8">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
                Day by day
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">
                Attendance history
              </h2>
            </div>
            {data?.records.length ? (
              <div className="space-y-2">
                {data.records.map(record => (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-stone-50 text-stone-500">
                      <CalendarDays size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800">
                        {record.date}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-stone-400">
                        {record.note || "No note"}
                      </p>
                    </div>
                    <AttendancePill status={record.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No attendance records yet"
                body="Your attendance history will appear after your instructor records it."
              />
            )}
          </section>
        </>
      )}
    </>
  );
}

function StudentAssignments() {
  return (
    <>
      <StudentHeading
        eyebrow="Learning tasks"
        title="Assignments"
        body="A focused place for the next piece of work your instructor shares."
      />
      <EmptyState
        title="No assignments available"
        body="When your instructor publishes an assignment, it will appear here with the information you need to begin."
      />
    </>
  );
}

function StudentProfile() {
  const { data, isLoading } = trpc.school.student.profile.useQuery();
  const { logout } = useAuth();
  if (isLoading)
    return (
      <div className="grid min-h-64 place-items-center">
        <Loader2 className="animate-spin text-emerald-700" />
      </div>
    );
  const profile = data?.profile;
  return (
    <>
      <StudentHeading
        eyebrow="Your account"
        title="Profile"
        body="Your academic identity and attendance at a glance."
      />
      <section className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white shadow-sm">
        <div className="bg-[#143d36] px-6 pb-7 pt-8 text-white">
          <div className="flex items-center gap-4">
            {profile?.profilePhotoUrl ? (
              <img
                src={profile.profilePhotoUrl}
                alt=""
                className="size-16 rounded-2xl object-cover ring-4 ring-white/10"
              />
            ) : (
              <span className="grid size-16 place-items-center rounded-2xl bg-[#d4f59b] font-display text-xl font-bold text-emerald-950">
                {initials(profile?.name)}
              </span>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#d4f59b]/70">
                Student profile
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">
                {profile?.name}
              </h2>
              <p className="mt-1 font-mono text-xs text-emerald-100/70">
                {profile?.studentId ?? "Student ID not assigned"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileDetail
              label="Email"
              value={profile?.email ?? "Not available"}
            />
            <ProfileDetail
              label="Student ID"
              value={profile?.studentId ?? "Not assigned"}
            />
            <ProfileDetail
              label="Attendance rate"
              value={`${data?.attendance.attendanceRate ?? 0}%`}
            />
            <ProfileDetail
              label="Recorded days"
              value={`${data?.attendance.recorded ?? 0}`}
            />
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="mt-7 w-full rounded-xl border-red-100 text-red-700 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={15} />
            Sign out
          </Button>
        </div>
      </section>
    </>
  );
}
function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-stone-400">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-stone-800">
        {value}
      </p>
    </div>
  );
}

type EditableQuiz = {
  id: number;
  title: string;
  description: string;
  durationMinutes: number | null;
  opensAt: Date | string | null;
  closesAt: Date | string | null;
  isPublished: boolean;
};
type EditableQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  marks: number;
  sortOrder: number;
};

function QuizzesAdmin() {
  const { data: quizzes, isLoading } =
    trpc.school.admin.quizzes.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<EditableQuiz | null>(null);
  const [editingQuestion, setEditingQuestion] =
    useState<EditableQuestion | null>(null);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const utils = trpc.useUtils();
  const detailsInput = useMemo(
    () => ({ quizId: selectedId ?? 1 }),
    [selectedId]
  );
  const { data: details } = trpc.school.admin.quizzes.details.useQuery(
    detailsInput,
    { enabled: Boolean(selectedId) }
  );
  const { data: results } = trpc.school.admin.quizzes.results.useQuery();
  const refresh = () => {
    utils.school.admin.quizzes.list.invalidate();
    utils.school.admin.quizzes.details.invalidate();
    utils.school.admin.quizzes.results.invalidate();
    utils.school.admin.dashboard.invalidate();
  };
  const removeQuiz = trpc.school.admin.quizzes.remove.useMutation({
    onSuccess: () => {
      toast.success("Quiz removed.");
      setSelectedId(null);
      refresh();
    },
    onError: error => toast.error(error.message),
  });
  const removeQuestion = trpc.school.admin.quizzes.questions.remove.useMutation(
    {
      onSuccess: () => {
        toast.success("Question removed.");
        refresh();
      },
      onError: error => toast.error(error.message),
    }
  );

  return (
    <>
      <PageHeading
        eyebrow="Assessment"
        title="Quizzes"
        body="Create focused assessments, refine their questions, and review every completed attempt."
        action={
          <Button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            <Plus size={16} />
            New quiz
          </Button>
        }
      />
      {showCreate && (
        <QuizCreateForm
          onCancel={() => setShowCreate(false)}
          onDone={id => {
            setShowCreate(false);
            setSelectedId(id);
            refresh();
          }}
        />
      )}
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-3xl border border-stone-200/80 bg-white shadow-sm">
          <div className="border-b border-stone-100 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
              Assessment library
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              All quizzes
            </h3>
          </div>
          {isLoading ? (
            <div className="grid h-48 place-items-center">
              <Loader2 className="animate-spin text-emerald-700" />
            </div>
          ) : quizzes?.length ? (
            <div className="p-2">
              {quizzes.map(quiz => (
                <button
                  key={quiz.id}
                  onClick={() => {
                    setSelectedId(quiz.id);
                    setEditingQuiz(null);
                    setEditingQuestion(null);
                    setAddingQuestion(false);
                  }}
                  className={cn(
                    "w-full rounded-2xl p-4 text-left transition",
                    selectedId === quiz.id
                      ? "bg-emerald-50"
                      : "hover:bg-stone-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <StatusPill published={quiz.isPublished} />
                      <p className="mt-2 text-sm font-semibold text-stone-800">
                        {quiz.title}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">
                        {quiz.totalMarks} marks{" "}
                        {quiz.durationMinutes
                          ? `· ${quiz.durationMinutes} min`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 text-stone-400" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No quizzes yet"
                body="Create an assessment to begin checking understanding."
                action={
                  <Button
                    onClick={() => setShowCreate(true)}
                    className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
                  >
                    New quiz
                  </Button>
                }
              />
            </div>
          )}
        </section>
        <section>
          {selectedId && details ? (
            <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusPill published={details.quiz.isPublished} />
                    <span className="text-xs text-stone-400">
                      {details.quiz.totalMarks} total marks
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-stone-900">
                    {details.quiz.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    {details.quiz.description || "No description provided."}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    onClick={() =>
                      setEditingQuiz({
                        id: details.quiz.id,
                        title: details.quiz.title,
                        description: details.quiz.description ?? "",
                        durationMinutes: details.quiz.durationMinutes,
                        opensAt: details.quiz.opensAt,
                        closesAt: details.quiz.closesAt,
                        isPublished: details.quiz.isPublished,
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                  >
                    <Pencil size={14} />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setAddingQuestion(true)}
                    size="sm"
                    className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
                  >
                    <Plus size={14} />
                    Question
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm("Remove this quiz and all of its questions?"))
                        removeQuiz.mutate({ id: details.quiz.id });
                    }}
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-stone-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              {editingQuiz && (
                <QuizEditForm
                  initial={editingQuiz}
                  onCancel={() => setEditingQuiz(null)}
                  onDone={() => {
                    setEditingQuiz(null);
                    refresh();
                  }}
                />
              )}
              {addingQuestion && (
                <QuestionForm
                  key="new-question"
                  quizId={details.quiz.id}
                  sortOrder={details.questions.length}
                  onCancel={() => setAddingQuestion(false)}
                  onDone={() => {
                    setAddingQuestion(false);
                    refresh();
                  }}
                />
              )}
              {editingQuestion && (
                <QuestionForm
                  key={`question-${editingQuestion.id}`}
                  quizId={details.quiz.id}
                  sortOrder={editingQuestion.sortOrder}
                  initial={editingQuestion}
                  onCancel={() => setEditingQuestion(null)}
                  onDone={() => {
                    setEditingQuestion(null);
                    refresh();
                  }}
                />
              )}
              <div className="divide-y divide-stone-100">
                {details.questions.length ? (
                  details.questions.map((question, index) => (
                    <div key={question.id} className="p-5">
                      <div className="flex items-start gap-4">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-800">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-6 text-stone-800">
                              {question.question}
                            </p>
                            <div className="-mt-2 flex shrink-0">
                              <Button
                                onClick={() => {
                                  setAddingQuestion(false);
                                  setEditingQuestion({
                                    id: question.id,
                                    question: question.question,
                                    options: question.options,
                                    correctAnswerIndex:
                                      question.correctAnswerIndex ?? 0,
                                    marks: question.marks,
                                    sortOrder: question.sortOrder ?? index,
                                  });
                                }}
                                variant="ghost"
                                size="icon"
                                className="rounded-lg text-stone-400 hover:text-emerald-700"
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                onClick={() => {
                                  if (confirm("Remove this question?"))
                                    removeQuestion.mutate({
                                      id: question.id,
                                      quizId: details.quiz.id,
                                    });
                                }}
                                variant="ghost"
                                size="icon"
                                className="rounded-lg text-stone-300 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {question.options.map((option, optionIndex) => (
                              <div
                                key={`${option}-${optionIndex}`}
                                className={cn(
                                  "rounded-xl border px-3 py-2 text-xs",
                                  optionIndex === question.correctAnswerIndex
                                    ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
                                    : "border-stone-100 bg-stone-50 text-stone-500"
                                )}
                              >
                                <span className="mr-2 font-mono text-[10px]">
                                  {String.fromCharCode(65 + optionIndex)}
                                </span>
                                {option}
                                {optionIndex ===
                                  question.correctAnswerIndex && (
                                  <Check size={13} className="float-right" />
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-[11px] font-semibold text-stone-400">
                            {question.marks} mark
                            {question.marks === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8">
                    <EmptyState
                      title="Add the first question"
                      body="Each question needs at least two choices and a designated correct answer."
                      action={
                        <Button
                          onClick={() => setAddingQuestion(true)}
                          className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
                        >
                          Add question
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Select a quiz"
              body="Choose an assessment from the library to build questions and review its structure."
            />
          )}
        </section>
      </div>
      <section className="mt-7 rounded-3xl border border-stone-200/80 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">
            Performance review
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            Recent quiz attempts
          </h3>
        </div>
        {results?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[.16em] text-stone-400">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-4 py-4">Quiz</th>
                  <th className="px-4 py-4">Score</th>
                  <th className="px-4 py-4">Result</th>
                  <th className="px-5 py-4">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 8).map(row => (
                  <tr
                    key={row.attempt.id}
                    className="border-t border-stone-100 text-sm"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-stone-800">
                        {row.student.name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {row.student.studentId}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {row.quiz.title}
                    </td>
                    <td className="px-4 py-4 font-semibold text-stone-800">
                      {row.attempt.score}/{row.attempt.totalMarks}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {row.attempt.percentage}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-400">
                      {formatDate(row.attempt.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              title="No attempts to review"
              body="Student quiz submissions will appear here after a published assessment is completed."
            />
          </div>
        )}
      </section>
    </>
  );
}

function QuizEditForm({
  initial,
  onCancel,
  onDone,
}: {
  initial: EditableQuiz;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    title: initial.title,
    description: initial.description,
    durationMinutes: initial.durationMinutes?.toString() ?? "",
    opensAt: toDateTimeLocal(initial.opensAt),
    closesAt: toDateTimeLocal(initial.closesAt),
    isPublished: initial.isPublished,
  });
  const update = trpc.school.admin.quizzes.update.useMutation({
    onSuccess: () => {
      toast.success("Quiz updated.");
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  return (
    <div className="border-b border-stone-100 bg-emerald-50/50 p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-800/55">
            Assessment settings
          </p>
          <h4 className="mt-1 font-display text-lg font-semibold">Edit quiz</h4>
        </div>
        <button
          onClick={onCancel}
          className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Quiz title">
          <Input
            value={form.title}
            onChange={event =>
              setForm(current => ({ ...current, title: event.target.value }))
            }
          />
        </Field>
        <Field label="Duration in minutes">
          <Input
            type="number"
            min="1"
            value={form.durationMinutes}
            onChange={event =>
              setForm(current => ({
                ...current,
                durationMinutes: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Opens at (optional)">
          <Input type="datetime-local" value={form.opensAt} onChange={event => setForm(current => ({ ...current, opensAt: event.target.value }))} />
        </Field>
        <Field label="Closes at (optional)">
          <Input type="datetime-local" value={form.closesAt} onChange={event => setForm(current => ({ ...current, closesAt: event.target.value }))} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="min-h-20 bg-white"
            />
          </Field>
        </div>
        <label className="flex w-fit items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-stone-700">
          <Switch
            checked={form.isPublished}
            onCheckedChange={value =>
              setForm(current => ({ ...current, isPublished: value }))
            }
          />
          Publish quiz
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} variant="ghost" className="rounded-xl">
          Cancel
        </Button>
        <Button
          disabled={update.isPending || !form.title}
          onClick={() =>
            update.mutate({
              id: initial.id,
              title: form.title,
              description: form.description || null,
              durationMinutes: form.durationMinutes
                ? Number(form.durationMinutes)
                : null,
              opensAt: form.opensAt ? new Date(form.opensAt).toISOString() : null,
              closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
              isPublished: form.isPublished,
            })
          }
          className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
        >
          {update.isPending && <Loader2 size={15} className="animate-spin" />}
          Save quiz
        </Button>
      </div>
    </div>
  );
}

function QuestionForm({
  quizId,
  sortOrder,
  initial,
  onCancel,
  onDone,
}: {
  quizId: number;
  sortOrder: number;
  initial?: EditableQuestion;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [options, setOptions] = useState(initial?.options ?? ["", "", "", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(
    initial?.correctAnswerIndex ?? 0
  );
  const [marks, setMarks] = useState(initial?.marks ?? 1);
  const create = trpc.school.admin.quizzes.questions.create.useMutation({
    onSuccess: () => {
      toast.success("Question added.");
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  const update = trpc.school.admin.quizzes.questions.update.useMutation({
    onSuccess: () => {
      toast.success("Question updated.");
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  const pending = create.isPending || update.isPending;
  const save = () => {
    const input = {
      quizId,
      question,
      options,
      correctAnswerIndex,
      marks,
      sortOrder,
    };
    if (initial) update.mutate({ id: initial.id, ...input });
    else create.mutate(input);
  };
  return (
    <div className="border-b border-stone-100 bg-stone-50/70 p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-800/55">
            Question {sortOrder + 1}
          </p>
          <h4 className="mt-1 font-display text-lg font-semibold">
            {initial ? "Edit question" : "Add a multiple-choice question"}
          </h4>
        </div>
        <button
          onClick={onCancel}
          className="grid size-8 place-items-center rounded-lg text-stone-400 hover:bg-white"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-4">
        <Field label="Question">
          <Textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder="Write a clear, single-focus question."
            className="min-h-20 bg-white"
          />
        </Field>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option, index) => (
          <label
            key={index}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5",
              correctAnswerIndex === index
                ? "border-emerald-300 ring-2 ring-emerald-100"
                : "border-stone-200"
            )}
          >
            <input
              type="radio"
              name={`correct-${initial?.id ?? "new"}`}
              checked={correctAnswerIndex === index}
              onChange={() => setCorrectAnswerIndex(index)}
              className="accent-emerald-800"
            />
            <Input
              value={option}
              onChange={event =>
                setOptions(current =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item
                  )
                )
              }
              placeholder={`Option ${String.fromCharCode(65 + index)}`}
              className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <Field label="Marks">
          <Input
            type="number"
            min="1"
            value={marks}
            onChange={event => setMarks(Number(event.target.value))}
            className="w-24 bg-white"
          />
        </Field>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="ghost" className="rounded-xl">
            Cancel
          </Button>
          <Button
            disabled={pending || !question || options.some(option => !option)}
            onClick={save}
            className="rounded-xl bg-emerald-900 hover:bg-emerald-800"
          >
            {pending && <Loader2 size={15} className="animate-spin" />}
            {initial ? "Save question" : "Add question"}
          </Button>
        </div>
      </div>
    </div>
  );
}
