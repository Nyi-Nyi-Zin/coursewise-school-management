"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import type { CourseBatchScope } from "../lib/course-batch-scope";
import { quizAttemptReviewQueryKey } from "../lib/course-batch-dashboard";
import { loadBatchQuizAttempts } from "../lib/quiz-attempt-review-service";

export function ScopedQuizAttemptReview({ scope }: { scope: CourseBatchScope }) {
  const allPairs = !scope.courseId && !scope.batchId;
  const validScope = allPairs || Boolean(scope.courseId && scope.batchId);
  const attempts = useQuery({ queryKey: quizAttemptReviewQueryKey(scope), queryFn: () => loadBatchQuizAttempts(scope), enabled: validScope });
  return <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-800"><Trophy size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-800/55">Private attempt review</p><h3 className="mt-1 font-display text-xl font-semibold">{allPairs ? "Quiz attempts across all course–batch pairs" : "Quiz attempts in the selected batch"}</h3></div></div>{!validScope ? <p className="mt-4 text-sm text-stone-500">Select a complete course–batch pair.</p> : attempts.isLoading ? <p className="mt-4 text-sm text-stone-500">Loading private quiz attempts…</p> : attempts.data?.length ? <div className="mt-4 space-y-2">{attempts.data.map(attempt => <div key={attempt.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm"><span className="font-semibold text-stone-700">Student {attempt.studentId.slice(0, 10)} · Quiz {attempt.quizId.slice(0, 8)}</span><span className="font-bold text-emerald-800">{attempt.score} / {attempt.totalMarks}</span></div>)}</div> : <p className="mt-4 text-sm text-stone-500">No quiz attempts exist for this scope yet.</p>}</section>;
}
