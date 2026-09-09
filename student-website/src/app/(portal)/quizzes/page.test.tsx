// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import QuizzesPage from "./page";

const mocks = vi.hoisted(() => ({ enrollments: vi.fn(), quizzes: vi.fn() }));
vi.mock("@/components/student-auth-provider", () => ({ useStudentAuth: () => ({ user: { uid: "student" } }) }));
vi.mock("@/lib/firebase", () => ({ isFirebaseConfigured: true }));
vi.mock("@/lib/student-repository", () => ({ getStudentEnrollments: mocks.enrollments, getQuizCatalogPage: mocks.quizzes }));
afterEach(cleanup);

it("shows and remembers one selected course-batch catalog at a time", async () => {
  window.localStorage.clear();
  mocks.enrollments.mockResolvedValue([
    { courseId: "a", batchId: "batch-a", courseTitle: "A", batchName: "A batch" },
    { courseId: "b", batchId: "batch-b", courseTitle: "B", batchName: "B batch" },
  ]);
  mocks.quizzes.mockImplementation(async ({ enrollments }) => {
    const id = enrollments[0]?.courseId ?? "none";
    return {
      quizzes: [{ id, title: `Quiz ${id}`, kind: "chapter_quiz", totalMarks: 10, attemptCount: 0, bestPercentage: 0 }],
      page: 0, pageSize: 10, total: 1,
      summary: { total: 1, completed: 0, available: 1, averageScore: 0, bestScore: 0, passed: 0 },
      scores: [],
    };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><QuizzesPage /></QueryClientProvider>);
  expect(await screen.findByText("Quiz a")).toBeTruthy();
  expect(mocks.quizzes).toHaveBeenLastCalledWith(expect.objectContaining({
    enrollments: [expect.objectContaining({ courseId: "a", batchId: "batch-a" })],
  }));
  fireEvent.change(screen.getByRole("combobox", { name: "Course and batch" }), { target: { value: "b:batch-b" } });
  expect(await screen.findByText("Quiz b")).toBeTruthy();
  expect(mocks.quizzes).toHaveBeenLastCalledWith(expect.objectContaining({
    enrollments: [expect.objectContaining({ courseId: "b", batchId: "batch-b" })], page: 0,
  }));
  expect(window.localStorage.getItem("coursewise:student-scope:v1:student:quizzes")).toBe("b:batch-b");
  client.clear();
});
it("requests server pages and resets search and status filters without slicing the response", async () => {
  mocks.enrollments.mockResolvedValue([{ courseId: "a", batchId: "batch-a" }]);
  mocks.quizzes.mockImplementation(async ({ page }) => ({
    quizzes: [{ id: `page-${page}`, title: `Server page ${page}`, kind: "chapter_quiz", totalMarks: 10, attemptCount: 0 }],
    page, pageSize: 10, total: 11,
    summary: { total: 50, completed: 20, available: 30, averageScore: 80, bestScore: 90, passed: 15 },
    scores: [{ id: "off-page", title: "Off-page score", percentage: 90, passed: true }],
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><QuizzesPage /></QueryClientProvider>);
  await screen.findByText("Server page 0");
  expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("Server page 1");
  expect(screen.getByText("Out of 50 total")).toBeTruthy();
  expect(screen.getByText("Off-page score")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  await screen.findByText("Server page 0");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("Server page 1");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "chapter" } });
  await waitFor(() => expect(mocks.quizzes).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, query: "chapter" })));
  await screen.findByText("Server page 0");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("Server page 1");
  fireEvent.click(screen.getByRole("button", { name: "Completed", exact: true }));
  await waitFor(() => expect(mocks.quizzes).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, filter: "completed" })));
  client.clear();
});
