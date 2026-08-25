"use client";

import { httpsCallable } from "firebase/functions";

import { getFirebaseClient } from "./firebase";
import type { QuizKind } from "@/lib/firebase-quiz-workflows";

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
};

export async function loadStudentResults(studentId: string): Promise<StudentResultRow[]> {
  const { functions } = getFirebaseClient();
  const callable = httpsCallable<{ studentId: string }, { results: StudentResultRow[] }>(functions, "adminListStudentResults");
  const response = await callable({ studentId });
  return Array.isArray(response.data?.results) ? response.data.results : [];
}

export function formatSpentTime(totalSeconds: number) {
  if (!totalSeconds || totalSeconds <= 0) return "—";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return minutes ? `${minutes} min ${seconds} s` : `${seconds} s`;
}
