"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowLeft,
  Award,
  CheckCircle2,
  CircleCheckBig,
  ClipboardCheck,
  Clock3,
  Lightbulb,
  ListChecks,
  RotateCcw,
  ShieldAlert,
  Star,
  Trophy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getMyQuizResults,
  getQuizMeta,
  getQuizQuestions,
  submitQuizAttempt,
  type QuestionReviewItem,
  type QuizQuestion,
  type QuizQuestionType,
  type QuizSubmissionResult,
} from "@/lib/student-repository";
import { AssessmentRunner } from "@/components/assessment-runner";

type AnswerMap = Record<string, number[]>;

export default function TakeQuizPage() {
  return (
    <Suspense
      fallback={
        <Card className="mt-8">
          <CardContent className="p-6 text-slate-500">Loading quiz…</CardContent>
        </Card>
      }
    >
      <AssessmentRunner />
    </Suspense>
  );
}

function TakeQuizContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const quizId = searchParams.get("id") ?? "";
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const autoSubmittedRef = useRef(false);
  const questionRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const meta = useQuery({
    queryKey: ["student", "quiz-meta", quizId],
    queryFn: () => getQuizMeta(quizId),
    enabled: Boolean(quizId),
  });
  const questions = useQuery({
    queryKey: ["student", "quiz-questions", quizId],
    queryFn: () => getQuizQuestions(quizId),
    enabled: Boolean(quizId),
  });
  const previous = useQuery({
    queryKey: ["student", "quiz-results", quizId],
    queryFn: () => getMyQuizResults(quizId),
    enabled: Boolean(quizId),
  });

  const isExam = meta.data?.kind === "final_exam";
  const durationSeconds = Math.max(
    0,
    Math.round((meta.data?.durationMinutes ?? 0) * 60),
  );
  const items = questions.data ?? [];
  const totalMarks = items.reduce((sum, q) => sum + q.marks, 0);
  // Only final exams are timed. Chapter quizzes have no countdown or
  // auto-submit, so students may complete them at their own pace.
  const timingEnabled = isExam && Boolean(durationSeconds > 0 && !result && items.length > 0);

  useEffect(() => {
    if (!timingEnabled) return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [timingEnabled]);

  const startedAt = items.length > 0 ? questions.dataUpdatedAt || null : null;
  const remainingSeconds = timingEnabled && startedAt
    ? Math.max(
        0,
        durationSeconds - Math.round((nowTick - startedAt) / 1000),
      )
    : null;

  const submission = useMutation({
    mutationFn: () =>
      submitQuizAttempt(quizId, `${quizId}_legacy`, buildSubmission(items, answers)),
    onSuccess: (outcome) => {
      setResult(outcome);
      queryClient.invalidateQueries({ queryKey: ["student", "quiz-attempts"] });
      queryClient.invalidateQueries({
        queryKey: ["student", "quiz-results", quizId],
      });
      toast.success(
        isExam
          ? "Your exam was submitted and graded."
          : "Your answers were submitted.",
      );
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit your answers.",
      ),
  });

  const timeUp =
    timingEnabled && remainingSeconds !== null && remainingSeconds <= 0;
  useEffect(() => {
    if (!timeUp || autoSubmittedRef.current || submission.isPending || result)
      return;
    autoSubmittedRef.current = true;
    toast.info("Time is up. Your exam was submitted automatically.");
    submission.mutate();
  }, [timeUp, submission, result]);

  const answeredCount = items.filter(
    (q) => (answers[q.id]?.length ?? 0) > 0,
  ).length;
  const progressPercent = items.length
    ? Math.round((answeredCount / items.length) * 100)
    : 0;

  const answeredSet = useMemo(() => {
    const set = new Set<string>();
    items.forEach((q) => {
      if ((answers[q.id]?.length ?? 0) > 0) set.add(q.id);
    });
    return set;
  }, [items, answers]);

  const scrollToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    questionRefs.current.get(index)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (!quizId)
    return (
      <EmptyQuizState
        title="No assessment selected."
        description="Pick a quiz or exam from the Quizzes page."
      />
    );

  if (result)
    return (
      <ResultCard
        result={result}
        onRetake={() => {
          setResult(null);
          setAnswers({});
          autoSubmittedRef.current = false;
          queryClient.invalidateQueries({
            queryKey: ["student", "quiz-questions", quizId],
          });
        }}
        retakeAllowed={!isExam}
        remainingAttempts={result.remainingAttempts}
      />
    );

  const gateBlocked = Boolean(
    previous.data &&
      isExam &&
      (previous.data.passed ||
        (previous.data.remainingAttempts !== null &&
          previous.data.remainingAttempts <= 0)),
  );

  if (gateBlocked) {
    const summary = previous.data!;
    return (
      <section className="mx-auto max-w-xl">
        <Card>
          <CardContent className="grid place-items-center p-8 text-center">
            {summary.passed ? (
              <Trophy className="size-10 text-teal-600" />
            ) : (
              <ShieldAlert className="size-10 text-amber-500" />
            )}
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              {summary.passed ? "Final exam passed" : "No attempts remain"}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {summary.passed
                ? `You already passed this final exam with your best score of ${summary.bestPercentage}%.`
                : "You have used every attempt allowed for this final exam. Contact your instructor to request another try."}
            </p>
            {summary.latest ? (
              <p className="mt-4 text-sm text-slate-500">
                Latest score: {summary.latest.percentage}% · Attempts used:{" "}
                {summary.attemptCount}
              </p>
            ) : null}
            <Link
              href="/quizzes"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ClipboardCheck className="size-4" />
              Back to quizzes
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  const statusLabel = isExam ? "Final exam" : "Chapter quiz";

  return (
    <section>
      <Link
        href="/quizzes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        <ArrowLeft className="size-4" />
        All quizzes
      </Link>

      <p className="mt-4 text-sm font-medium text-teal-700">
        {isExam
          ? "Final exam · answers are not shown after grading"
          : "Chapter quiz · graded instantly with answer review"}
      </p>

      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {meta.isLoading
          ? "Loading…"
          : meta.data?.title ?? "Take quiz"}
        {meta.data?.chapter ? (
          <span className="ml-2 align-middle text-base font-medium text-slate-500">
            · {meta.data.chapter}
          </span>
        ) : null}
      </h1>

      <p className="mt-3 max-w-2xl text-slate-500">
        {isExam
          ? `Score ${meta.data?.passingPercent ?? 50}% or higher to pass${durationSeconds > 0 ? ` within ${formatDuration(durationSeconds)}` : ""}. The exam submits itself when the timer runs out.${previous.data ? ` Attempt ${previous.data.attemptCount + (previous.data.remainingAttempts === 0 ? 0 : 1)}${previous.data.remainingAttempts !== null ? ` of ${previous.data.attemptCount + previous.data.remainingAttempts}` : ""}.` : ""}`
          : "Answer every question, then submit once. Scoring happens on the server and your attempt is recorded immediately."}
      </p>

      {questions.isLoading ? (
        <Card className="mt-8">
          <CardContent className="p-6 text-slate-500">
            Loading questions…
          </CardContent>
        </Card>
      ) : !items.length ? (
        <div className="mt-8">
          <EmptyQuizState
            title="This assessment has no published questions yet."
            description="Please check back later or contact your instructor."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon={ListChecks}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              value={items.length}
              label="Questions"
            />
            <StatCard
              icon={Star}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
              value={totalMarks}
              label="Total marks"
            />
            {isExam ? (
              <StatCard
                icon={Clock3}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
                value={meta.data?.durationMinutes ? `${meta.data.durationMinutes} min` : "—"}
                label="Time limit"
              />
            ) : null}
            <StatCard
              icon={RotateCcw}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
              value={previous.data ? previous.data.attemptCount : 0}
              label="Attempts"
            />
            <StatCard
              icon={CheckCircle2}
              iconColor="text-teal-600"
              iconBg="bg-teal-50"
              value="In progress"
              label="Status"
              isText
            />
          </div>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 flex-1">
              <div className="space-y-4">
                {items.map((question, index) => (
                  <div
                    key={question.id}
                    ref={(el) => {
                      questionRefs.current.set(index, el);
                    }}
                  >
                    <QuestionCard
                      index={index + 1}
                      question={question}
                      selected={answers[question.id] ?? []}
                      onToggle={(optionIndex) =>
                        setAnswers((current) =>
                          toggleSelection(current, question, optionIndex),
                        )
                      }
                    />
                  </div>
                ))}
              </div>

              <Card className="mt-6 border-slate-200 shadow-sm">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <p className="text-sm font-medium text-slate-600">
                    {answeredCount} of {items.length} answered
                  </p>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-500">
                    {progressPercent}%
                  </span>
                  <Button
                    disabled={submission.isPending || answeredCount !== items.length}
                    onClick={() => setConfirming(true)}
                    className="ml-auto"
                  >
                    {submission.isPending ? "Submitting…" : "Review & Submit"}
                    {!submission.isPending && (
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                      </svg>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <aside className="w-full shrink-0 space-y-4 lg:w-72">
              {timingEnabled && remainingSeconds !== null ? (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <AlarmClock
                        className={cn(
                          "size-4",
                          remainingSeconds <= 60
                            ? "text-red-500"
                            : "text-teal-600",
                        )}
                      />
                      Time remaining
                    </div>
                    <p
                      className={cn(
                        "mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight",
                        remainingSeconds <= 60
                          ? "text-red-600"
                          : "text-slate-900",
                      )}
                    >
                      {formatDuration(remainingSeconds)}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          remainingSeconds <= 60 ? "bg-red-500" : "bg-teal-500",
                        )}
                        style={{
                          width: `${durationSeconds > 0 ? (remainingSeconds / durationSeconds) * 100 : 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatDuration(durationSeconds)} total
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Progress
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-teal-50 p-3 text-center">
                      <p className="text-2xl font-bold text-teal-700">
                        {answeredCount}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-teal-600">
                        Answered
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-2xl font-bold text-slate-600">
                        {items.length - answeredCount}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        Unanswered
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Question navigator
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map((question, index) => {
                      const isAnswered = answeredSet.has(question.id);
                      const isCurrent = index === currentQuestionIndex;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => scrollToQuestion(index)}
                          className={cn(
                            "grid size-10 place-items-center rounded-xl border-2 text-sm font-semibold transition",
                            isAnswered
                              ? "border-teal-600 bg-teal-600 text-white"
                              : isCurrent
                                ? "border-teal-400 bg-white text-teal-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                          )}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-teal-600" />
                      Answered
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full border-2 border-teal-400 bg-white" />
                      Current
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full border-2 border-slate-200 bg-white" />
                      Unanswered
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-teal-600" />
                  <p className="text-xs leading-5 text-teal-700">
                    You can click on any question number to go back and review.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}

      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm submission"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
        >
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-slate-900">
                {isExam ? "Submit your final exam?" : "Submit your answers?"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                You answered all {items.length} questions. Your attempt cannot
                be edited afterward.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirming(false)}>
                  Go back
                </Button>
                <Button
                  disabled={submission.isPending}
                  onClick={() => {
                    setConfirming(false);
                    submission.mutate();
                  }}
                >
                  {submission.isPending ? "Submitting…" : "Submit now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  value,
  label,
  isText = false,
}: {
  icon: typeof ListChecks;
  iconColor: string;
  iconBg: string;
  value: number | string;
  label: string;
  isText?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            iconBg,
          )}
        >
          <Icon className={cn("size-5", iconColor)} />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-bold text-slate-900",
              isText ? "text-sm" : "text-xl",
            )}
          >
            {value}
          </p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function toggleSelection(
  current: AnswerMap,
  question: QuizQuestion,
  optionIndex: number,
): AnswerMap {
  const multi = question.type === "multiple_select";
  const currentSelection = current[question.id] ?? [];
  const next = multi
    ? currentSelection.includes(optionIndex)
      ? currentSelection.filter((value) => value !== optionIndex)
      : [...currentSelection, optionIndex]
    : currentSelection.length === 1 && currentSelection[0] === optionIndex
      ? []
      : [optionIndex];
  return { ...current, [question.id]: next };
}

function buildSubmission(items: QuizQuestion[], answers: AnswerMap) {
  return items.map((question) => {
    const selection = answers[question.id] ?? [];
    return question.type === "multiple_select"
      ? {
          questionId: question.id,
          selectedAnswerIndex: -1,
          selectedIndices: [...selection].sort((a, b) => a - b),
        }
      : { questionId: question.id, selectedAnswerIndex: selection[0] ?? -1 };
  });
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const typeLabel: Record<QuizQuestionType, string> = {
  multiple_choice: "Choose one",
  multiple_select: "Multiple choice",
  true_false: "True or False",
};

const typeBadgeLabel: Record<QuizQuestionType, string> = {
  multiple_choice: "Multiple choice",
  multiple_select: "Multiple choice",
  true_false: "True or False",
};

function QuestionCard({
  question,
  index,
  selected,
  onToggle,
}: {
  question: QuizQuestion;
  index: number;
  selected: number[];
  onToggle: (optionIndex: number) => void;
}) {
  const isMulti = question.type === "multiple_select";
  return (
    <Card>
      <CardContent className="p-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-sm font-bold text-teal-700">
              {index}
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">
                {question.prompt}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {question.type
                  ? typeLabel[question.type]
                  : typeLabel.multiple_choice}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
              {question.marks} {question.marks === 1 ? "mark" : "marks"}
            </Badge>
            <Badge className="bg-teal-50 text-teal-800 ring-teal-200">
              {question.type
                ? typeBadgeLabel[question.type]
                : typeBadgeLabel.multiple_choice}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {question.options.map((option, optionIndex) => {
            const isSelected = selected.includes(optionIndex);
            return (
              <button
                key={optionIndex}
                type="button"
                onClick={() => onToggle(optionIndex)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                  isSelected
                    ? "border-teal-500 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-400 hover:bg-white",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border-2",
                    isMulti
                      ? cn(
                          "rounded-md",
                          isSelected
                            ? "border-teal-600 bg-teal-600"
                            : "border-slate-300",
                        )
                      : isSelected
                        ? "border-teal-600"
                        : "border-slate-300",
                  )}
                >
                  {isSelected ? (
                    isMulti ? (
                      <svg
                        className="size-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="size-2.5 rounded-full bg-teal-600" />
                    )
                  ) : null}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultCard({
  result,
  onRetake,
  retakeAllowed,
  remainingAttempts,
}: {
  result: QuizSubmissionResult;
  onRetake: () => void;
  retakeAllowed: boolean;
  remainingAttempts: number | null;
}) {
  return (
    <section className="mx-auto max-w-3xl">
      <Link
        href="/quizzes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        <ArrowLeft className="size-4" />
        All quizzes
      </Link>
      <Card className="mt-6">
        <CardContent className="grid place-items-center p-8 pt-8 text-center">
          {result.kind === "final_exam" ? (
            result.passed ? (
              <Trophy className="size-10 text-teal-600" />
            ) : (
              <XCircle className="size-10 text-red-500" />
            )
          ) : (
            <CircleCheckBig className="size-10 text-teal-600" />
          )}
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {result.kind === "final_exam"
              ? result.passed
                ? "You passed the final exam"
                : "Not passed this time"
              : "Attempt submitted"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {result.kind === "final_exam"
              ? "Correct answers stay hidden for final exams. Your score was calculated on the server."
              : "Your score was calculated by the trusted grading function."}
          </p>
          {result.kind === "final_exam" ? (
            <p
              className={cn(
                "mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold",
                result.passed
                  ? "bg-teal-50 text-teal-800"
                  : "bg-red-50 text-red-700",
              )}
            >
              {result.passed ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <XCircle className="size-5" />
              )}
              {result.passed ? "Pass" : "Fail"} · {result.percentage}%
            </p>
          ) : (
            <>
              <p className="mt-6 text-4xl font-bold text-teal-700">
                {result.score}/{result.totalMarks}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-teal-800">
                <CircleCheckBig className="size-4" />
                {result.percentage}% correct
              </p>
            </>
          )}
          {result.kind === "final_exam" &&
          result.passed &&
          result.certificateIssued ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-800 ring-1 ring-inset ring-teal-200">
              <Award className="size-4 text-teal-600" />
              Congratulations — your course certificate has been issued.
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>Attempt #{result.attemptNumber}</span>
            <span>{result.attemptCount} attempt(s) used</span>
            {remainingAttempts === null ? (
              <span>Retakes: unlimited</span>
            ) : (
              <span>Attempts left: {remainingAttempts}</span>
            )}
            <span>Time spent: {formatDuration(result.timeSpentSeconds)}</span>
          </div>
          {!retakeAllowed &&
          result.remainingAttempts !== null &&
          result.remainingAttempts > 0 ? (
            <p className="mt-4 text-sm font-medium text-amber-700">
              You can retake this exam {result.remainingAttempts} more time(s).
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {retakeAllowed ? (
              <Button onClick={onRetake}>
                <RotateCcw className="size-4" />
                Retake this chapter quiz
              </Button>
            ) : null}
            {result.kind === "final_exam" && result.passed ? (
              <Link
                href="/certificates"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                <Award className="size-4" />
                View certificate
              </Link>
            ) : null}
            <Link
              href="/quizzes"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ClipboardCheck className="size-4" />
              Back to quizzes
            </Link>
          </div>
        </CardContent>
      </Card>
      {retakeAllowed && result.review?.length ? (
        <Card className="mt-6">
          <CardContent className="p-6 pt-6">
            <h2 className="text-lg font-bold text-slate-900">Answer review</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your selection compared with the correct answer.
            </p>
            <div className="mt-4 space-y-3">
              {result.review.map((item, itemIndex) => (
                <ReviewRow
                  key={item.questionId}
                  index={itemIndex + 1}
                  item={item}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function ReviewRow({
  index,
  item,
}: {
  index: number;
  item: QuestionReviewItem;
}) {
  const correct = item.marksEarned > 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        correct
          ? "border-teal-200 bg-teal-50/60"
          : "border-red-200 bg-red-50/60",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">Question {index}</p>
        <Badge
          className={
            correct
              ? "bg-teal-100 text-teal-800 ring-teal-200"
              : "bg-red-100 text-red-700 ring-red-200"
          }
        >
          {item.marksEarned > 0 ? `+${item.marksEarned}` : "0 marks"}
        </Badge>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex flex-wrap gap-2">
          <dt className="font-medium text-slate-500">Your answer:</dt>
          <dd className="text-slate-800">
            {describeSelection(item.selectedIndex, item.selectedIndices)}
          </dd>
        </div>
        <div className="flex flex-wrap gap-2">
          <dt className="font-medium text-slate-500">Correct answer:</dt>
          <dd className="font-medium text-teal-700">
            {describeOption(
              item.correctAnswerIndices.length
                ? item.correctAnswerIndices
                : [item.correctAnswerIndex],
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function describeSelection(
  selectedIndex: number | null,
  selectedIndices: number[],
) {
  const indices = selectedIndices.length
    ? selectedIndices
    : selectedIndex !== null && selectedIndex >= 0
      ? [selectedIndex]
      : [];
  return indices.length ? describeOption(indices) : "No answer selected";
}

function describeOption(indices: number[]) {
  return indices.map((value) => `Option ${value + 1}`).join(", ");
}

function EmptyQuizState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mt-8 max-w-xl grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <ClipboardCheck className="size-8 text-teal-600" />
      <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      <Link
        href="/quizzes"
        className="mt-6 text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        Back to quizzes
      </Link>
    </div>
  );
}
