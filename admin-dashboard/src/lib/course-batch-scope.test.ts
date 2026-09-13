import { describe, expect, it } from "vitest";
import { emptyOfflineRecords } from "./offline-records";
import { filterScopedAdminRecords } from "./course-batch-scope";

describe("filterScopedAdminRecords", () => {
  it("keeps attendance and quizzes in the selected course and batch only", () => {
    const records = { ...emptyOfflineRecords, quizzes: [{ id: "qa", title: "Quiz A", description: "", status: "Published", createdAt: "now", fields: { courseId: "course-a", batchId: "batch-a" } }, { id: "qb", title: "Quiz B", description: "", status: "Published", createdAt: "now", fields: { courseId: "course-a", batchId: "batch-b" } }], attendance: [{ id: "aa", title: "student-a", description: "", status: "Present", createdAt: "now", fields: { courseId: "course-a", batchId: "batch-a" } }, { id: "ab", title: "student-b", description: "", status: "Absent", createdAt: "now", fields: { courseId: "course-b", batchId: "batch-b" } }] };
    const scoped = filterScopedAdminRecords(records, { courseId: "course-a", batchId: "batch-a" });
    expect(scoped.quizzes.map(item => item.id)).toEqual(["qa"]);
    expect(scoped.attendance.map(item => item.id)).toEqual(["aa"]);
  });

  it("keeps every quiz and attendance record for the all-pairs scope", () => {
    const records = { ...emptyOfflineRecords, quizzes: [{ id: "qa", title: "Quiz A", description: "", status: "Published", createdAt: "now" }], attendance: [{ id: "aa", title: "student-a", description: "", status: "Present", createdAt: "now" }] };
    expect(filterScopedAdminRecords(records, { courseId: "", batchId: "" })).toBe(records);
  });
});
