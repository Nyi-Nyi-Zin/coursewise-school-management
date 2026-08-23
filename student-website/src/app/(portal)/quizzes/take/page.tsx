"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CircleCheckBig, ClipboardCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getQuizQuestions, submitQuizAttempt, type QuizSubmissionResult, type QuizQuestion } from "@/lib/student-repository";

export default function TakeQuizPage() {
  return <Suspense fallback={<Card className="mt-8"><CardContent className="p-6 text-slate-400">Loading quiz…</CardContent></Card>}><TakeQuizContent /></Suspense>;
}

function TakeQuizContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const quizId = searchParams.get("id") ?? "";
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const questions = useQuery({ queryKey: ["student", "quiz-questions", quizId], queryFn: () => getQuizQuestions(quizId), enabled: Boolean(quizId) });
  const submission = useMutation({
    mutationFn: () => submitQuizAttempt(quizId, (questions.data ?? []).map((question) => ({ questionId: question.id, selectedAnswerIndex: answers[question.id] ?? -1 }))),
    onSuccess: (outcome) => {
      setResult(outcome);
      queryClient.invalidateQueries({ queryKey: ["student", "quiz-attempts"] });
      toast.success("Your answers were submitted.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not submit your answers."),
  });
  if (!quizId) return <EmptyQuizState title="No quiz selected." description="Pick a quiz from the Quizzes page." />;
  if (result) return <ScoreCard result={result} />;
  const items = questions.data ?? [];
  const answeredCount = Object.keys(answers).length;
  return (
    <section className="max-w-3xl">
      <Link href="/quizzes" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-sky-200"><ArrowLeft className="size-4" />All quizzes</Link>
      <p className="mt-4 text-sm font-medium text-violet-300">Private assessment</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Take quiz</h1>
      <p className="mt-3 text-slate-400">Answer every question, then submit once. Scoring happens on the server and your attempt is recorded immediately.</p>
      {questions.isLoading ? <Card className="mt-8"><CardContent className="p-6 text-slate-400">Loading questions…</CardContent></Card>
        : !items.length ? <div className="mt-8"><EmptyQuizState title="This quiz has no published questions yet." description="Please check back later or contact your instructor." /></div>
        : <>
          <div className="mt-8 space-y-4">{items.map((question, index) => <QuestionCard key={question.id} index={index + 1} question={question} selected={answers[question.id]} onSelect={(optionIndex) => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} />)}</div>
          <Card className="sticky bottom-24 mt-6 border-slate-800 lg:bottom-6"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-sm text-slate-400">{answeredCount} of {items.length} answered</p><Button disabled={submission.isPending || answeredCount !== items.length} onClick={() => setConfirming(true)}>{submission.isPending ? "Submitting…" : "Review & submit"}</Button></CardContent></Card>
          {confirming ? <div role="dialog" aria-modal="true" aria-label="Confirm quiz submission" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4"><Card className="w-full max-w-md"><CardContent className="p-6"><h2 className="text-xl font-bold text-white">Submit your answers?</h2><p className="mt-2 text-sm leading-6 text-slate-400">You answered all {items.length} questions. Your attempt cannot be edited afterward.</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setConfirming(false)}>Go back</Button><Button disabled={submission.isPending} onClick={() => { setConfirming(false); submission.mutate(); }}>{submission.isPending ? "Submitting…" : "Submit now"}</Button></div></CardContent></Card></div> : null}
        </>}
    </section>
  );
}

function QuestionCard({ question, index, selected, onSelect }: { question: QuizQuestion; index: number; selected?: number; onSelect: (index: number) => void }) {
  return <Card><CardContent className="p-5">
    <div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-white">{index}. {question.prompt}</h2><Badge className="bg-violet-400/10 text-violet-300 ring-violet-400/20">{question.marks} {question.marks === 1 ? "mark" : "marks"}</Badge></div>
    <div className="mt-4 grid gap-2">{question.options.map((option, optionIndex) => (
      <button key={optionIndex} type="button" onClick={() => onSelect(optionIndex)} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition", selected === optionIndex ? "border-sky-400/60 bg-sky-400/10 text-sky-100" : "border-slate-800 bg-slate-950/30 text-slate-300 hover:border-slate-600")}>
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", selected === optionIndex ? "border-sky-300" : "border-slate-600")}>{selected === optionIndex ? <span className="size-2.5 rounded-full bg-sky-300" /> : null}</span>
        {option}
      </button>
    ))}</div>
  </CardContent></Card>;
}

function ScoreCard({ result }: { result: QuizSubmissionResult }) {
  return <section className="max-w-md"><Card><CardContent className="grid place-items-center p-8 text-center">
    <Trophy className="size-10 text-emerald-400" />
    <h1 className="mt-4 text-2xl font-bold text-white">Attempt submitted</h1>
    <p className="mt-2 text-sm text-slate-400">Your score was calculated by the trusted quiz function.</p>
    <p className="mt-6 text-4xl font-bold text-emerald-300">{result.score}/{result.totalMarks}</p>
    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-200"><CircleCheckBig className="size-4" />{result.percentage}% correct</p>
    <Link href="/quizzes" className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"><ClipboardCheck className="size-4" />Back to quizzes</Link>
  </CardContent></Card></section>;
}

function EmptyQuizState({ title, description }: { title: string; description: string }) {
  return <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-slate-700 px-6 py-16 text-center max-w-xl mx-auto"><ClipboardCheck className="size-8 text-violet-300" /><h2 className="mt-4 font-semibold text-white">{title}</h2><p className="mt-2 max-w-sm text-sm text-slate-400">{description}</p><Link href="/quizzes" className="mt-6 text-sm font-semibold text-sky-300 hover:text-sky-200">Back to quizzes</Link></div>;
}
