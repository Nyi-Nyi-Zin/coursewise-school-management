import type { BatchQuiz } from "./student-repository";

export type QuizFilter = "all" | "available" | "completed" | "upcoming";
export type QuizCatalogRequest = {
  enrollments: { courseId: string; batchId: string }[];
  page: number;
  query: string;
  filter: QuizFilter;
};
export type QuizCatalogPage = {
  quizzes: BatchQuiz[];
  page: number;
  pageSize: number;
  total: number;
  summary: { total: number; completed: number; available: number; averageScore: number; bestScore: number; passed: number };
  scores: { id: string; title: string; percentage: number; passed: boolean }[];
};
