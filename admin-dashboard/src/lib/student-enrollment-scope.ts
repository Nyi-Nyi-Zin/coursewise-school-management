import type { EnrollmentRecord } from "./course-batch-service";

export function groupActiveEnrollmentsByStudent(enrollments: EnrollmentRecord[]) {
  const grouped = new Map<string, EnrollmentRecord[]>();
  for (const enrollment of enrollments) {
    if (enrollment.status !== "active") continue;
    const current = grouped.get(enrollment.studentId) ?? [];
    current.push(enrollment);
    grouped.set(enrollment.studentId, current);
  }
  return grouped;
}

export function enrollmentMatchesScope(
  enrollments: EnrollmentRecord[],
  scope: { courseId: string; batchId: string }
) {
  return enrollments.some(
    enrollment =>
      (!scope.courseId || enrollment.courseId === scope.courseId) &&
      (!scope.batchId || enrollment.batchId === scope.batchId)
  );
}
