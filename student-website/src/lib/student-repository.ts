import { doc, getDoc, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { demoAnnouncements, demoAttendance, demoLessons, type Announcement, type Lesson } from "@/lib/student-data";
import { firestore } from "@/lib/firebase";

export type StudentProfile = { id: string; name: string; email: string; studentId: string; avatarUrl?: string };

export async function getStudentProfile(userId: string): Promise<StudentProfile> {
  if (!firestore) return { id: userId, name: "Student", email: "student@example.com", studentId: "TL-2026-001" };
  const snapshot = await getDoc(doc(firestore, "students", userId));
  if (!snapshot.exists()) return { id: userId, name: "Student", email: "", studentId: "Pending" };
  return { id: snapshot.id, ...(snapshot.data() as Omit<StudentProfile, "id">) };
}

export async function getPublishedAnnouncements(): Promise<Announcement[]> {
  if (!firestore) return demoAnnouncements;
  const snapshot = await getDocs(query(collection(firestore, "announcements"), where("published", "==", true), orderBy("sortOrder", "asc"), limit(8)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Announcement, "id">) }));
}

export async function getPublishedLessons(): Promise<Lesson[]> {
  if (!firestore) return demoLessons;
  const snapshot = await getDocs(query(collection(firestore, "lessons"), where("published", "==", true), orderBy("sortOrder", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Lesson, "id">) }));
}

export async function getStudentAttendance(_studentId: string) {
  if (!firestore) return demoAttendance;
  const snapshot = await getDocs(query(collection(firestore, "attendance"), where("studentId", "==", _studentId), orderBy("date", "desc"), limit(30)));
  return snapshot.docs.map((item) => item.data());
}
