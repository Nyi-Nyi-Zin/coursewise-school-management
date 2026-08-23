// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CourseBatchScopeControls } from "./course-batch-scope-controls";
import { buildCourseBatchDashboardData } from "../lib/course-batch-dashboard";
import { emptyOfflineRecords } from "../lib/offline-records";
import type { CourseBatchScope } from "../lib/course-batch-scope";

vi.mock("../lib/firebase", () => ({ hasFirebaseConfiguration: false }));

const records = { ...emptyOfflineRecords, quizzes: [{ id: "quiz-a", title: "Quiz A", description: "", status: "Published", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-a" } }, { id: "quiz-b", title: "Quiz B", description: "", status: "Published", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-b" } }], attendance: [{ id: "attendance-a", title: "Student A", description: "", status: "Present", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-a" } }, { id: "attendance-b", title: "Student B", description: "", status: "Absent", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-b" } }] };

function ScopeHarness() {
  const [scope, setScope] = useState<CourseBatchScope>({ courseId: "", batchId: "" });
  const data = buildCourseBatchDashboardData(records, scope);
  return <><CourseBatchScopeControls value={scope} onChange={setScope} /><p data-testid="attendance">{data.visibleRecords.attendance.map(item => item.id).join(",") || "none"}</p><p data-testid="quizzes">{data.visibleRecords.quizzes.map(item => item.id).join(",") || "none"}</p><p data-testid="review-key">{data.quizAttemptKey.join("|")}</p></>;
}

describe("CourseBatchScopeControls integration", () => {
  it("hides records without a full scope, then updates attendance and quiz review together when the selected batch changes", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ScopeHarness /></QueryClientProvider>);
    expect(screen.getByTestId("attendance").textContent).toBe("none");
    expect(screen.getByTestId("quizzes").textContent).toBe("none");
    fireEvent.change(screen.getByPlaceholderText("Local course ID"), { target: { value: "course-1" } });
    fireEvent.change(screen.getByPlaceholderText("Local batch ID"), { target: { value: "batch-a" } });
    expect(screen.getByTestId("attendance").textContent).toBe("attendance-a");
    expect(screen.getByTestId("quizzes").textContent).toBe("quiz-a");
    expect(screen.getByTestId("review-key").textContent).toBe("admin|quiz-attempts|course-1|batch-a");
    fireEvent.change(screen.getByPlaceholderText("Local batch ID"), { target: { value: "batch-b" } });
    expect(screen.getByTestId("attendance").textContent).toBe("attendance-b");
    expect(screen.getByTestId("quizzes").textContent).toBe("quiz-b");
    expect(screen.getByTestId("review-key").textContent).toBe("admin|quiz-attempts|course-1|batch-b");
  });
});
