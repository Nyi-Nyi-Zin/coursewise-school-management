import { describe, expect, it } from "vitest";

import {
  enrollmentMatchesScope,
  groupActiveEnrollmentsByStudent,
} from "./student-enrollment-scope";

describe("student enrollment scope", () => {
  it("keeps every active enrollment for a student and matches any selected pair", () => {
    const grouped = groupActiveEnrollmentsByStudent([
      { id: "python-batch-2-student-1", studentId: "student-1", courseId: "python", batchId: "batch-2", status: "active" },
      { id: "web-batch-1-student-1", studentId: "student-1", courseId: "web", batchId: "batch-1", status: "active" },
      { id: "python-old-student-1", studentId: "student-1", courseId: "python", batchId: "old-batch", status: "inactive" },
    ]);

    const enrollments = grouped.get("student-1") ?? [];
    expect(enrollments).toHaveLength(2);
    expect(enrollmentMatchesScope(enrollments, { courseId: "python", batchId: "batch-2" })).toBe(true);
    expect(enrollmentMatchesScope(enrollments, { courseId: "python", batchId: "missing" })).toBe(false);
  });
});
