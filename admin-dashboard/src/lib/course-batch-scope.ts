import type { OfflineRecords } from "./offline-records";

export type CourseBatchScope = { courseId: string; batchId: string };

export function filterScopedAdminRecords(records: OfflineRecords, scope: CourseBatchScope): OfflineRecords {
  if (!scope.courseId && !scope.batchId) return records;
  if (!scope.courseId || !scope.batchId) return { ...records, quizzes: [], attendance: [] };
  const matches = (fields: Record<string, string>) => fields.courseId === scope.courseId && fields.batchId === scope.batchId;
  return { ...records, quizzes: records.quizzes.filter(item => matches(item.fields ?? {})), attendance: records.attendance.filter(item => matches(item.fields ?? {})) };
}
