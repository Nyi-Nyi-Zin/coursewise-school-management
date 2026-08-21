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
  return snapshot.docs.map(record => firebaseItem(section, record.id, record.data() as Record<string, unknown>));
}

function collectionName(section: ManagementSection) {
  return section;
}

function firebaseData(section: ManagementSection, item: OfflineItem) {
  const fields = item.fields ?? {};
  if (section === 'students') {
    return { name: item.title, studentId: fields.studentId ?? item.description, email: fields.email ?? null, photoUrl: fields.photoUrl ?? null, isActive: item.status === 'Active', role: 'student', createdAt: serverTimestamp() };
  }
  if (section === 'announcements') {
    return { title: item.title, description: item.description, bannerUrl: fields.bannerUrl ?? null, linkUrl: fields.linkUrl ?? null, isPublished: item.status === 'Published', sortOrder: Number(fields.sortOrder ?? Date.now()), createdAt: serverTimestamp() };
  }
  if (section === 'lessons') {
    return { title: item.title, description: item.description, thumbnailUrl: fields.thumbnailUrl ?? null, telegramUrl: fields.telegramUrl ?? null, videoUrl: fields.videoUrl ?? null, pdfUrl: fields.pdfUrl ?? null, isPublished: item.status === 'Published', sortOrder: Number(fields.sortOrder ?? Date.now()), createdAt: serverTimestamp() };
  }
  if (section === 'quizzes') {
    return { title: item.title, description: item.description, isPublished: item.status === 'Published', durationMinutes: Number(fields.durationMinutes ?? 0), totalMarks: Number(fields.totalMarks ?? 0), createdAt: serverTimestamp() };
  }
  return { studentId: item.title, note: item.description, status: item.status, date: fields.date ?? new Date().toISOString().slice(0, 10), createdAt: serverTimestamp() };
}

function firebaseItem(section: ManagementSection, id: string, data: Record<string, unknown>): OfflineItem {
  if (section === 'students') return { id, title: String(data.name ?? 'Student'), description: '', status: data.isActive === false ? 'Inactive' : 'Active', createdAt: 'Firebase', fields: { studentId: String(data.studentId ?? ''), email: String(data.email ?? ''), photoUrl: String(data.photoUrl ?? '') } };
  if (section === 'attendance') return { id, title: String(data.studentId ?? ''), description: String(data.note ?? ''), status: String(data.status ?? 'Present'), createdAt: 'Firebase', fields: { date: String(data.date ?? '') } };
  if (section === 'announcements') return { id, title: String(data.title ?? 'Announcement'), description: String(data.description ?? ''), status: data.isPublished === true ? 'Published' : 'Draft', createdAt: 'Firebase', fields: { bannerUrl: String(data.bannerUrl ?? ''), linkUrl: String(data.linkUrl ?? ''), sortOrder: String(data.sortOrder ?? '') } };
  if (section === 'lessons') return { id, title: String(data.title ?? 'Lesson'), description: String(data.description ?? ''), status: data.isPublished === true ? 'Published' : 'Draft', createdAt: 'Firebase', fields: { thumbnailUrl: String(data.thumbnailUrl ?? ''), telegramUrl: String(data.telegramUrl ?? ''), videoUrl: String(data.videoUrl ?? ''), pdfUrl: String(data.pdfUrl ?? ''), sortOrder: String(data.sortOrder ?? '') } };
  return { id, title: String(data.title ?? 'Quiz'), description: String(data.description ?? ''), status: data.isPublished === true ? 'Published' : 'Draft', createdAt: 'Firebase', fields: { durationMinutes: String(data.durationMinutes ?? ''), totalMarks: String(data.totalMarks ?? '') } };
}
