import { describe, expect, it } from "vitest";
import { emptyOfflineRecords } from "./offline-records";
import { buildCourseBatchDashboardData } from "./course-batch-dashboard";

describe("buildCourseBatchDashboardData", () => {
  const records = { ...emptyOfflineRecords, quizzes: [{ id: "quiz-a", title: "Batch A quiz", description: "", status: "Published", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-a" } }, { id: "quiz-b", title: "Batch B quiz", description: "", status: "Published", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-b" } }], attendance: [{ id: "attendance-a", title: "student-a", description: "", status: "Present", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-a" } }, { id: "attendance-b", title: "student-b", description: "", status: "Absent", createdAt: "now", fields: { courseId: "course-1", batchId: "batch-b" } }] };

  it("uses the selected scope in both attendance rendering and the quiz-attempt query key", () => {
    const batchA = buildCourseBatchDashboardData(records, { courseId: "course-1", batchId: "batch-a" });
    expect(batchA.visibleRecords.attendance.map(item => item.id)).toEqual(["attendance-a"]);
    expect(batchA.visibleRecords.quizzes.map(item => item.id)).toEqual(["quiz-a"]);
    expect(batchA.quizAttemptKey).toEqual(["admin", "quiz-attempts", "course-1", "batch-a"]);
  });

  it("changes both records and the requested quiz-attempt scope when the selector changes batches", () => {
    const batchB = buildCourseBatchDashboardData(records, { courseId: "course-1", batchId: "batch-b" });
    expect(batchB.visibleRecords.attendance.map(item => item.id)).toEqual(["attendance-b"]);
    expect(batchB.visibleRecords.quizzes.map(item => item.id)).toEqual(["quiz-b"]);
    expect(batchB.quizAttemptKey).toEqual(["admin", "quiz-attempts", "course-1", "batch-b"]);
  });

  it("shows all attendance and quizzes when all course-batch pairs are selected", () => {
    const unselected = buildCourseBatchDashboardData(records, { courseId: "", batchId: "" });
    expect(unselected.visibleRecords.attendance.map(item => item.id)).toEqual(["attendance-a", "attendance-b"]);
    expect(unselected.visibleRecords.quizzes.map(item => item.id)).toEqual(["quiz-a", "quiz-b"]);
    expect(unselected.quizAttemptKey).toEqual(["admin", "quiz-attempts", "", ""]);
  });
});
