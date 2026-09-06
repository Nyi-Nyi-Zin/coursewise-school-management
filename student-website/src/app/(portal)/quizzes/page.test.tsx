// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import QuizzesPage from "./page";

const mocks = vi.hoisted(() => ({ enrollments: vi.fn(), quizzes: vi.fn(), attempts: vi.fn() }));
vi.mock("@/components/student-auth-provider", () => ({ useStudentAuth: () => ({ user: { uid: "student" } }) }));
vi.mock("@/lib/firebase", () => ({ isFirebaseConfigured: true }));
vi.mock("@/lib/student-repository", () => ({ getStudentEnrollments: mocks.enrollments, getBatchQuizzes: mocks.quizzes, getStudentQuizAttempts: mocks.attempts }));
afterEach(cleanup);

it("shows quizzes and attempt results from both enrolled courses", async () => {
  mocks.enrollments.mockResolvedValue([
    { courseId: "a", batchId: "batch-a", courseTitle: "A", batchName: "A batch" },
    { courseId: "b", batchId: "batch-b", courseTitle: "B", batchName: "B batch" },
  ]);
  mocks.quizzes.mockImplementation(async (courseId: string) => [{ id: courseId, title: `Quiz ${courseId}`, kind: "chapter_quiz", totalMarks: 10 }]);
  mocks.attempts.mockImplementation(async (_student: string, courseId: string) => courseId === "b" ? [{ id: "attempt-b", quizId: "b", score: 8, totalMarks: 10 }] : []);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><QuizzesPage /></QueryClientProvider>);
  expect(await screen.findByText("Quiz a")).toBeTruthy();
  expect(await screen.findByRole("heading", { name: "Quiz b" })).toBeTruthy();
  expect(await screen.findByText("Try again")).toBeTruthy();
  expect(mocks.quizzes).toHaveBeenCalledWith("a", "batch-a");
  expect(mocks.quizzes).toHaveBeenCalledWith("b", "batch-b");
  expect(mocks.attempts).toHaveBeenCalledWith("student", "b", "batch-b");
  client.clear();
});
