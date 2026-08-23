import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';

import { getFirebaseClient } from './firebase';
import type { ManagementSection, OfflineItem } from './offline-records';

export async function saveFirebaseAdminRecord(section: ManagementSection, item: OfflineItem) {
  const { db } = getFirebaseClient();
  const target = doc(db, collectionName(section), item.id);
  await setDoc(target, { ...firebaseData(section, item), updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteFirebaseAdminRecord(section: ManagementSection, id: string) {
  const { db } = getFirebaseClient();
  await deleteDoc(doc(db, collectionName(section), id));
}

export async function loadFirebaseAdminRecords(section: ManagementSection): Promise<OfflineItem[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, collectionName(section)));
  return snapshot.docs
    .filter(record => section !== 'students' || record.data().role === 'student')
    .map(record => firebaseItem(section, record.id, record.data() as Record<string, unknown>));
}

function collectionName(section: ManagementSection) {
  // Student accounts and their profiles live in /users.  The old /students
  // collection was a legacy admin-only directory, so reading it caused the
  // Students page to appear empty even when real student accounts existed.
  return section === 'students' ? 'users' : section;
}

function firebaseData(section: ManagementSection, item: OfflineItem) {
  const fields = item.fields ?? {};
  if (section === 'students') {
    return { name: item.title, studentId: fields.studentId ?? item.description, email: fields.email ?? null, photoUrl: fields.photoUrl ?? null, isActive: item.status === 'Active', role: 'student', createdAt: serverTimestamp() };
  }
  if (section === 'announcements') {
    return { title: item.title, description: item.description, courseId: fields.courseId ?? null, batchId: fields.batchId ?? null, bannerUrl: fields.bannerUrl ?? null, isPublished: item.status === 'Published', sortOrder: numericSortOrder(fields.sortOrder), createdAt: serverTimestamp() };
  }
  if (section === 'lessons') {
    return { title: item.title, description: item.description, courseId: fields.courseId ?? null, batchId: fields.batchId ?? null, thumbnailUrl: fields.thumbnailUrl ?? null, telegramUrl: fields.telegramUrl ?? null, videoUrl: fields.videoUrl ?? null, pdfUrl: fields.pdfUrl ?? null, isPublished: item.status === 'Published', sortOrder: numericSortOrder(fields.sortOrder), createdAt: serverTimestamp() };
  }
  if (section === 'assignments') {
    return { title: item.title, description: item.description, courseId: fields.courseId ?? null, batchId: fields.batchId ?? null, resourceUrl: fields.resourceUrl ?? null, submissionInstructions: fields.submissionInstructions ?? null, dueAt: fields.dueAt ? new Date(fields.dueAt).toISOString() : null, isPublished: item.status === 'Published', createdAt: serverTimestamp() };
  }
  if (section === 'quizzes') {
    return { title: item.title, description: item.description, courseId: fields.courseId ?? null, batchId: fields.batchId ?? null, isPublished: item.status === 'Published', durationMinutes: Number(fields.durationMinutes ?? 0), totalMarks: Number(fields.totalMarks ?? 0), opensAt: fields.opensAt ? new Date(fields.opensAt).toISOString() : null, closesAt: fields.closesAt ? new Date(fields.closesAt).toISOString() : null, createdAt: serverTimestamp() };
  }
  return { studentId: item.title, courseId: fields.courseId ?? null, batchId: fields.batchId ?? null, note: item.description, status: item.status, date: fields.date ?? new Date().toISOString().slice(0, 10), createdAt: serverTimestamp() };
}

function firebaseItem(section: ManagementSection, id: string, data: Record<string, unknown>): OfflineItem {
  if (section === 'students') return { id, title: String(data.name ?? 'Student'), description: '', status: data.isActive === false ? 'Inactive' : 'Active', createdAt: 'Firebase', fields: { studentId: String(data.studentId ?? ''), email: String(data.email ?? ''), photoUrl: String(data.photoUrl ?? '') } };
  if (section === 'attendance') return { id, title: String(data.studentId ?? ''), description: String(data.note ?? ''), status: String(data.status ?? 'Present'), createdAt: 'Firebase', fields: { courseId: String(data.courseId ?? ''), batchId: String(data.batchId ?? ''), date: String(data.date ?? '') } };
  if (section === 'announcements') return { id, title: String(data.title ?? 'Announcement'), description: String(data.description ?? ''), status: data.isPublished === true ? 'Published' : 'Draft', createdAt: 'Firebase', fields: { courseId: String(data.courseId ?? ''), batchId: String(data.batchId ?? ''), bannerUrl: String(data.bannerUrl ?? ''), sortOrder: String(data.sortOrder ?? '') } };
  if (section === 'lessons') return { id, title: String(data.title ?? 'Lesson'), description: String(data.description ?? ''), status: data.isPublished === true ? 'Published' : 'Draft', createdAt: 'Firebase', fields: { courseId: String(data.courseId ?? ''), batchId: String(data.batchId ?? ''), thumbnailUrl: String(data.thumbnailUrl ?? ''), telegramUrl: String(data.telegramUrl ?? ''), videoUrl: String(data.videoUrl ?? ''), pdfUrl: String(data.pdfUrl ?? ''), sortOrder: String(data.sortOrder ?? '') } };
  if (section === 'assignments') return { id, title: String(data.title ?? 'Assignment'), description: String(data.description ?? ''), status: data.isPublished === true ? 'Published' : 'Draft', createdAt: 'Firebase', fields: { courseId: String(data.courseId ?? ''), batchId: String(data.batchId ?? ''), resourceUrl: String(data.resourceUrl ?? ''), submissionInstructions: String(data.submissionInstructions ?? ''), dueAt: toDateTimeLocal(data.dueAt) } };
  return { id, title: String(data.title ?? 'Quiz'), description: String(data.description ?? ''), status: data.isPublished === true ? 'Published' : 'Draft', createdAt: 'Firebase', fields: { courseId: String(data.courseId ?? ''), batchId: String(data.batchId ?? ''), durationMinutes: String(data.durationMinutes ?? ''), totalMarks: String(data.totalMarks ?? ''), opensAt: toDateTimeLocal(data.opensAt), closesAt: toDateTimeLocal(data.closesAt) } };
}

function toDateTimeLocal(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function numericSortOrder(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}
