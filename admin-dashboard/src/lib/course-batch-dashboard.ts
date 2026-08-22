import type { OfflineRecords } from "./offline-records";
import { filterScopedAdminRecords, type CourseBatchScope } from "./course-batch-scope";

export function quizAttemptReviewQueryKey(scope: CourseBatchScope) {
  return ["admin", "quiz-attempts", scope.courseId, scope.batchId] as const;
}

export function buildCourseBatchDashboardData(records: OfflineRecords, scope: CourseBatchScope) {
  return { visibleRecords: filterScopedAdminRecords(records, scope), quizAttemptKey: quizAttemptReviewQueryKey(scope) };
}
