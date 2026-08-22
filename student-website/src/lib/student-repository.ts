import { doc, getDoc, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { demoAnnouncements, demoAttendance, demoLessons, type Announcement, type Lesson } from "@/lib/student-data";
import { firestore } from "@/lib/firebase";

export type StudentProfile = { id: string; name: string; email: string; studentId: string; avatarUrl?: string; activeCourseId?: string; activeBatchId?: string };
export type EnrollmentContext = { courseId: string; batchId: string; courseTitle: string; batchName: string };
export type PrivateQuizAttempt = { id: string; quizId: string; courseId: string; batchId: string; score: number; totalMarks: number; submittedAt?: string };
export type BatchQuiz = { id: string; title: string; description: string; durationMinutes: number; totalMarks: number };

export async function getStudentProfile(userId: string): Promise<StudentProfile> {
  if (!firestore) return { id: userId, name: "Student", email: "student@example.com", studentId: "TL-2026-001" };
  const snapshot = await getDoc(doc(firestore, "users", userId));
  if (!snapshot.exists()) return { id: userId, name: "Student", email: "", studentId: "Pending" };
  return { id: snapshot.id, ...(snapshot.data() as Omit<StudentProfile, "id">) };
}

export async function getStudentEnrollmentContext(userId: string): Promise<EnrollmentContext | null> {
  if (!firestore) return { courseId: "demo-web", batchId: "demo-batch", courseTitle: "Web Engineering", batchName: "Demo learning batch" };
  const user = await getDoc(doc(firestore, "users", userId));
  const courseId = String(user.data()?.activeCourseId ?? "");
  const batchId = String(user.data()?.activeBatchId ?? "");
  if (!courseId || !batchId) return null;
  const [course, batch] = await Promise.all([getDoc(doc(firestore, "courses", courseId)), getDoc(doc(firestore, "courses", courseId, "batches", batchId))]);
  if (!course.exists() || !batch.exists()) return null;
  return { courseId, batchId, courseTitle: String(course.data().title ?? "Course"), batchName: String(batch.data().name ?? "Batch") };
}

export async function getPublishedAnnouncements(courseId?: string, batchId?: string): Promise<Announcement[]> {
  if (!firestore) return demoAnnouncements;
  if (!courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "announcements"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("isPublished", "==", true), orderBy("sortOrder", "asc"), limit(8)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Announcement, "id">) }));
}

export async function getPublishedLessons(courseId?: string, batchId?: string): Promise<Lesson[]> {
  if (!firestore) return demoLessons;
  if (!courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "lessons"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("isPublished", "==", true), orderBy("sortOrder", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Lesson, "id">) }));
}

export async function getStudentAttendance(studentId: string, courseId?: string, batchId?: string) {
  if (!firestore) return demoAttendance;
  if (!courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "attendance"), where("studentId", "==", studentId), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("date", "desc"), limit(30)));
  return snapshot.docs.map((item) => item.data());
}

export async function getStudentQuizAttempts(studentId: string, courseId?: string, batchId?: string): Promise<PrivateQuizAttempt[]> {
  if (!firestore || !courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "quizAttempts"), where("studentId", "==", studentId), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("submittedAt", "desc"), limit(30)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<PrivateQuizAttempt, "id">) }));
}

export async function getBatchQuizzes(courseId?: string, batchId?: string): Promise<BatchQuiz[]> {
  if (!firestore || !courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "quizzes"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("isPublished", "==", true), orderBy("title", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<BatchQuiz, "id">) }));
}
