"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutStudent } from "@/lib/auth-service";
import {
  getStudentProfile,
  getStudentQuizAttempts,
  uploadStudentPhoto,
} from "@/lib/student-repository";

const PASSING_SCORE = 80;

export default function ProfilePage() {
  const { user, firebaseActive } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profile = useQuery({
    queryKey: ["student", "profile", user?.uid],
    queryFn: () => getStudentProfile(user!.uid),
    enabled: Boolean(user?.uid),
  });
  const attempts = useQuery({
    queryKey: [
      "student",
      "profile-attempts",
      user?.uid,
      enrollment?.courseId,
      enrollment?.batchId,
    ],
    queryFn: () =>
      getStudentQuizAttempts(
        user!.uid,
        enrollment?.courseId,
        enrollment?.batchId
      ),
    enabled: Boolean(user?.uid && enrollment),
  });
  const photoUpload = useMutation({
    mutationFn: (file: File) => uploadStudentPhoto(user!.uid, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", "profile", user?.uid],
      });
      toast.success("Profile photo updated.");
    },
    onError: error =>
      toast.error(
        error instanceof Error ? error.message : "Could not update photo."
      ),
  });

  function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) photoUpload.mutate(file);
  }

  async function signOut() {
    await logoutStudent();
    toast.success("You have been signed out.");
    router.replace("/login");
  }

  const name = profile.data?.name || user?.displayName || "Student";
  const email = profile.data?.email || user?.email || "student@example.com";
  const studentId = profile.data?.studentId || "Pending";
  const joinedDate = formatJoinedDate(user?.metadata.creationTime);
  const scoredAttempts = attempts.data ?? [];
  const average = scoredAttempts.length
    ? Math.round(
        scoredAttempts.reduce(
          (sum, attempt) =>
            sum +
            (attempt.totalMarks
              ? (attempt.score / attempt.totalMarks) * 100
              : 0),
          0
        ) / scoredAttempts.length
      )
    : 0;
  const badgesEarned = scoredAttempts.filter(
    attempt =>
      attempt.totalMarks &&
      (attempt.score / attempt.totalMarks) * 100 >= PASSING_SCORE
  ).length;

  return (
    <section className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPhotoSelected}
      />

      <div className="profile-hero relative overflow-hidden rounded-[22px] px-5 py-7 text-white shadow-[0_16px_40px_rgba(6,78,75,0.16)] sm:px-8 lg:px-12 lg:py-8">
        <div className="profile-wave" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <div className="relative grid size-28 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-slate-200 to-slate-400 text-4xl font-bold text-teal-950 shadow-lg sm:size-36">
              {profile.data?.photoUrl ? (
                <Image
                  src={profile.data.photoUrl}
                  alt={`${name}'s profile`}
                  fill
                  sizes="(min-width: 640px) 144px, 112px"
                  className="object-cover"
                />
              ) : (
                name.slice(0, 1).toUpperCase()
              )}
            </div>
            <button
              type="button"
              aria-label="Change profile photo"
              disabled={!firebaseActive || photoUpload.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full border-4 border-white bg-white text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 sm:size-11"
            >
              {photoUpload.isPending ? (
                <span className="size-4 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
              ) : (
                <Camera className="size-5" />
              )}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {name}
            </h1>
            <p className="mt-2 text-base text-teal-50 sm:text-lg">
              Student ID · <span className="text-teal-200">{studentId}</span>
            </p>
            <div className="mt-3 h-px max-w-52 bg-white/35" />
            <p className="mt-3 flex items-center gap-2 text-sm text-teal-50">
              <CalendarDays className="size-4" />
              Joined on {joinedDate}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!firebaseActive || photoUpload.isPending}
            onClick={() => fileInputRef.current?.click()}
            className="self-start border-white/70 bg-white/5 text-white hover:bg-white/15 hover:text-white sm:self-center"
          >
            <Pencil className="size-4" />
            Edit profile
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <InfoCard
          title="Personal Information"
          icon={UserRound}
          className="lg:col-span-4"
        >
          <div className="space-y-3.5">
            <DetailRow icon={Mail} label="Email" value={email} />
            <DetailRow icon={UserRound} label="Full Name" value={name} />
            <DetailRow
              icon={GraduationCap}
              label="Student ID"
              value={studentId}
            />
            <DetailRow
              icon={CalendarDays}
              label="Member Since"
              value={joinedDate}
            />
          </div>
          <button
            type="button"
            disabled={!firebaseActive}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            View &amp; edit details <ArrowRight className="size-4" />
          </button>
        </InfoCard>

        <InfoCard
          title="Account Mode"
          icon={ShieldCheck}
          className="lg:col-span-4"
        >
          <FeaturePanel
            icon={ShieldCheck}
            title={firebaseActive ? "Firebase Authentication" : "Demo mode"}
            description={
              firebaseActive
                ? "You are signed in securely using Firebase Authentication."
                : "You are exploring the portal with local demo data."
            }
          />
        </InfoCard>

        <InfoCard
          title="Active Learning Batch"
          icon={GraduationCap}
          className="lg:col-span-4"
        >
          <FeaturePanel
            icon={BookOpen}
            title={
              enrollment
                ? `${enrollment.courseTitle} · ${enrollment.batchName}`
                : "Awaiting enrollment"
            }
            description={
              enrollment
                ? "You are currently enrolled in this learning batch."
                : "An administrator will assign your active learning batch."
            }
          />
        </InfoCard>

        <InfoCard
          title="Quiz / Performance Summary"
          icon={BarChart3}
          className="lg:col-span-8"
        >
          <div className="grid items-center gap-6 xl:grid-cols-[1.35fr_1.65fr]">
            <div className="flex items-center gap-5">
              <div className="grid size-24 shrink-0 place-items-center rounded-full border-[12px] border-slate-100 bg-white text-teal-800 shadow-inner">
                <ClipboardCheck className="size-8" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {scoredAttempts.length
                    ? "Your quiz progress"
                    : "No scored attempts"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {scoredAttempts.length
                    ? "Keep practicing to improve your average score."
                    : "You haven't completed any scored quizzes yet. Take your first quiz when you're ready."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <Metric
                icon={CheckCircle2}
                value={String(scoredAttempts.length)}
                label="Scored Attempts"
                tone="blue"
              />
              <Metric
                icon={Target}
                value={`${average}%`}
                label="Average Score"
                tone="red"
              />
              <Metric
                icon={Trophy}
                value={String(badgesEarned)}
                label="Badges Earned"
                tone="amber"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-center">
            <Link
              href="/quizzes"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
            >
              Explore Quizzes <ArrowRight className="size-4" />
            </Link>
          </div>
        </InfoCard>

        <InfoCard title="Security" icon={ShieldCheck} className="lg:col-span-4">
          <SecurityRow
            icon={KeyRound}
            title="Password"
            description="Secure password enabled"
            action="Reset password"
          />
          <div className="my-4 h-px bg-slate-100" />
          <SecurityRow
            icon={LockKeyhole}
            title="Account Security"
            description="Keep your account secure"
            action="Manage security"
          />
        </InfoCard>
      </div>

      <Card className="relative overflow-hidden border-slate-200 px-5 py-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)] sm:px-7">
        <div
          className="absolute -bottom-10 right-8 size-32 rounded-full bg-teal-50 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <Zap className="size-6" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Quick Actions</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Frequently used actions for your account
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={signOut}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
            <Link
              href="/forgot-password"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <KeyRound className="size-4" />
              Reset password
            </Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

function InfoCard({
  title,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`overflow-hidden border-slate-200 shadow-[0_6px_22px_rgba(15,23,42,0.04)] ${className ?? ""}`}
    >
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <span className="grid size-8 place-items-center rounded-full bg-teal-50 text-teal-800">
          <Icon className="size-[18px]" />
        </span>
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] items-center gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-slate-500">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="truncate font-medium text-slate-800" title={value}>
        {value}
      </span>
    </div>
  );
}

function FeaturePanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-40 items-center gap-5 rounded-2xl bg-gradient-to-br from-teal-50 to-slate-50 p-5">
      <span className="grid size-20 shrink-0 place-items-center rounded-full bg-teal-100/70 text-teal-700">
        <Icon className="size-10" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Award;
  value: string;
  label: string;
  tone: "blue" | "red" | "amber";
}) {
  const tones = {
    blue: "text-blue-600",
    red: "text-red-500",
    amber: "text-amber-500",
  };
  return (
    <div className="rounded-xl border border-slate-200 px-2 py-4 text-center sm:px-3">
      <Icon className={`mx-auto size-6 ${tones[tone]}`} />
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
        {label}
      </p>
    </div>
  );
}

function SecurityRow({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof KeyRound;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{description}</p>
      </div>
      <Link
        href="/forgot-password"
        className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {action}
      </Link>
    </div>
  );
}

function formatJoinedDate(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
