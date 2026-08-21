import { describe, expect, it } from 'vitest';
import { emptyOfflineRecords, removeOfflineRecord, saveOfflineRecord } from '../admin-dashboard/src/lib/offline-records';

describe('Next.js offline administration records', () => {
  it('creates, edits, and deletes a student record without affecting other modules', () => {
    const created = saveOfflineRecord(emptyOfflineRecords, 'students', {
      id: 'student-1',
      title: 'Student One',
      description: 'STU-100',
      status: 'Active',
      createdAt: '2026-08-22',
    });
    expect(created.students).toHaveLength(1);
    expect(created.lessons).toEqual([]);

    const updated = saveOfflineRecord(created, 'students', {
      ...created.students[0],
      status: 'Inactive',
    });
    expect(updated.students).toHaveLength(1);
    expect(updated.students[0]?.status).toBe('Inactive');

    const removed = removeOfflineRecord(updated, 'students', 'student-1');
    expect(removed.students).toEqual([]);
  });

  it('keeps attendance status values exact when storing an offline record', () => {
    const records = saveOfflineRecord(emptyOfflineRecords, 'attendance', {
      id: 'attendance-1',
      title: 'STU-100',
      description: 'First period',
      status: 'Excused',
      createdAt: '2026-08-22',
    });
    expect(records.attendance[0]?.status).toBe('Excused');
  });
});
