"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LockKeyhole,
  Play,
  Search,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/components/student-auth-provider";
import {
  EmptyPortalState,
  formatPortalDate,
  MetricCard,
  PortalPageHeader,
  PortalPanel,
  ProgressRing,
  StatusPill,
} from "@/components/portal-ui";
import {
  getBatchQuizzes,
  getStudentEnrollments,
  getStudentQuizAttempts,
  type BatchQuiz,
  type PrivateQuizAttempt,
} from "@/lib/student-repository";
import { isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type QuizFilter = "all" | "available" | "completed" | "upcoming";

const quizFilters: { value: QuizFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "completed", label: "Completed" },
  { value: "upcoming", label: "Upcoming" },
];

export default function QuizzesPage() {
  const { user } = useStudentAuth();
  const enrollments = useQuery({
    queryKey: ["student", "enrollments", user?.uid],
    queryFn: () => getStudentEnrollments(user!.uid),
    enabled: Boolean(user?.uid) || !isFirebaseConfigured,
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuizFilter>("all");
  const enabled = enrollments.isSuccess && (!isFirebaseConfigured || Boolean(user?.uid));
  const quizzes = useQuery({
    queryKey: ["student", "quizzes", user?.uid, enrollments.data],
    queryFn: async () => (await Promise.all((enrollments.data ?? []).map(enrollment => getBatchQuizzes(enrollment.courseId, enrollment.batchId)))).flat(),
    enabled,
    refetchOnWindowFocus: false,
  });
  const attempts = useQuery({
    queryKey: ["student", "quiz-attempts", user?.uid, enrollments.data],
    queryFn: async () => (await Promise.all((enrollments.data ?? []).map(enrollment => getStudentQuizAttempts(user!.uid, enrollment.courseId, enrollment.batchId)))).flat(),
    enabled: enabled && Boolean(user?.uid),
  });

  const quizItems = quizzes.data ?? [];
  const attemptItems = useMemo(() => attempts.data ?? [], [attempts.data]);
  const attemptsByQuiz = useMemo(() => {
    const grouped = new Map<string, PrivateQuizAttempt[]>();
    attemptItems.forEach(attempt => {
      grouped.set(attempt.quizId, [...(grouped.get(attempt.quizId) ?? []), attempt]);
    });
    return grouped;
  }, [attemptItems]);
  const bestAttempts = useMemo(() => Array.from(attemptsByQuiz.values()).map(items => items.reduce((best, attempt) => scorePercentage(attempt) > scorePercentage(best) ? attempt : best)), [attemptsByQuiz]);
  const completedCount = attemptsByQuiz.size;
  const availableCount = quizItems.filter(quiz => !attemptsByQuiz.has(quiz.id) && !isUpcoming(quiz)).length;
  const percentages = bestAttempts.map(scorePercentage);
  const averageScore = percentages.length
    ? Math.round(percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length)
    : 0;
  const bestScore = percentages.length ? Math.max(...percentages) : 0;
  const passedCount = bestAttempts.filter(attempt => {
    const quiz = quizItems.find(item => item.id === attempt.quizId);
    return scorePercentage(attempt) >= (quiz?.passingPercent ?? 70);
  }).length;

  const visibleQuizzes = quizItems.filter(quiz => {
    const status = quizStatus(quiz, attemptsByQuiz.has(quiz.id));
    const matchesFilter = filter === "all" || status === filter;
    const searchable = `${quiz.title} ${quiz.description} ${quiz.chapter ?? ""}`.toLowerCase();
    return matchesFilter && searchable.includes(query.trim().toLowerCase());
  });

  if (isFirebaseConfigured && enrollments.isSuccess && !enrollments.data.length) {
    return (
      <PortalPanel>
        <EmptyPortalState
          icon={LockKeyhole}
          title="Your quiz catalog is not available yet"
          description="Your account needs an active course and batch enrollment before quizzes are available."
        />
      </PortalPanel>
    );
  }

  return (
    <section className="min-w-0 pb-24 lg:pb-2">
      <PortalPageHeader
        eyebrow="Private assessment record · All enrolled courses"
        title="Quizzes"
        description="Track your quiz progress, attempt assessments, and review your performance."
      />

      <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Quiz summary">
        <MetricCard icon={ClipboardCheck} label="Available quizzes" value={availableCount} detail="Ready to attempt" />
        <MetricCard icon={CheckCircle2} label="Completed quizzes" value={completedCount} detail={`Out of ${quizItems.length} total`} />
        <MetricCard icon={BarChart3} label="Average score" value={`${averageScore}%`} detail="Across completed quizzes" />
        <MetricCard icon={Award} label="Best score" value={`${bestScore}%`} detail={bestScore ? "Your personal best" : "Complete a quiz to score"} />
      </div>

      {quizzes.isError || enrollments.isError ? (
        <PortalPanel className="mt-4 flex flex-wrap items-center justify-between gap-3 border-red-200 p-5 text-sm text-red-700">
          <span>{(quizzes.error ?? enrollments.error)?.message ?? "Quizzes could not be loaded. Check your connection, then try again."}</span>
          <Button variant="outline" size="sm" onClick={() => void (enrollments.isError ? enrollments.refetch() : quizzes.refetch())}>Retry</Button>
        </PortalPanel>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,0.95fr)]">
          <div className="min-w-0">
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto]">
              <label className="relative block">
                <span className="sr-only">Search quizzes</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search quizzes"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-0.5">
                {quizFilters.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    aria-pressed={filter === item.value}
                    className={cn(
                      "h-10 whitespace-nowrap rounded-lg px-4 text-xs font-medium transition sm:text-sm",
                      filter === item.value ? "bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-100" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {enrollments.isLoading || quizzes.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />)
              ) : visibleQuizzes.length ? (
                visibleQuizzes.map((quiz, index) => (
                  <QuizRow key={quiz.id} quiz={quiz} number={quizItems.indexOf(quiz) + 1 || index + 1} attempts={attemptsByQuiz.get(quiz.id) ?? []} />
                ))
              ) : (
                <PortalPanel>
                  <EmptyPortalState
                    icon={ClipboardCheck}
                    title={quizItems.length ? "No quizzes match your filters" : "No quizzes published yet"}
                    description={quizItems.length ? "Try another search term or choose a different status." : "New assessments assigned to your batch will appear here."}
                  />
                </PortalPanel>
              )}
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
            <PortalPanel className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
                <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
                  <Trophy className="size-5 text-teal-600" />Your quiz scores
                </h2>
                <span className="shrink-0 text-xs font-semibold text-teal-700">Best by quiz</span>
              </div>
              <div className="px-4 pb-4 sm:px-5">
                {attempts.isLoading ? (
                  <p className="py-8 text-center text-sm text-slate-500">Loading your attempts…</p>
                ) : attempts.isError ? (
                  <p className="py-8 text-center text-sm text-red-600">Your attempts could not be loaded.</p>
                ) : bestAttempts.length ? (
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="w-[38%] py-3 font-medium">Quiz</th><th className="w-[32%] py-3 text-right font-medium">Highest score</th><th className="w-[30%] py-3 text-right font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bestAttempts.slice(0, 6).map(attempt => {
                        const quiz = quizItems.find(item => item.id === attempt.quizId);
                        const percentage = scorePercentage(attempt);
                        const passed = percentage >= (quiz?.passingPercent ?? 70);
                        return (
                          <tr key={attempt.id} className="border-b border-slate-100 last:border-0">
                            <td className="truncate py-3 pr-2 text-slate-600">{quiz?.title ?? `Quiz ${attempt.quizId.slice(0, 6)}`}</td>
                            <td className="py-3 text-right font-semibold text-slate-800">{percentage}%</td>
                            <td className="py-3 text-right"><StatusPill tone={passed ? "teal" : "red"}>{passed ? "Passed" : "Needs review"}</StatusPill></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex min-h-36 flex-col items-center justify-center text-center"><Trophy className="size-7 text-slate-300" /><p className="mt-2 text-sm text-slate-500">No scored attempts yet.</p></div>
                )}
              </div>
            </PortalPanel>

            <PortalPanel className="p-5">
              <h2 className="text-sm font-semibold text-slate-900">Your performance</h2>
              <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
                <ProgressRing value={quizItems.length ? Math.round((completedCount / quizItems.length) * 100) : 0} />
                <div className="w-full flex-1 divide-y divide-slate-100 text-sm">
                  <PerformanceLine icon={ClipboardCheck} label="Attempted quizzes" value={`${completedCount} / ${quizItems.length}`} />
                  <PerformanceLine icon={CheckCircle2} label="Passed quizzes" value={`${passedCount} / ${completedCount}`} accent />
                  <PerformanceLine icon={BarChart3} label="Average score" value={`${averageScore}%`} />
                </div>
              </div>
            </PortalPanel>
          </aside>
        </div>
      )}
    </section>
  );
}

function QuizRow({ quiz, number, attempts }: { quiz: BatchQuiz; number: number; attempts: PrivateQuizAttempt[] }) {
  const upcoming = isUpcoming(quiz);
  const completed = attempts.length > 0;
  const bestScore = completed ? Math.max(...attempts.map(scorePercentage)) : 0;
  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,0.035)] sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center">
      <span className="grid size-12 place-items-center rounded-xl bg-teal-50 text-xl font-semibold text-teal-700">{String(number).padStart(2, "0")}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-slate-950">{quiz.title}</h2>
          <StatusPill tone={completed ? "teal" : upcoming ? "violet" : "teal"} icon={completed ? CheckCircle2 : upcoming ? CalendarDays : ClipboardCheck}>
            {completed ? "Completed" : upcoming ? "Upcoming" : "Available"}
          </StatusPill>
        </div>
        <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">{quiz.description || quiz.chapter || "Assessment for your current course module."}</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><ClipboardCheck className="size-3.5" />{quiz.totalMarks} marks</span>
          {quiz.kind === "final_exam" ? <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{quiz.durationMinutes} min</span> : null}
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{quiz.closesAt ? `Due ${formatPortalDate(quiz.closesAt, true)}` : "Self-paced"}</span>
          {completed ? <span className="font-semibold text-teal-700">Best score {bestScore}%</span> : null}
        </div>
      </div>
      <div className="sm:text-right">
        {upcoming ? (
          <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-500">Opens {formatPortalDate(quiz.opensAt, true)}</span>
        ) : quiz.kind === "final_exam" && !quiz.eligible ? (
          <div className="max-w-56 sm:text-right"><span className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-xs font-semibold text-amber-800"><LockKeyhole className="size-3.5" />Final locked</span><p className="mt-1 text-[11px] leading-4 text-amber-700">{quiz.lockReason}</p></div>
        ) : (
          <Link href={`/quizzes/take?id=${quiz.id}`} className={cn("inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition", completed ? "border border-teal-500 text-teal-700 hover:bg-teal-50" : "bg-teal-700 text-white shadow-sm hover:bg-teal-800")}>
            {quiz.kind === "final_exam" ? quiz.attemptCount ? "Retake final" : "Start final" : completed ? "Try again" : "Start quiz"}<Play className="size-3.5" fill="currentColor" />
          </Link>
        )}
      </div>
    </article>
  );
}

function PerformanceLine({ icon: Icon, label, value, accent = false }: { icon: typeof ClipboardCheck; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-teal-600"><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1 text-xs text-slate-600">{label}</span>
      <strong className={cn("text-sm text-slate-900", accent && "text-teal-700")}>{value}</strong>
    </div>
  );
}

function scorePercentage(attempt: PrivateQuizAttempt) {
  return attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 100) : 0;
}

function isUpcoming(quiz: BatchQuiz) {
  return Boolean(quiz.opensAt && new Date(quiz.opensAt).getTime() > Date.now());
}

function quizStatus(quiz: BatchQuiz, completed: boolean): QuizFilter {
  if (completed) return "completed";
  return isUpcoming(quiz) ? "upcoming" : "available";
}
