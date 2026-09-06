"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, ArrowLeft, Award, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, LockKeyhole, Maximize2, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { checkChapterAnswer, recordExamIntegrityViolation, startAssessment, submitQuizAttempt, type ChapterAnswerFeedback, type QuestionReviewItem, type QuizQuestion, type QuizSubmissionResult, type SubmittedQuizAnswer } from "@/lib/student-repository";

type AnswerMap = Record<string, number[]>;
type FeedbackMap = Record<string, ChapterAnswerFeedback>;

export function AssessmentRunner() {
  const quizId = useSearchParams().get("id") ?? "";
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [now, setNow] = useState(Date.now());
  const autoSubmitRef = useRef(false);
  const lastViolationRef = useRef(0);
  const session = useQuery({ queryKey: ["student", "assessment-session", quizId], queryFn: () => startAssessment(quizId), enabled: Boolean(quizId), retry: false, refetchOnWindowFocus: false });
  const isExam = session.data?.kind === "final_exam";
  const questions = session.data?.questions ?? [];
  const question = questions[current];
  const remainingSeconds = session.data?.expiresAtMillis ? Math.max(0, Math.ceil((session.data.expiresAtMillis - now) / 1000)) : null;
  const answeredCount = questions.filter(item => (answers[item.id]?.length ?? 0) > 0).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  useEffect(() => {
    if (!session.data?.expiresAtMillis || result) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [result, session.data?.expiresAtMillis]);

  const submission = useMutation({
    mutationFn: () => submitQuizAttempt(quizId, session.data!.sessionId, buildAnswers(questions, answers)),
    onSuccess: outcome => {
      setResult(outcome);
      queryClient.invalidateQueries({ queryKey: ["student", "quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["student", "quiz-attempts"] });
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      toast.success(outcome.kind === "final_exam" ? "Final exam graded." : "Chapter quiz saved.");
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Assessment could not be submitted."),
  });
  useEffect(() => {
    if (remainingSeconds !== 0 || autoSubmitRef.current || result || !session.data || submission.isPending) return;
    autoSubmitRef.current = true;
    toast.info("Time is up. Your final exam is being submitted.");
    submission.mutate();
  }, [remainingSeconds, result, session.data, submission]);

  const violation = useMutation({
    mutationFn: (reason: string) => recordExamIntegrityViolation(quizId, reason),
    onSuccess: outcome => {
      if (outcome.shouldSubmit && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        toast.error("Three exam-integrity warnings were recorded. Your exam is being submitted.");
        submission.mutate();
      } else toast.warning(`Exam integrity warning ${outcome.violationCount}/3`);
    },
  });
  useEffect(() => {
    if (!isExam || result || !session.data) return;
    const report = (reason: string) => {
      const timestamp = Date.now();
      if (timestamp - lastViolationRef.current < 1200 || violation.isPending) return;
      lastViolationRef.current = timestamp;
      violation.mutate(reason);
    };
    const visibility = () => { if (document.visibilityState === "hidden") report("tab-hidden"); };
    const blur = () => report("window-blur");
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen" || ((event.ctrlKey || event.metaKey) && ["c", "x", "p", "s"].includes(event.key.toLowerCase()))) { event.preventDefault(); report(`blocked-key-${event.key.toLowerCase()}`); }
    };
    const contextmenu = (event: MouseEvent) => { event.preventDefault(); report("context-menu"); };
    document.addEventListener("visibilitychange", visibility); window.addEventListener("blur", blur); document.addEventListener("keydown", keydown); document.addEventListener("contextmenu", contextmenu);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("blur", blur); document.removeEventListener("keydown", keydown); document.removeEventListener("contextmenu", contextmenu); };
  }, [isExam, result, session.data, violation]);

  const checker = useMutation({
    mutationFn: () => checkChapterAnswer(quizId, question.id, answers[question.id] ?? []),
    onSuccess: item => setFeedback(currentFeedback => ({ ...currentFeedback, [item.questionId]: item })),
    onError: error => toast.error(error instanceof Error ? error.message : "Answer could not be checked."),
  });

  if (!quizId) return <Message title="No assessment selected" body="Choose an assessment from the quizzes page." />;
  if (session.isLoading) return <Message title="Preparing your assessment" body="Checking eligibility and creating a secure session..." />;
  if (session.isError) return <Message title="Assessment locked" body={session.error instanceof Error ? session.error.message : "This assessment is not available."} locked />;
  if (result) return <AssessmentResult result={result} onRetake={() => window.location.assign(`/quizzes/take?id=${encodeURIComponent(quizId)}`)} />;
  if (!question || !session.data) return <Message title="No questions available" body="Ask your instructor to publish questions for this assessment." />;

  const currentFeedback = feedback[question.id];
  const chapterLocked = !isExam && Boolean(currentFeedback);
  const canMoveNext = isExam || Boolean(currentFeedback);
  const goToQuestion = (index: number) => { setCurrent(index); };

  return <section className={cn("mx-auto max-w-3xl", isExam && "select-none")} onCopy={isExam ? event => event.preventDefault() : undefined}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Link href="/quizzes" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"><ArrowLeft className="size-4" />Back to quizzes</Link>{isExam ? <Button variant="outline" size="sm" onClick={() => void document.documentElement.requestFullscreen?.()}><Maximize2 className="size-4" />Fullscreen</Button> : null}</div>
    {isExam && remainingSeconds !== null ? <div className={cn("sticky top-2 z-40 mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 shadow-lg backdrop-blur", remainingSeconds <= 60 ? "border-red-200 bg-red-50/95 text-red-700" : "border-slate-200 bg-white/95 text-slate-900")}><span className="flex items-center gap-2 text-sm font-semibold"><AlarmClock className="size-5" />Time remaining</span><strong className="font-mono text-2xl tabular-nums">{formatDuration(remainingSeconds)}</strong></div> : null}
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{isExam ? "Final exam" : session.data.title}</p>
      <h1 className="mt-2 break-words text-xl font-bold leading-7 tracking-tight text-slate-950 sm:text-2xl sm:leading-8">{question.prompt}</h1>
      {question.type === "multiple_select" ? <p className="mt-2 text-sm text-slate-500">Select all answers that apply.</p> : null}
      <div className="mt-6 grid gap-2.5">{question.options.map((option, optionIndex) => {
        const selected = answers[question.id]?.includes(optionIndex) ?? false;
        const correctOption = currentFeedback?.correctIndices.includes(optionIndex);
        return <button key={optionIndex} type="button" disabled={chapterLocked || checker.isPending || submission.isPending} onClick={() => setAnswers(currentAnswers => toggleAnswer(currentAnswers, question, optionIndex))} aria-pressed={selected} className={cn("flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium leading-6 transition sm:px-4", currentFeedback ? correctOption ? "border-emerald-300 bg-emerald-100 text-emerald-950" : selected ? "border-red-300 bg-red-100 text-red-950" : "border-slate-100 bg-slate-50 text-slate-400" : selected ? "border-slate-950 bg-slate-50 text-slate-950" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50")}><span className={cn("grid size-5 shrink-0 place-items-center border-2", question.type === "multiple_select" ? "rounded-md" : "rounded-full", currentFeedback ? correctOption ? "border-emerald-600 bg-emerald-600 text-white" : selected ? "border-red-600 bg-red-600 text-white" : "border-slate-200" : selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300")}>{(selected || correctOption) ? <CheckCircle2 className="size-3.5" strokeWidth={3} /> : null}</span><span className="min-w-0 flex-1 break-words">{option}</span>{currentFeedback && correctOption ? <span className="text-xs font-bold text-emerald-700">Correct</span> : null}{currentFeedback && selected && !correctOption ? <span className="text-xs font-bold text-red-700">Incorrect</span> : null}</button>;
      })}</div>
      {currentFeedback ? <div className={cn("mt-5 rounded-xl border px-4 py-3.5", currentFeedback.correct ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900")}><p className="flex items-center gap-2 text-sm font-bold">{currentFeedback.correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}{currentFeedback.correct ? "Correct answer" : `Incorrect. The correct answer is: ${currentFeedback.correctAnswers.join(", ")}`}</p>{currentFeedback.explanation ? <p className="mt-2 break-words text-sm leading-6">{currentFeedback.explanation}</p> : null}</div> : null}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><p className="mr-auto text-sm font-medium text-slate-500">Question {current + 1}{isExam ? "" : ` of ${questions.length}`}</p><Button variant="outline" size="sm" disabled={current === 0} onClick={() => goToQuestion(Math.max(0, current - 1))}><ChevronLeft className="size-4" />Back</Button>{!isExam && !currentFeedback ? <Button size="sm" disabled={!answers[question.id]?.length || checker.isPending} onClick={() => checker.mutate()}>{checker.isPending ? "Checking..." : "Show Answer"}</Button> : null}{current < questions.length - 1 ? <Button size="sm" disabled={!canMoveNext} onClick={() => goToQuestion(current + 1)}>Next<ChevronRight className="size-4" /></Button> : <Button size="sm" disabled={submission.isPending || (isExam ? !allAnswered : Object.keys(feedback).length !== questions.length)} onClick={() => submission.mutate()}>{submission.isPending ? "Submitting..." : "Submit quiz"}</Button>}</div>
    </CardContent></Card>
    {!isExam ? <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Question navigator">{questions.map((item, index) => <button key={item.id} type="button" disabled={index > Object.keys(feedback).length} onClick={() => goToQuestion(index)} aria-label={`Go to question ${index + 1}`} className={cn("grid size-8 place-items-center rounded-full border text-xs font-bold transition", index === current ? "border-slate-950 bg-slate-950 text-white" : feedback[item.id] || answers[item.id]?.length ? "border-slate-300 bg-slate-100 text-slate-800" : "border-slate-200 bg-white text-slate-400", index > Object.keys(feedback).length && "cursor-not-allowed opacity-40")}>{index + 1}</button>)}</div> : null}
    <p className="mt-3 text-center text-xs text-slate-400">{isExam ? `Pass at ${session.data.passingPercent}%` : `${answeredCount} answered - Answers are checked one at a time`}</p>
    {isExam ? <p className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800"><ShieldAlert className="mt-0.5 size-4 shrink-0" />Leaving the tab, losing window focus, copying, printing, or opening the context menu records a warning. The third warning submits the exam.</p> : null}
  </section>;
}

function toggleAnswer(current: AnswerMap, question: QuizQuestion, index: number): AnswerMap { const selected = current[question.id] ?? []; const next = question.type === "multiple_select" ? selected.includes(index) ? selected.filter(value => value !== index) : [...selected, index] : [index]; return { ...current, [question.id]: next }; }
function buildAnswers(questions: QuizQuestion[], answers: AnswerMap): SubmittedQuizAnswer[] { return questions.map(question => ({ questionId: question.id, selectedAnswerIndex: answers[question.id]?.[0] ?? -1, ...(question.type === "multiple_select" ? { selectedIndices: answers[question.id] ?? [] } : {}) })); }

function AssessmentResult({ result, onRetake }: { result: QuizSubmissionResult; onRetake: () => void }) { const isExam = result.kind === "final_exam"; return <section className="mx-auto max-w-3xl"><Card className="rounded-2xl border-slate-200"><CardContent className="p-7 text-center">{result.passed ? <Award className="mx-auto size-12 text-emerald-600" /> : <ShieldAlert className="mx-auto size-12 text-amber-500" />}<p className="mt-4 text-sm font-semibold uppercase tracking-wider text-slate-500">{isExam ? "Final exam result" : "Chapter quiz result"}</p><h1 className="mt-2 text-4xl font-bold text-slate-950">{result.percentage}%</h1><p className={cn("mt-2 font-semibold", result.passed ? "text-emerald-700" : "text-red-600")}>{result.passed ? "Pass" : "Fail"}</p>{!isExam ? <p className="mt-2 text-sm text-slate-500">Score {result.score}/{result.totalMarks} - Best {result.bestPercentage ?? result.percentage}%</p> : null}{isExam && !result.passed && result.nextEligibleAt ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Retake available {new Date(result.nextEligibleAt).toLocaleString()}</p> : null}<div className="mt-6 flex flex-wrap justify-center gap-3">{!isExam ? <Button onClick={onRetake}><RotateCcw className="size-4" />Retake chapter quiz</Button> : null}<Link href="/quizzes" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold"><ClipboardCheck className="size-4" />Back to quizzes</Link></div></CardContent></Card>{!isExam && result.review?.length ? <Card className="mt-5 rounded-2xl border-slate-200"><CardContent className="p-5 sm:p-7"><h2 className="text-lg font-bold">Full answer review</h2><div className="mt-4 space-y-4">{result.review.map((item, index) => <ReviewItem key={item.questionId} item={item} index={index + 1} />)}</div></CardContent></Card> : null}</section>; }
function ReviewItem({ item, index }: { item: QuestionReviewItem; index: number }) { return <article className={cn("rounded-xl border p-4", item.correct ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60")}><p className="break-words font-semibold leading-6">{index}. {item.prompt}</p><p className="mt-2 break-words text-sm"><strong>Your answer:</strong> {item.selectedAnswers.join(", ") || "No answer"}</p><p className="mt-1 break-words text-sm text-emerald-800"><strong>Correct answer:</strong> {item.correctAnswers.join(", ")}</p>{item.explanation ? <p className="mt-2 break-words text-sm leading-6 text-slate-600">{item.explanation}</p> : null}</article>; }
function Message({ title, body, locked = false }: { title: string; body: string; locked?: boolean }) { return <Card className="mx-auto max-w-xl rounded-2xl"><CardContent className="grid place-items-center p-8 text-center">{locked ? <LockKeyhole className="size-9 text-amber-500" /> : <ClipboardCheck className="size-9 text-slate-700" />}<h1 className="mt-4 text-xl font-bold">{title}</h1><p className="mt-2 max-w-md break-words text-sm leading-6 text-slate-500">{body}</p><Link href="/quizzes" className="mt-5 text-sm font-semibold text-slate-700">Back to quizzes</Link></CardContent></Card>; }
function formatDuration(totalSeconds: number) { const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`; }
