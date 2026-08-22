import { emptyOfflineRecords, removeOfflineRecord, saveOfflineRecord, type ManagementSection, type OfflineItem, type OfflineRecords } from "./offline-records";

export const adminRecordQueryKey = ["admin", "records"] as const;
export const adminSections: ManagementSection[] = ["students", "announcements", "lessons", "quizzes", "attendance"];

export function mergeAdminRecordSave(records: OfflineRecords | undefined, section: ManagementSection, item: OfflineItem) {
  return saveOfflineRecord(records ?? emptyOfflineRecords, section, item);
}

export function mergeAdminRecordDelete(records: OfflineRecords | undefined, section: ManagementSection, id: string) {
  return removeOfflineRecord(records ?? emptyOfflineRecords, section, id);
}
