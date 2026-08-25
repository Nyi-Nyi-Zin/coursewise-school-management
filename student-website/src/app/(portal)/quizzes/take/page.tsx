"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, ArrowLeft, CheckCircle2, CircleCheckBig, ClipboardCheck, RotateCcw, ShieldAlert, Trophy, XCircle } from "lucide-react";
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

type AnswerMap = Record<string, number[]>;

export default function TakeQuizPage() {
  return <Suspense fallback={<Card className="mt-8"><CardContent className="p-6 text-stone-500">Loading quiz…</CardContent></Card>}><TakeQuizContent /></Suspense>;
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

  const meta = useQuery({ queryKey: ["student", "quiz-meta", quizId], queryFn: () => getQuizMeta(quizId), enabled: Boolean(quizId) });
  const questions = useQuery({ queryKey: ["student", "quiz-questions", quizId], queryFn: () => getQuizQuestions(quizId), enabled: Boolean(quizId) });
  const previous = useQuery({ queryKey: ["student", "quiz-results", quizId], queryFn: () => getMyQuizResults(quizId), enabled: Boolean(quizId) });

  const isExam = meta.data?.kind === "final_exam";
  const durationSeconds = Math.max(0, Math.round((meta.data?.durationMinutes ?? 0) * 60));
  const items = questions.data ?? [];
  const examTimingEnabled = Boolean(isExam && durationSeconds > 0 && !result && items.length > 0);

  useEffect(() => {
    if (!examTimingEnabled) return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [examTimingEnabled]);

  const examStartedAt = examTimingEnabled ? questions.dataUpdatedAt || null : null;
  const remainingSeconds = examStartedAt
    ? Math.max(0, durationSeconds - Math.round((nowTick - examStartedAt) / 1000))
    : null;

  const submission = useMutation({
    mutationFn: () => submitQuizAttempt(quizId, buildSubmission(items, answers), examStartedAt ?? undefined),
    onSuccess: (outcome) => {
      setResult(outcome);
      queryClient.invalidateQueries({ queryKey: ["student", "quiz-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["student", "quiz-results", quizId] });
      toast.success(isExam ? "Your exam was submitted and graded." : "Your answers were submitted.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not submit your answers."),
  });

  const timeUp = examTimingEnabled && remainingSeconds !== null && remainingSeconds <= 0;
  useEffect(() => {
    if (!timeUp || autoSubmittedRef.current || submission.isPending || result) return;
    autoSubmittedRef.current = true;
    toast.info("Time is up. Your exam was submitted automatically.");
    submission.mutate();
  }, [timeUp, submission, result]);

  if (!quizId) return <EmptyQuizState title="No assessment selected." description="Pick a quiz or exam from the Quizzes page." />;

  if (result) return <ResultCard result={result} onRetake={() => { setResult(null); setAnswers({}); autoSubmittedRef.current = false; queryClient.invalidateQueries({ queryKey: ["student", "quiz-questions", quizId] }); }} retakeAllowed={!isExam} remainingAttempts={result.remainingAttempts} />;

  const gateBlocked = Boolean(
    previous.data && isExam && (previous.data.passed || (previous.data.remainingAttempts !== null && previous.data.remainingAttempts <= 0)),
  );

  if (gateBlocked) {
    const summary = previous.data!;
    return (
      <section className="mx-auto max-w-xl">
        <Card>
          <CardContent className="grid place-items-center p-8 text-center">
            {summary.passed ? <Trophy className="size-10 text-emerald-600" /> : <ShieldAlert className="size-10 text-amber-500" />}
            <h1 className="mt-4 text-2xl font-bold text-stone-900">{summary.passed ? "Final exam passed" : "No attempts remain"}</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
              {summary.passed
                ? `You already passed this final exam with your best score of ${summary.bestPercentage}%.`
                : "You have used every attempt allowed for this final exam. Contact your instructor to request another try."}
            </p>
            {summary.latest ? <p className="mt-4 text-sm text-stone-500">Latest score: {summary.latest.percentage}% · Attempts used: {summary.attemptCount}</p> : null}
            <Link href="/quizzes" className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"><ClipboardCheck className="size-4" />Back to quizzes</Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  const answeredCount = items.filter(question => (answers[question.id]?.length ?? 0) > 0).length;

  return (
    <section className="max-w-3xl">
      <Link href="/quizzes" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"><ArrowLeft className="size-4" />All quizzes</Link>
      <p className="mt-4 text-sm font-medium text-emerald-700">{isExam ? "Final exam · answers are not shown after grading" : "Chapter quiz · graded instantly with answer review"}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">{meta.isLoading ? "Loading…" : meta.data?.title ?? "Take quiz"}{meta.data?.chapter ? <span className="ml-2 align-middle text-base font-medium text-stone-500">· {meta.data.chapter}</span> : null}</h1>
      <p className="mt-3 text-stone-500">
        {isExam
          ? `Score ${meta.data?.passingPercent ?? 50}% or higher to pass${durationSeconds > 0 ? ` within ${formatDuration(durationSeconds)}` : ""}. The exam submits itself when the timer runs out.${previous.data ? ` Attempt ${previous.data.attemptCount + (previous.data.remainingAttempts === 0 ? 0 : 1)}${previous.data.remainingAttempts !== null ? ` of ${previous.data.attemptCount + previous.data.remainingAttempts}` : ""}.` : ""}`
          : "Answer every question, then submit once. Scoring happens on the server and your attempt is recorded immediately."}
      </p>

      {questions.isLoading ? <Card className="mt-8"><CardContent className="p-6 text-stone-500">Loading questions…</CardContent></Card>
        : !items.length ? <div className="mt-8"><EmptyQuizState title="This assessment has no published questions yet." description="Please check back later or contact your instructor." /></div>
        : <>
          {isExam && durationSeconds > 0 ? (
            <Card className={cn("sticky top-24 z-20 mt-6", remainingSeconds !== null && remainingSeconds <= 60 && "border-red-300 ring-1 ring-red-200")}>
              <CardContent className="flex items-center justify-between p-4">
                <span className="flex items-center gap-2 text-sm font-medium text-stone-600"><AlarmClock className={cn("size-5", remainingSeconds !== null && remainingSeconds <= 60 ? "text-red-600" : "text-emerald-700")} />Time remaining</span>
                <span className={cn("font-mono text-2xl font-bold tabular-nums", remainingSeconds !== null && remainingSeconds <= 60 ? "text-red-600" : "text-stone-900")}>{remainingSeconds === null ? "--:--" : formatDuration(remainingSeconds)}</span>
              </CardContent>
            </Card>
          ) : null}
          <div className="mt-6 space-y-4">{items.map((question, index) => <QuestionCard key={question.id} index={index + 1} question={question} selected={answers[question.id] ?? []} onToggle={(optionIndex) => setAnswers(current => toggleSelection(current, question, optionIndex))} />)}</div>
          <Card className="sticky bottom-24 mt-6 border-stone-200 shadow-lg lg:bottom-6"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-sm text-stone-500">{answeredCount} of {items.length} answered{isExam ? ` · ${previous.data?.attemptCount ?? 0} attempt(s) used` : ""}</p><Button disabled={submission.isPending || answeredCount !== items.length} onClick={() => setConfirming(true)}>{submission.isPending ? "Submitting…" : "Review & submit"}</Button></CardContent></Card>
          {confirming ? <div role="dialog" aria-modal="true" aria-label="Confirm submission" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4"><Card className="w-full max-w-md"><CardContent className="p-6"><h2 className="text-xl font-bold text-stone-900">{isExam ? "Submit your final exam?" : "Submit your answers?"}</h2><p className="mt-2 text-sm leading-6 text-stone-500">You answered all {items.length} questions. Your attempt cannot be edited afterward.</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setConfirming(false)}>Go back</Button><Button disabled={submission.isPending} onClick={() => { setConfirming(false); submission.mutate(); }}>{submission.isPending ? "Submitting…" : "Submit now"}</Button></div></CardContent></Card></div> : null}
        </>
      }
    </section>
  );
}

function toggleSelection(current: AnswerMap, question: QuizQuestion, optionIndex: number): AnswerMap {
  const multi = question.type === "multiple_select";
  const currentSelection = current[question.id] ?? [];
  const next = multi
    ? currentSelection.includes(optionIndex) ? currentSelection.filter(value => value !== optionIndex) : [...currentSelection, optionIndex]
    : currentSelection.length === 1 && currentSelection[0] === optionIndex ? [] : [optionIndex];
  return { ...current, [question.id]: next };
}

function buildSubmission(items: QuizQuestion[], answers: AnswerMap) {
  return items.map(question => {
    const selection = answers[question.id] ?? [];
    return question.type === "multiple_select"
      ? { questionId: question.id, selectedAnswerIndex: -1, selectedIndices: [...selection].sort((a, b) => a - b) }
      : { questionId: question.id, selectedAnswerIndex: selection[0] ?? -1 };
  });
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const typeLabel: Record<QuizQuestionType, string> = { multiple_choice: "Choose one", multiple_select: "Choose all that apply", true_false: "True or false" };

function QuestionCard({ question, index, selected, onToggle }: { question: QuizQuestion; index: number; selected: number[]; onToggle: (optionIndex: number) => void }) {
  return <Card><CardContent className="p-5 pt-5">
    <div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-stone-900">{index}. {question.prompt}</h2><Badge className="bg-emerald-50 text-emerald-800 ring-emerald-200">{question.marks} {question.marks === 1 ? "mark" : "marks"}</Badge></div>
    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-400">{question.type ? typeLabel[question.type] : typeLabel.multiple_choice}</p>
    <div className="mt-4 grid gap-2">{question.options.map((option, optionIndex) => {
      const isSelected = selected.includes(optionIndex);
      return (
        <button key={optionIndex} type="button" onClick={() => onToggle(optionIndex)} aria-pressed={isSelected} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition", isSelected ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-stone-200 bg-stone-50 text-stone-700 hover:border-emerald-400 hover:bg-white")}>
          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", isSelected ? "border-emerald-600" : "border-stone-300")}>{isSelected ? <span className="size-2.5 rounded-full bg-emerald-600" /> : null}</span>
          {option}
        </button>
      );
    })}</div>
  </CardContent></Card>;
}

function ResultCard({ result, onRetake, retakeAllowed, remainingAttempts }: { result: QuizSubmissionResult; onRetake: () => void; retakeAllowed: boolean; remainingAttempts: number | null }) {
  return (
    <section className="max-w-3xl">
      <Link href="/quizzes" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"><ArrowLeft className="size-4" />All quizzes</Link>
      <Card className="mt-6">
        <CardContent className="grid place-items-center p-8 pt-8 text-center">
          {result.kind === "final_exam"
            ? (result.passed ? <Trophy className="size-10 text-emerald-600" /> : <XCircle className="size-10 text-red-500" />)
            : <CircleCheckBig className="size-10 text-emerald-600" />}
          <h1 className="mt-4 text-2xl font-bold text-stone-900">
            {result.kind === "final_exam" ? (result.passed ? "You passed the final exam" : "Not passed this time") : "Attempt submitted"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {result.kind === "final_exam"
              ? "Correct answers stay hidden for final exams. Your score was calculated on the server."
              : "Your score was calculated by the trusted grading function."}
          </p>
          {result.kind === "final_exam"
            ? <p className={cn("mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold", result.passed ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>{result.passed ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}{result.passed ? "Pass" : "Fail"} · {result.percentage}%</p>
            : <>
              <p className="mt-6 text-4xl font-bold text-emerald-700">{result.score}/{result.totalMarks}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-800"><CircleCheckBig className="size-4" />{result.percentage}% correct</p>
            </>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-500">
            <span>Attempt #{result.attemptNumber}</span>
            <span>{result.attemptCount} attempt(s) used</span>
            {remainingAttempts === null ? <span>Retakes: unlimited</span> : <span>Attempts left: {remainingAttempts}</span>}
            <span>Time spent: {formatDuration(result.timeSpentSeconds)}</span>
          </div>
          {!retakeAllowed && result.remainingAttempts !== null && result.remainingAttempts > 0 ? <p className="mt-4 text-sm font-medium text-amber-700">You can retake this exam {result.remainingAttempts} more time(s).</p> : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {retakeAllowed ? <Button onClick={onRetake}><RotateCcw className="size-4" />Retake this chapter quiz</Button> : null}
            <Link href="/quizzes" className="inline-flex h-11 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"><ClipboardCheck className="size-4" />Back to quizzes</Link>
          </div>
        </CardContent>
      </Card>
      {retakeAllowed && result.review?.length ? (
        <Card className="mt-6">
          <CardContent className="p-6 pt-6">
            <h2 className="text-lg font-bold text-stone-900">Answer review</h2>
            <p className="mt-1 text-sm text-stone-500">Your selection compared with the correct answer.</p>
            <div className="mt-4 space-y-3">
              {(result.review).map((item, itemIndex) => <ReviewRow key={item.questionId} index={itemIndex + 1} item={item} />)}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function ReviewRow({ index, item }: { index: number; item: QuestionReviewItem }) {
  const correct = item.marksEarned > 0;
  return (
    <div className={cn("rounded-xl border p-4", correct ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60")}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-stone-900">Question {index}</p>
        <Badge className={correct ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-red-100 text-red-700 ring-red-200"}>{item.marksEarned > 0 ? `+${item.marksEarned}` : "0 marks"}</Badge>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex flex-wrap gap-2"><dt className="font-medium text-stone-500">Your answer:</dt><dd className="text-stone-800">{describeSelection(item.selectedIndex, item.selectedIndices)}</dd></div>
        <div className="flex flex-wrap gap-2"><dt className="font-medium text-stone-500">Correct answer:</dt><dd className="font-medium text-emerald-700">{describeOption(item.correctAnswerIndices.length ? item.correctAnswerIndices : [item.correctAnswerIndex])}</dd></div>
      </dl>
    </div>
  );
}

function describeSelection(selectedIndex: number | null, selectedIndices: number[]) {
  const indices = selectedIndices.length ? selectedIndices : selectedIndex !== null && selectedIndex >= 0 ? [selectedIndex] : [];
  return indices.length ? describeOption(indices) : "No answer selected";
}

function describeOption(indices: number[]) {
  return indices.map(value => `Option ${value + 1}`).join(", ");
}

function EmptyQuizState({ title, description }: { title: string; description: string }) {
  return <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center max-w-xl mx-auto"><ClipboardCheck className="size-8 text-emerald-600" /><h2 className="mt-4 font-semibold text-stone-900">{title}</h2><p className="mt-2 max-w-sm text-sm text-stone-500">{description}</p><Link href="/quizzes" className="mt-6 text-sm font-semibold text-emerald-700 hover:text-emerald-800">Back to quizzes</Link></div>;
}
