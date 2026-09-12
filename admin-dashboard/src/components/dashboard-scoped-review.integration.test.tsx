// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CourseBatchScopeControls } from "./course-batch-scope-controls";
import { ScopedQuizAttemptReview } from "./scoped-quiz-attempt-review";
import { buildCourseBatchDashboardData } from "../lib/course-batch-dashboard";
import { emptyOfflineRecords } from "../lib/offline-records";
import type { CourseBatchScope } from "../lib/course-batch-scope";

const loadAttempts = vi.fn(async (scope: CourseBatchScope) => scope.batchId === "batch-a" ? [{ id: "attempt-a", studentId: "student-a", score: 8, totalMarks: 10, quizId: "quiz-a" }] : scope.batchId === "batch-b" ? [{ id: "attempt-b", studentId: "student-b", score: 9, totalMarks: 10, quizId: "quiz-b" }] : []);
vi.mock("../lib/firebase", () => ({ hasFirebaseConfiguration: true }));
vi.mock("../lib/course-batch-service", () => ({
  loadCourses: async () => [{ id: "course-1", title: "Course 1", isActive: true, enrolledStudentIds: [] }],
  loadAllBatches: async () => [
    { id: "batch-a", courseId: "course-1", name: "Batch A", isActive: true, enrolledStudentIds: [] },
    { id: "batch-b", courseId: "course-1", name: "Batch B", isActive: true, enrolledStudentIds: [] },
  ],
}));
vi.mock("../lib/quiz-attempt-review-service", () => ({ loadBatchQuizAttempts: (scope: CourseBatchScope) => loadAttempts(scope) }));

const records = { ...emptyOfflineRecords, attendance: [{ id: "attendance-a", title: "Student A", description: "", status: "Present", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-a" } }, { id: "attendance-b", title: "Student B", description: "", status: "Absent", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-b" } }] };

function DashboardHarness() {
  const [scope, setScope] = useState<CourseBatchScope>({ courseId: "", batchId: "" });
  const data = buildCourseBatchDashboardData(records, scope);
  return <><CourseBatchScopeControls value={scope} onChange={setScope} /><p data-testid="attendance-output">{data.visibleRecords.attendance.map(item => item.id).join(",") || "no-attendance"}</p><ScopedQuizAttemptReview scope={scope} /></>;
}

describe("Admin Dashboard scoped review integration", () => {
  it("shows no private attendance or attempts until scoped, then updates both modules when the batch changes", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><DashboardHarness /></QueryClientProvider>);
    expect(screen.getByTestId("attendance-output").textContent).toBe("no-attendance");
    expect(screen.getByText("Select a course and batch to review only that batch’s scores.")).toBeTruthy();
    await screen.findByRole("option", { name: "Course 1 — Batch A" });
    const pair = screen.getByRole("combobox", { name: "Filter by course and batch" });
    fireEvent.change(pair, { target: { value: "batch-a" } });
    await waitFor(() => expect(screen.getByText("Student student-a · Quiz quiz-a")).toBeTruthy());
    expect(screen.getByTestId("attendance-output").textContent).toBe("attendance-a");
    fireEvent.change(pair, { target: { value: "batch-b" } });
    await waitFor(() => expect(screen.getByText("Student student-b · Quiz quiz-b")).toBeTruthy());
    expect(screen.queryByText("Student student-a · Quiz quiz-a")).toBeNull();
    expect(screen.getByTestId("attendance-output").textContent).toBe("attendance-b");
    expect(loadAttempts).toHaveBeenCalledWith({ courseId: "course-1", batchId: "batch-a" });
    expect(loadAttempts).toHaveBeenCalledWith({ courseId: "course-1", batchId: "batch-b" });
  });
});
