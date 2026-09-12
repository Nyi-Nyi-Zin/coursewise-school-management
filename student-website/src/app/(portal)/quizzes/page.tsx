"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  LockKeyhole,
  Play,
  Search,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCourseBatchSelection } from "@/components/course-batch-selector";
import { useStudentAuth } from "@/components/student-auth-provider";
import {
  EmptyPortalState,
  formatPortalDate,
  MetricCard,
  PortalPanel,
  StatusPill,
} from "@/components/portal-ui";
import {
  getQuizCatalogPage,
  type BatchQuiz,
} from "@/lib/student-repository";
import { isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";

import type { QuizFilter } from "@/lib/quiz-catalog";
import { getUserFacingErrorMessage } from "../../../../../shared/user-facing-errors";

const quizFilters: { value: QuizFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "completed", label: "Completed" },
  { value: "upcoming", label: "Upcoming" },
];

export default function QuizzesPage() {
  const { user } = useStudentAuth();
  const { enrollment, enrollments, enrollmentsQuery, selectionReady } = useCourseBatchSelection();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuizFilter>("all");
  const [page, setPage] = useState(0);
  const enabled = selectionReady && Boolean(enrollment) && (!isFirebaseConfigured || Boolean(user?.uid));
  const quizzes = useQuery({
    queryKey: ["student", "quizzes", user?.uid, enrollment?.courseId, enrollment?.batchId, page, query, filter],
    queryFn: () => getQuizCatalogPage({ enrollments: enrollment ? [enrollment] : [], page, query, filter }),
    enabled,
    refetchOnWindowFocus: false,
  });
  const quizItems = quizzes.data?.quizzes ?? [];
  const summary = quizzes.data?.summary;
  const totalCount = summary?.total ?? 0;
  const completedCount = summary?.completed ?? 0;
  const availableCount = summary?.available ?? 0;
  const averageScore = summary?.averageScore ?? 0;
  const bestScore = summary?.bestScore ?? 0;
  const scores = quizzes.data?.scores ?? [];
  const total = quizzes.data?.total ?? 0;
  const pageSize = quizzes.data?.pageSize ?? 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const activePage = quizzes.data?.page ?? page;
  const pageStart = activePage * pageSize;

  if (isFirebaseConfigured && enrollmentsQuery.isSuccess && !enrollments.length) {
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
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-[-0.04em] text-slate-950">Quizzes</h1>
      </header>
      <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Quiz summary">
        <MetricCard icon={ClipboardCheck} label="Available quizzes" value={availableCount} detail="Ready to attempt" />
        <MetricCard icon={CheckCircle2} label="Completed quizzes" value={completedCount} detail={`Out of ${totalCount} total`} />
        <MetricCard icon={BarChart3} label="Average score" value={`${averageScore}%`} detail="Across completed quizzes" />
        <MetricCard icon={Award} label="Best score" value={`${bestScore}%`} detail={bestScore ? "Your personal best" : "Complete a quiz to score"} />
      </div>

      {quizzes.isError || enrollmentsQuery.isError ? (
        <PortalPanel className="mt-4 flex flex-wrap items-center justify-between gap-3 border-red-200 p-5 text-sm text-red-700">
          <span>{getUserFacingErrorMessage(quizzes.error ?? enrollmentsQuery.error, "Quizzes could not be loaded. Check your connection, then try again.")}</span>
          <Button variant="outline" size="sm" disabled={enrollmentsQuery.isFetching || quizzes.isFetching} onClick={() => void (enrollmentsQuery.isError ? enrollmentsQuery.refetch() : quizzes.refetch())}>{enrollmentsQuery.isFetching || quizzes.isFetching ? "Retrying..." : "Retry"}</Button>
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
                  maxLength={200}
                  value={query}
                  onChange={event => { setQuery(event.target.value); setPage(0); }}
                  placeholder="Search quizzes"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-0.5">
                {quizFilters.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => { setFilter(item.value); setPage(0); }}
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
              {enrollmentsQuery.isLoading || quizzes.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />)
              ) : quizItems.length ? (
                quizItems.map((quiz, index) => (
                  <QuizRow key={quiz.id} quiz={quiz} number={pageStart + index + 1} />
                ))
              ) : (
                <PortalPanel>
                  <EmptyPortalState
                    icon={ClipboardCheck}
                    title={totalCount ? "No quizzes match your filters" : "No quizzes published yet"}
                    description={totalCount ? "Try another search term or choose a different status." : "New assessments assigned to your batch will appear here."}
                  />
                </PortalPanel>
              )}
            </div>
            {!enrollmentsQuery.isLoading && !quizzes.isLoading && pageCount > 1 ? (
              <nav aria-label="Quiz pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500" role="status">
                  Showing {pageStart + 1}-{pageStart + quizItems.length} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={activePage === 0} onClick={() => setPage(activePage - 1)}>
                    <ChevronLeft className="size-4" />Previous
                  </Button>
                  <span className="whitespace-nowrap text-xs tabular-nums text-slate-600">Page {activePage + 1} of {pageCount}</span>
                  <Button variant="outline" size="sm" disabled={activePage === pageCount - 1} onClick={() => setPage(activePage + 1)}>
                    Next<ChevronRight className="size-4" />
                  </Button>
                </div>
              </nav>
            ) : null}
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
                {quizzes.isLoading ? (
                  <p className="py-8 text-center text-sm text-slate-500">Loading your attempts…</p>
                ) : quizzes.isError ? (
                  <p className="py-8 text-center text-sm text-red-600">Your attempts could not be loaded.</p>
                ) : scores.length ? (
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="w-[38%] py-3 font-medium">Quiz</th><th className="w-[32%] py-3 text-right font-medium">Highest score</th><th className="w-[30%] py-3 text-right font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map(score => {
                        const { percentage, passed } = score;
                        return (
                          <tr key={score.id} className="border-b border-slate-100 last:border-0">
                            <td className="truncate py-3 pr-2 text-slate-600">{score.title}</td>
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

          </aside>
        </div>
      )}
    </section>
  );
}

function QuizRow({ quiz, number }: { quiz: BatchQuiz; number: number }) {
  const upcoming = isUpcoming(quiz);
  const completed = quiz.attemptCount > 0;
  const bestScore = quiz.bestPercentage;
  const retakesLeft = remainingRetakes(quiz);
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
          <span className="font-semibold text-slate-700">{retakesLeft === null ? "Unlimited retakes" : `${retakesLeft} retake${retakesLeft === 1 ? "" : "s"} left`}</span>
        </div>
      </div>
      <div className="sm:text-right">
        {upcoming ? (
          <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-500">Opens {formatPortalDate(quiz.opensAt, true)}</span>
        ) : !quiz.eligible ? (
          <div className="max-w-56 sm:text-right"><span className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-xs font-semibold text-amber-800"><LockKeyhole className="size-3.5" />{quiz.kind === "final_exam" ? "Final locked" : "Quiz locked"}</span><p className="mt-1 text-[11px] leading-4 text-amber-700">{quiz.lockReason}</p></div>
        ) : (
          <Link href={`/quizzes/take?id=${quiz.id}`} className={cn("inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition", completed ? "border border-teal-500 text-teal-700 hover:bg-teal-50" : "bg-teal-700 text-white shadow-sm hover:bg-teal-800")}>
            {quiz.kind === "final_exam" ? quiz.attemptCount ? "Retake final" : "Start final" : completed ? "Try again" : "Start quiz"}<Play className="size-3.5" fill="currentColor" />
          </Link>
        )}
      </div>
    </article>
  );
}

function isUpcoming(quiz: BatchQuiz) {
  return Boolean(quiz.opensAt && new Date(quiz.opensAt).getTime() > Date.now());
}

function remainingRetakes(quiz: BatchQuiz) {
  if (quiz.maxRetakes === undefined || quiz.maxRetakes < 0) return null;
  return Math.max(0, quiz.maxRetakes - Math.max(0, quiz.attemptCount - 1));
}
