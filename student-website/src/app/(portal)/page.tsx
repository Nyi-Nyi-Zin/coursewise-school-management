"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CirclePlay,
  ClipboardCheck,
  Clock3,
  Megaphone,
  PieChart,
  UserRound,
  X,
} from "lucide-react";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  demoAnnouncements,
  demoLessons,
  studentQueryKeys,
  type Announcement,
} from "@/lib/student-data";
import {
  getBatchQuizzes,
  getMyCertificates,
  getPublishedAnnouncements,
  getPublishedAssignments,
  getPublishedLessons,
  getStudentAssignmentSubmissions,
  getStudentProfile,
  getStudentQuizAttempts,
} from "@/lib/student-repository";
import { cn } from "@/lib/utils";

type DashboardTask = {
  id: string;
  title: string;
  date?: string | null;
  href: string;
  kind: "assignment" | "quiz";
};

const taskDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatTaskDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No due date"
    : taskDateFormatter.format(date);
}

export default function StudentHomePage() {
  const { user } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const [bannerIndex, setBannerIndex] = useState(0);
  const [selectedBanner, setSelectedBanner] = useState<Announcement | null>(null);

  const profile = useQuery({
    queryKey: ["student", "profile", user?.uid],
    queryFn: () => getStudentProfile(user!.uid),
    enabled: Boolean(user?.uid),
  });
  const lessons = useQuery({
    queryKey: [...studentQueryKeys.lessons, enrollment?.courseId],
    queryFn: () => getPublishedLessons(enrollment?.courseId),
    initialData: isFirebaseConfigured ? undefined : demoLessons,
    enabled: !isFirebaseConfigured || Boolean(enrollment),
  });
  const announcements = useQuery({
    queryKey: [
      ...studentQueryKeys.announcements,
      enrollment?.courseId,
      enrollment?.batchId,
    ],
    queryFn: () =>
      getPublishedAnnouncements(enrollment?.courseId, enrollment?.batchId),
    initialData: isFirebaseConfigured ? undefined : demoAnnouncements,
    enabled: !isFirebaseConfigured || Boolean(enrollment),
  });
  const quizzes = useQuery({
    queryKey: [
      ...studentQueryKeys.quizzes,
      enrollment?.courseId,
      enrollment?.batchId,
    ],
    queryFn: () => getBatchQuizzes(enrollment?.courseId, enrollment?.batchId),
    enabled: Boolean(enrollment),
  });
  const attempts = useQuery({
    queryKey: [
      "student",
      "quiz-attempts",
      user?.uid,
      enrollment?.courseId,
      enrollment?.batchId,
    ],
    queryFn: () =>
      getStudentQuizAttempts(
        user!.uid,
        enrollment?.courseId,
        enrollment?.batchId,
      ),
    enabled: Boolean(user?.uid && enrollment),
  });
  const assignments = useQuery({
    queryKey: [
      ...studentQueryKeys.assignments,
      enrollment?.courseId,
      enrollment?.batchId,
    ],
    queryFn: () =>
      getPublishedAssignments(enrollment?.courseId, enrollment?.batchId),
    enabled: Boolean(enrollment),
  });
  const submissions = useQuery({
    queryKey: [
      "student",
      "assignment-submissions",
      user?.uid,
      enrollment?.courseId,
      enrollment?.batchId,
    ],
    queryFn: () =>
      getStudentAssignmentSubmissions(
        user!.uid,
        enrollment?.courseId,
        enrollment?.batchId,
      ),
    enabled: Boolean(user?.uid && enrollment),
  });
  const certificates = useQuery({
    queryKey: ["student", "certificates", user?.uid],
    queryFn: () => getMyCertificates(),
    enabled: Boolean(user?.uid),
  });

  const banners: Announcement[] = announcements.data?.length
    ? announcements.data
    : demoAnnouncements;

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(
      () => setBannerIndex(index => (index + 1) % banners.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    if (!selectedBanner) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedBanner(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedBanner]);

  const name = profile.data?.name || user?.displayName || "Student";
  const studentId = profile.data?.studentId || "Pending";
  const photoUrl = profile.data?.photoUrl;
  const lessonItems = lessons.data ?? [];
  const completedLessons = lessonItems.filter(
    lesson => lesson.status === "complete",
  ).length;
  const quizItems = quizzes.data ?? [];
  const attemptedQuizIds = new Set(
    (attempts.data ?? []).map(attempt => attempt.quizId),
  );
  const upcomingQuizCount = quizItems.filter(
    quiz => !attemptedQuizIds.has(quiz.id),
  ).length;
  const assignmentItems = assignments.data ?? [];
  const submittedAssignmentIds = new Set(
    (submissions.data ?? []).map(submission => submission.assignmentId),
  );
  const submittedAssignments = assignmentItems.filter(assignment =>
    submittedAssignmentIds.has(assignment.id),
  ).length;
  const assignmentPercent = assignmentItems.length
    ? Math.round((submittedAssignments / assignmentItems.length) * 100)
    : 0;

  const assignmentTasks: DashboardTask[] = assignmentItems
    .filter(assignment => !submittedAssignmentIds.has(assignment.id))
    .map(assignment => ({
      id: `assignment-${assignment.id}`,
      title: assignment.title,
      date: assignment.dueAt,
      href: "/assignments",
      kind: "assignment",
    }));
  const quizTasks: DashboardTask[] = quizItems
    .filter(quiz => !attemptedQuizIds.has(quiz.id))
    .map(quiz => ({
      id: `quiz-${quiz.id}`,
      title: quiz.title,
      date: quiz.closesAt || quiz.opensAt,
      href: `/quizzes/take?id=${quiz.id}`,
      kind: "quiz",
    }));
  const tasks = [...assignmentTasks, ...quizTasks]
    .sort((left, right) => {
      if (!left.date) return 1;
      if (!right.date) return -1;
      return new Date(left.date).getTime() - new Date(right.date).getTime();
    })
    .slice(0, 3);

  const statCards = [
    {
      label: "Lessons completed",
      value: completedLessons,
      detail: `of ${lessonItems.length} lessons`,
      href: "/lessons",
      icon: BookOpen,
    },
    {
      label: "Upcoming quizzes",
      value: upcomingQuizCount,
      detail: "Ready to take",
      href: "/quizzes",
      icon: CalendarDays,
    },
    {
      label: "Assignment progress",
      value: `${assignmentPercent}%`,
      detail: `${submittedAssignments} of ${assignmentItems.length} submitted`,
      href: "/assignments",
      icon: PieChart,
    },
    {
      label: "Certificates earned",
      value: certificates.data?.length ?? 0,
      detail: "Keep going!",
      href: "/certificates",
      icon: Award,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="dashboard-hero relative overflow-hidden rounded-[22px] border border-slate-200 px-6 py-7 shadow-[0_8px_25px_rgba(15,23,42,0.04)] sm:px-9 sm:py-8 lg:min-h-[284px] lg:px-10 lg:py-7">
        <div className="dashboard-orbit dashboard-orbit-one" />
        <div className="dashboard-orbit dashboard-orbit-two" />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-4">
            <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-100 text-lg font-bold text-teal-800 ring-1 ring-white">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                  priority
                />
              ) : (
                name.slice(0, 1).toUpperCase()
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-teal-700 sm:text-base">
                Good morning, {name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Student ID · {studentId}
              </p>
            </div>
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
            Build your skills with focus.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            Your course content, practice, and upcoming milestones are in one
            place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/lessons"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.2)] transition hover:from-teal-800 hover:to-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              <CirclePlay className="size-[18px]" />
              Continue learning
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-teal-700/30 bg-white/70 px-5 text-sm font-semibold text-teal-800 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              <UserRound className="size-[18px]" />
              View profile
            </Link>
          </div>
        </div>
      </section>

      <section
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Learning overview"
      >
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_7px_22px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:min-h-[102px] sm:gap-4 sm:px-5 sm:py-4"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 sm:size-12">
                <Icon className="size-4 sm:size-6" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium text-slate-500 sm:text-xs">
                  {card.label}
                </span>
                <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:mt-1">
                  <strong className="text-xl leading-none tracking-tight text-slate-950 sm:text-2xl">
                    {card.value}
                  </strong>
                  <span className="text-[10px] text-slate-500 sm:text-xs">{card.detail}</span>
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.98fr_1.02fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_7px_22px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Megaphone className="size-5 text-teal-600" />
              Announcements
            </h2>
          </div>
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-emerald-100 bg-white">
            <div
              className="flex h-full transition-transform duration-700 ease-in-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
            >
              {banners.map(banner => (
                <article key={banner.id} className="relative h-full min-w-full">
                  {banner.bannerUrl ? (
                    <Image
                      src={banner.bannerUrl}
                      alt={banner.title}
                      fill
                      sizes="(max-width: 1023px) calc(100vw - 3rem), 50vw"
                      className="object-contain"
                    />
                  ) : null}
                  {!banner.bannerUrl ? (
                    <div className="flex h-full flex-col justify-center bg-gradient-to-r from-lime-50 via-emerald-50/70 to-teal-50 px-5">
                      <h3 className="text-lg font-bold text-slate-950">{banner.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{banner.description}</p>
                    </div>
                  ) : null}
                  {banner.bannerUrl ? (
                    <button
                      type="button"
                      onClick={() => setSelectedBanner(banner)}
                      aria-label={`View announcement: ${banner.title}`}
                      className="absolute inset-0 cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
                    />
                  ) : null}
                </article>
              ))}
            </div>
            {banners.length > 1 ? (
              <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    aria-label={`Show announcement ${index + 1}`}
                    onClick={() => setBannerIndex(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === bannerIndex
                        ? "w-5 bg-teal-600"
                        : "w-1.5 bg-teal-200 hover:bg-teal-300",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_7px_22px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ClipboardCheck className="size-5 text-teal-600" />
              Upcoming tasks
            </h2>
            <Link
              href="/assignments"
              className="text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            {tasks.length ? (
              tasks.map((task, index) => {
                const TaskIcon =
                  task.kind === "quiz" ? Clock3 : ClipboardCheck;
                return (
                  <Link
                    key={task.id}
                    href={task.href}
                    className={cn(
                      "grid min-h-11 grid-cols-[auto_1fr] items-center gap-3 px-3 py-2.5 text-xs transition hover:bg-slate-50 sm:grid-cols-[auto_1fr_9rem_auto]",
                      index > 0 && "border-t border-slate-200",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-lg",
                        task.kind === "quiz"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-teal-50 text-teal-600",
                      )}
                    >
                      <TaskIcon className="size-4" />
                    </span>
                    <span className="truncate font-medium text-slate-700">
                      {task.title}
                    </span>
                    <span className="hidden items-center gap-2 text-slate-500 sm:flex">
                      <CalendarDays className="size-3.5" />
                      {formatTaskDate(task.date)}
                    </span>
                    <span
                      className={cn(
                        "justify-self-start rounded-full px-2.5 py-1 font-medium sm:justify-self-end",
                        task.kind === "assignment"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-600",
                      )}
                    >
                      {task.kind === "assignment" ? "In progress" : "Upcoming"}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="flex min-h-[132px] flex-col items-center justify-center px-5 text-center">
                <span className="grid size-9 place-items-center rounded-full bg-teal-50 text-teal-600">
                  <ClipboardCheck className="size-4" />
                </span>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  You&apos;re all caught up
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  New assignments and quizzes will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      {selectedBanner?.bannerUrl ? (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/90 sm:flex sm:items-center sm:justify-center sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Announcement: ${selectedBanner.title}`}
          onMouseDown={event => {
            if (event.target === event.currentTarget) setSelectedBanner(null);
          }}
        >
          <div className="relative h-[100dvh] w-full sm:h-[calc(100dvh-4rem)] sm:max-w-5xl lg:h-[78dvh] lg:max-w-4xl">
            <Image
              src={selectedBanner.bannerUrl}
              alt={selectedBanner.title}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
            <button
              type="button"
              onClick={() => setSelectedBanner(null)}
              aria-label="Close announcement"
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-black/55 text-white shadow-lg transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
