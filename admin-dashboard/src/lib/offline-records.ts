export type ManagementSection = 'students' | 'announcements' | 'lessons' | 'quizzes' | 'attendance';
export type OfflineItem = { id: string; title: string; description: string; status: string; createdAt: string; fields?: Record<string, string> };
export type OfflineRecords = Record<ManagementSection, OfflineItem[]>;

export const emptyOfflineRecords: OfflineRecords = {
  students: [],
  announcements: [],
  lessons: [],
  quizzes: [],
  attendance: [],
};

export function saveOfflineRecord(records: OfflineRecords, section: ManagementSection, item: OfflineItem): OfflineRecords {
  const existing = records[section].some(record => record.id === item.id);
  return {
    ...records,
    [section]: existing ? records[section].map(record => record.id === item.id ? item : record) : [item, ...records[section]],
  };
}

export function removeOfflineRecord(records: OfflineRecords, section: ManagementSection, id: string): OfflineRecords {
  return { ...records, [section]: records[section].filter(record => record.id !== id) };
}
