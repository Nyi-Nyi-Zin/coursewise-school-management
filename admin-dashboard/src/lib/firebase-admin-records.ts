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
  if (section === 'students') {
    return { name: item.title, studentId: item.description, isActive: item.status === 'Active', role: 'student', createdAt: serverTimestamp() };
  }
  if (section === 'announcements') {
    return { title: item.title, description: item.description, isPublished: item.status === 'Published', sortOrder: Date.now(), createdAt: serverTimestamp() };
  }
  if (section === 'lessons') {
    return { title: item.title, description: item.description, isPublished: item.status === 'Published', sortOrder: Date.now(), createdAt: serverTimestamp() };
  }
  if (section === 'quizzes') {
    return { title: item.title, description: item.description, isPublished: item.status === 'Published', totalMarks: 0, createdAt: serverTimestamp() };
  }
  return { studentId: item.title, note: item.description, status: item.status, date: new Date().toISOString().slice(0, 10), createdAt: serverTimestamp() };
}

function firebaseItem(section: ManagementSection, id: string, data: Record<string, unknown>): OfflineItem {
  if (section === 'students') return { id, title: String(data.name ?? 'Student'), description: String(data.studentId ?? ''), status: data.isActive === false ? 'Inactive' : 'Active', createdAt: 'Firebase' };
  if (section === 'attendance') return { id, title: String(data.studentId ?? ''), description: String(data.note ?? ''), status: String(data.status ?? 'Present'), createdAt: String(data.date ?? 'Firebase') };
  return { id, title: String(data.title ?? 'Record'), description: String(data.description ?? ''), status: data.isPublished === true ? 'Published' : 'Draft', createdAt: 'Firebase' };
}
