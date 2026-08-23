import { doc, getDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { demoAnnouncements, demoAttendance, demoLessons, type Announcement, type Lesson } from "@/lib/student-data";
import { firebaseFunctions, firestore } from "@/lib/firebase";
import { uploadStudentPhotoToCloudinary } from "@/lib/cloudinary-upload-service";

export type StudentProfile = { id: string; name: string; email: string; studentId: string; photoUrl?: string; activeCourseId?: string; activeBatchId?: string };
export type EnrollmentContext = { courseId: string; batchId: string; courseTitle: string; batchName: string };
export type PrivateQuizAttempt = { id: string; quizId: string; courseId: string; batchId: string; score: number; totalMarks: number; submittedAt?: string };
export type BatchQuiz = { id: string; title: string; description: string; durationMinutes: number; totalMarks: number; opensAt?: string | null; closesAt?: string | null };
export type QuizQuestion = { id: string; prompt: string; options: string[]; marks: number };
export type SubmittedQuizAnswer = { questionId: string; selectedAnswerIndex: number };
export type QuizSubmissionResult = { score: number; totalMarks: number; percentage: number };

export async function getStudentProfile(userId: string): Promise<StudentProfile> {
  if (!firestore) return { id: userId, name: "Student", email: "student@example.com", studentId: "TL-2026-001" };
  const snapshot = await getDoc(doc(firestore, "users", userId));
  if (!snapshot.exists()) return { id: userId, name: "Student", email: "", studentId: "Pending" };
  return { id: snapshot.id, ...(snapshot.data() as Omit<StudentProfile, "id">) };
}

export async function uploadStudentPhoto(userId: string, file: File): Promise<string> {
  if (!firestore) throw new Error("Profile photos are only available in Firebase mode.");
  const photoUrl = await uploadStudentPhotoToCloudinary(file);
  await updateDoc(doc(firestore, "users", userId), { photoUrl, updatedAt: serverTimestamp() });
  return photoUrl;
}

export async function getStudentEnrollmentContext(userId: string): Promise<EnrollmentContext | null> {
  if (!firestore) return { courseId: "demo-web", batchId: "demo-batch", courseTitle: "Web Engineering", batchName: "Demo learning batch" };
  const user = await getDoc(doc(firestore, "users", userId));
  const courseId = String(user.data()?.activeCourseId ?? "");
  const batchId = String(user.data()?.activeBatchId ?? "");
  if (!courseId || !batchId) return null;
  const [course, batch] = await Promise.all([getDoc(doc(firestore, "courses", courseId)), getDoc(doc(firestore, "batches", batchId))]);
  if (!course.exists() || !batch.exists()) return null;
  return { courseId, batchId, courseTitle: String(course.data().title ?? "Course"), batchName: String(batch.data().name ?? "Batch") };
}

export async function getPublishedAnnouncements(courseId?: string, batchId?: string): Promise<Announcement[]> {
  if (!firestore) return demoAnnouncements;
  if (!courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "announcements"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("isPublished", "==", true), orderBy("sortOrder", "asc"), limit(8)));
  return snapshot.docs.map((item) => {
    const data = item.data();
    const publishedAt = data.publishedAt as string ?? (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : "") ?? "";
    return { id: item.id, title: String(data.title ?? "Announcement"), description: String(data.description ?? ""), bannerUrl: data.bannerUrl as string | undefined, linkUrl: data.linkUrl as string | undefined, publishedAt, accent: "from-sky-400/30 via-blue-500/20 to-transparent" } satisfies Announcement;
  });
}

export async function getPublishedLessons(courseId?: string, batchId?: string): Promise<Lesson[]> {
  if (!firestore) return demoLessons;
  if (!courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "lessons"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("isPublished", "==", true), orderBy("sortOrder", "asc")));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, title: String(data.title ?? "Lesson"), description: String(data.description ?? ""), module: String(data.module ?? "Module"), duration: String(data.duration ?? ""), thumbnailUrl: data.thumbnailUrl as string | undefined, telegramUrl: data.telegramUrl as string | undefined, videoUrl: data.videoUrl as string | undefined, pdfUrl: data.pdfUrl as string | undefined, status: "new" } satisfies Lesson;
  });
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
  const now = Date.now();
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<BatchQuiz, "id">) })).filter((quiz) => (!quiz.opensAt || new Date(quiz.opensAt).getTime() <= now) && (!quiz.closesAt || new Date(quiz.closesAt).getTime() > now));
}

export async function getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  if (!firestore || !quizId) return [];
  const snapshot = await getDocs(query(collection(firestore, "quizzes", quizId, "questions"), orderBy("sortOrder", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, prompt: String(item.data().prompt ?? ""), options: Array.isArray(item.data().options) ? item.data().options.map(String) : [], marks: Number(item.data().marks ?? 1) }));
}

export async function submitQuizAttempt(quizId: string, answers: SubmittedQuizAnswer[]): Promise<QuizSubmissionResult> {
  if (!firebaseFunctions) throw new Error("Quiz submission is only available in Firebase mode.");
  const callable = httpsCallable<{ quizId: string; answers: SubmittedQuizAnswer[] }, QuizSubmissionResult>(firebaseFunctions, "submitQuizAttempt");
  const response = await callable({ quizId, answers });
  return { score: Number(response.data.score ?? 0), totalMarks: Number(response.data.totalMarks ?? 0), percentage: Number(response.data.percentage ?? 0) };
}
