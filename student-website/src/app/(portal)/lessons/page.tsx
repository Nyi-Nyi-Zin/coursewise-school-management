"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  PieChart,
  Search,
  Send,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStudentCourse } from "@/components/student-course-provider";
import { demoLessons, studentQueryKeys, type Lesson } from "@/lib/student-data";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getPublishedLessons } from "@/lib/student-repository";
import { cn } from "@/lib/utils";

type LessonFilter = "all" | "continue" | "complete" | "new";
type LessonSort = "order" | "title" | "duration";

const filters: { value: LessonFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "continue", label: "In progress" },
  { value: "complete", label: "Completed" },
  { value: "new", label: "Upcoming" },
];

export default function LessonsPage() {
  const { enrollment } = useStudentCourse();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LessonFilter>("all");
  const [sort, setSort] = useState<LessonSort>("order");
  const { data: lessons = [], isLoading, isError, refetch } = useQuery({
    queryKey: [...studentQueryKeys.lessons, enrollment?.courseId],
    queryFn: () => getPublishedLessons(enrollment?.courseId),
    initialData: isFirebaseConfigured ? undefined : demoLessons,
    enabled: !isFirebaseConfigured || Boolean(enrollment),
  });

  const completedLessons = lessons.filter(lesson => lesson.status === "complete").length;
  const progress = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;
  const nextLesson = lessons.find(lesson => lesson.status === "continue") ?? lessons.find(lesson => lesson.status === "new");
  const visibleLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return lessons
      .map((lesson, index) => ({ lesson, index }))
      .filter(({ lesson }) => {
        const matchesFilter = filter === "all" || lesson.status === filter;
        const matchesQuery = !normalizedQuery || `${lesson.title} ${lesson.description} ${lesson.module}`.toLowerCase().includes(normalizedQuery);
        return matchesFilter && matchesQuery;
      })
      .sort((left, right) => {
        if (sort === "title") return left.lesson.title.localeCompare(right.lesson.title);
        if (sort === "duration") return durationMinutes(left.lesson.duration) - durationMinutes(right.lesson.duration);
        return left.index - right.index;
      })
      .map(({ lesson }) => lesson);
  }, [filter, lessons, query, sort]);

  return (
    <section className="pb-2">
      <header className="text-center">
        <p className="text-sm font-semibold text-teal-700">
          Learning library{enrollment ? ` · ${enrollment.batchName}` : ""}
        </p>
        <h1 className="mt-1 text-4xl font-bold tracking-[-0.04em] text-slate-950">Lessons</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Explore published lesson materials assigned to your course and batch.<br className="hidden sm:block" /> Learn at your pace and build real-world skills.
        </p>
      </header>

      {isError ? <ErrorBanner message="Lessons could not be loaded." onRetry={() => void refetch()} /> : null}

      <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Lesson progress">
        <StatCard icon={BookOpen} label="Total lessons" value={lessons.length} detail="Lessons available" />
        <StatCard icon={CheckCircle2} label="Completed lessons" value={completedLessons} detail={`${progress}% of total`} />
        <StatCard icon={PieChart} label="Overall progress" value={`${progress}%`} progress={progress} />
        <StatCard icon={CalendarDays} label="Next lesson" value={nextLesson?.title ?? "All caught up"} detail={nextLesson ? "Up next" : "Course complete"} compact />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_7px_22px_rgba(15,23,42,0.035)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search lessons</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search lessons"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <div className="flex min-w-0 items-center gap-2 overflow-x-auto" aria-label="Filter lessons">
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">Status</span>
            <div className="flex rounded-xl border border-slate-200 p-0.5">
              {filters.map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={filter === item.value}
                  className={cn(
                    "h-9 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition sm:px-4 sm:text-sm",
                    filter === item.value ? "bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-200" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={event => setSort(event.target.value as LessonSort)}
              className="h-11 min-w-36 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              <option value="order">Lesson order</option>
              <option value="title">Title</option>
              <option value="duration">Duration</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />)
          : visibleLessons.map((lesson, index) => <LessonCard key={lesson.id} lesson={lesson} number={lessons.indexOf(lesson) + 1 || index + 1} />)}
      </div>

      {!isLoading && lessons.length > 0 && visibleLessons.length === 0 ? (
        <EmptyState title="No lessons match your filters." description="Try another search term or choose a different lesson status." />
      ) : isFirebaseConfigured && !enrollment && !isLoading ? (
        <EmptyState title="You are not assigned to a learning batch yet." description="Ask an administrator to enroll your Firebase account in a course and batch." />
      ) : !isError && !isLoading && lessons.length === 0 ? (
        <EmptyState title="No lessons have been published yet." description="Your instructor will add learning material here." />
      ) : null}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, detail, progress, compact = false }: { icon: typeof BookOpen; label: string; value: string | number; detail?: string; progress?: number; compact?: boolean }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_7px_22px_rgba(15,23,42,0.035)] sm:min-h-28 sm:gap-4 sm:px-5 sm:py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-600 sm:size-14">
        <Icon className="size-5 sm:size-7" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-slate-500 sm:text-xs">{label}</p>
        <p className={cn("mt-0.5 font-bold leading-tight text-slate-950 sm:mt-1", compact ? "truncate text-sm sm:text-base" : "text-xl sm:text-2xl")}>{value}</p>
        {detail ? <p className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">{detail}</p> : null}
        {typeof progress === "number" ? (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 sm:mt-2">
            <div className="h-full rounded-full bg-teal-600 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LessonCard({ lesson, number }: { lesson: Lesson; number: number }) {
  const resources = [
    { href: lesson.telegramUrl, label: "Telegram", icon: Send },
    { href: lesson.videoUrl, label: "Video", icon: Video },
    { href: lesson.pdfUrl, label: "PDF", icon: FileText },
  ].filter((resource): resource is { href: string; label: string; icon: typeof Send } => Boolean(resource.href));
  const inProgress = lesson.status === "continue";
  const complete = lesson.status === "complete";
  const lessonProgress = complete ? 100 : inProgress ? 60 : 0;
  const primaryResource = resources[0];

  return (
    <article className={cn(
      "relative flex min-h-40 flex-col rounded-2xl border bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:shadow-md",
      inProgress ? "border-teal-300 bg-gradient-to-br from-teal-50/70 via-white to-white" : "border-slate-200",
    )}>
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-xl font-semibold text-teal-700">
          {String(number).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1 pr-20">
          {inProgress ? <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">Resume learning</p> : null}
          <h2 className="text-base font-semibold leading-5 text-slate-950">{lesson.title}</h2>
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{lesson.description}</p>
        </div>
        <StatusBadge status={lesson.status} />
      </div>

      {inProgress ? (
        <div className="ml-[60px] mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-600" style={{ width: `${lessonProgress}%` }} /></div>
          <span className="text-xs font-semibold text-slate-600">{lessonProgress}%</span>
        </div>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{lesson.duration || "Self-paced"}</span>
          <span className="inline-flex items-center gap-1.5"><FileText className="size-4" />{resources.length} {resources.length === 1 ? "resource" : "resources"}</span>
          {resources.length > 1 ? resources.map(resource => {
            const Icon = resource.icon;
            return <a key={resource.label} href={resource.href} target="_blank" rel="noreferrer" aria-label={`Open ${resource.label} resource for ${lesson.title}`} title={resource.label} className="text-slate-400 transition hover:text-teal-700"><Icon className="size-4" /></a>;
          }) : null}
        </div>
        {primaryResource ? (
          <a href={primaryResource.href} target="_blank" rel="noreferrer" className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-teal-500/70 px-4 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
            {inProgress ? "Continue" : "Start lesson"}
          </a>
        ) : (
          <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-400">No resources</span>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: Lesson["status"] }) {
  if (status === "complete") return <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-700"><Check className="size-3" />Completed</span>;
  if (status === "continue") return <span className="absolute right-3 top-3 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">In progress</span>;
  return <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600"><Clock3 className="size-3" />Upcoming</span>;
}

function durationMinutes(duration: string) {
  const value = Number.parseInt(duration, 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card className="mt-7 border-red-500/40"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-red-700"><span>{message} Check your connection, then try again.</span><Button variant="outline" size="sm" onClick={onRetry}>Retry</Button></CardContent></Card>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><BookOpen className="size-8 text-teal-600" /><h2 className="mt-4 font-semibold text-slate-900">{title}</h2><p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p></div>;
}
