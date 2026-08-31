"use client";

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { getFirebaseClient } from "./firebase";
import type { QuizKind } from "@/lib/firebase-quiz-workflows";
import { authenticatedApiFetch } from "./authenticated-api";

export type StudentResultRow = {
  quizId: string;
  quizTitle: string;
  chapter: string;
  kind: QuizKind;
  attemptCount: number;
  bestScore: number;
  bestTotalMarks: number;
  bestPercentage: number;
  latestPercentage: number;
  latestPassed: boolean;
  passed: boolean;
  submittedAtMillis: number | null;
  timeSpentSeconds: number;
  integrityViolations: number;
  nextEligibleAtMillis: number | null;
};

export type StudentProgress = {
  profile: { id: string; name: string; email: string; studentCode: string; photoUrl: string; isActive: boolean };
  enrollment: { courseId: string; batchId: string; courseTitle: string; batchName: string } | null;
  progress: { overallPercentage: number; completedItems: number; totalItems: number; completedLessons: number; totalLessons: number; completedChapters: number; totalChapters: number; passedFinals: number; totalFinals: number };
  results: StudentResultRow[];
  certificate: { status: "not_eligible" | "eligible_pending" | "issued"; count: number };
};

export async function loadStudentResults(studentId: string): Promise<StudentResultRow[]> {
  return (await loadStudentProgress(studentId)).results;
  /* istanbul ignore next -- retained compatibility path */
  // Quiz summaries are readable by administrators under the Firestore rules.
  // Reading them directly keeps the Results view available even when the
  // server-side quiz scoring stores these summaries in Firestore.
  const { db } = getFirebaseClient();
  const summaries = await getDocs(query(collection(db, "quizSummaries"), where("studentId", "==", studentId)));

  return Promise.all(summaries.docs.map(async summaryDocument => {
    const summary = summaryDocument.data();
    const quizId = stringValue(summary.quizId);
    const quiz = quizId ? await getDoc(doc(db, "quizzes", quizId)) : null;
    const quizData = quiz?.data();

    return {
      quizId,
      quizTitle: stringValue(quizData?.title, "Assessment"),
      chapter: stringValue(quizData?.chapter),
      kind: summary.kind === "final_exam" ? "final_exam" : "chapter_quiz",
      attemptCount: numberValue(summary.attemptCount),
      bestScore: numberValue(summary.bestScore),
      bestTotalMarks: numberValue(summary.bestTotalMarks),
      bestPercentage: numberValue(summary.bestPercentage),
      latestPercentage: numberValue(summary.latestPercentage),
      latestPassed: summary.latestPassed === true,
      passed: summary.passed === true,
      submittedAtMillis: nullableNumber(summary.latestSubmittedAtMillis),
      timeSpentSeconds: numberValue(summary.latestTimeSpentSeconds),
      integrityViolations: numberValue(summary.latestIntegrityViolations),
      nextEligibleAtMillis: nullableNumber(summary.nextEligibleAtMillis),
    };
  }));
}

export async function loadStudentProgress(studentId: string): Promise<StudentProgress> {
  return authenticatedApiFetch(`/api/students?studentId=${encodeURIComponent(studentId)}`) as Promise<StudentProgress>;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatSpentTime(totalSeconds: number) {
  if (!totalSeconds || totalSeconds <= 0) return "—";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return minutes ? `${minutes} min ${seconds} s` : `${seconds} s`;
}
