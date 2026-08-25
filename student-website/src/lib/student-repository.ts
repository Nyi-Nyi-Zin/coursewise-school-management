import { addDoc, doc, getDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { demoAnnouncements, demoAttendance, demoLessons, type Announcement, type Lesson } from "@/lib/student-data";
import { firebaseFunctions, firestore } from "@/lib/firebase";
import { uploadStudentPhotoToCloudinary } from "@/lib/cloudinary-upload-service";

export type StudentProfile = { id: string; name: string; email: string; studentId: string; photoUrl?: string; activeCourseId?: string; activeBatchId?: string };
export type EnrollmentContext = { courseId: string; batchId: string; courseTitle: string; batchName: string };
export type PrivateQuizAttempt = { id: string; quizId: string; courseId: string; batchId: string; score: number; totalMarks: number; submittedAt?: string };
export type QuizKind = "chapter_quiz" | "final_exam";
export type BatchQuiz = { id: string; title: string; description: string; durationMinutes: number; totalMarks: number; kind: QuizKind; chapter?: string; passingPercent?: number; maxRetakes?: number; opensAt?: string | null; closesAt?: string | null };
export type QuizQuestionType = "multiple_choice" | "multiple_select" | "true_false";
export type QuizQuestion = { id: string; prompt: string; options: string[]; marks: number; type?: QuizQuestionType };
export type SubmittedQuizAnswer = { questionId: string; selectedAnswerIndex: number; selectedIndices?: number[] };
export type QuestionReviewItem = { questionId: string; selectedIndex: number | null; selectedIndices: number[]; correctAnswerIndex: number; correctAnswerIndices: number[]; marksEarned: number };
export type QuizSubmissionResult = { id: string; kind: QuizKind; score: number; totalMarks: number; percentage: number; passed: boolean; attemptNumber: number; attemptCount: number; remainingAttempts: number | null; timeSpentSeconds: number; review?: QuestionReviewItem[] };
export type QuizResultsSummary = { quizId: string; kind: QuizKind; title: string; chapter: string; passingPercent: number; attemptCount: number; remainingAttempts: number | null; bestPercentage: number; passed: boolean; latest: { score: number; totalMarks: number; percentage: number; passed: boolean; timeSpentSeconds: number; submittedAtMillis: number | null } | null };
export type Assignment = { id: string; title: string; description: string; courseId: string; batchId: string; dueAt?: string; resourceUrl?: string; submissionInstructions?: string };
export type AssignmentSubmission = { id: string; assignmentId: string; submittedAt?: string; submissionText?: string; submissionUrl?: string; feedback?: string; score?: number | null };

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
  // Course or batch profile documents may be unreadable for freshly enrolled
  // students; that must never erase the enrollment itself, so fall back to
  // generic titles and let the scoped content queries decide visibility.
  const [course, batch] = await Promise.all([
    getDoc(doc(firestore, "courses", courseId)).catch(() => null),
    getDoc(doc(firestore, "batches", batchId)).catch(() => null),
  ]);
  return {
    courseId,
    batchId,
    courseTitle: course?.exists() ? String(course.data().title ?? "Course") : "Course",
    batchName: batch?.exists() ? String(batch.data().name ?? "Batch") : "Batch",
  };
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

export async function getPublishedAssignments(courseId?: string, batchId?: string): Promise<Assignment[]> {
  if (!firestore || !courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "assignments"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("isPublished", "==", true), orderBy("dueAt", "asc")));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, title: String(data.title ?? "Assignment"), description: String(data.description ?? ""), courseId, batchId, dueAt: asDateString(data.dueAt), resourceUrl: stringOrUndefined(data.resourceUrl), submissionInstructions: stringOrUndefined(data.submissionInstructions) };
  });
}

export async function getStudentAssignmentSubmissions(studentId: string, courseId?: string, batchId?: string): Promise<AssignmentSubmission[]> {
  if (!firestore || !courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "assignmentSubmissions"), where("studentId", "==", studentId), where("courseId", "==", courseId), where("batchId", "==", batchId), orderBy("submittedAt", "desc")));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, assignmentId: String(data.assignmentId ?? ""), submittedAt: asDateString(data.submittedAt), submissionText: stringOrUndefined(data.submissionText), submissionUrl: stringOrUndefined(data.submissionUrl), feedback: stringOrUndefined(data.feedback), score: typeof data.score === "number" ? data.score : null };
  });
}

export async function submitAssignment(studentId: string, assignment: Assignment, input: { submissionText?: string; submissionUrl?: string }) {
  if (!firestore) throw new Error("Assignment submission is only available in Firebase mode.");
  const submissionText = input.submissionText?.trim() ?? "";
  const submissionUrl = input.submissionUrl?.trim() ?? "";
  if (!submissionText && !submissionUrl) throw new Error("Add your response or a submission link before sending.");
  await addDoc(collection(firestore, "assignmentSubmissions"), { assignmentId: assignment.id, studentId, courseId: assignment.courseId, batchId: assignment.batchId, submissionText: submissionText || null, submissionUrl: submissionUrl || null, submittedAt: serverTimestamp(), updatedAt: serverTimestamp() });
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
  return snapshot.docs.map((item) => toBatchQuiz(item.id, item.data())).filter((quiz) => (!quiz.opensAt || new Date(quiz.opensAt).getTime() <= now) && (!quiz.closesAt || new Date(quiz.closesAt).getTime() > now));
}

function toBatchQuiz(id: string, data: Record<string, unknown>): BatchQuiz {
  return { id, title: String(data.title ?? "Quiz"), description: String(data.description ?? ""), durationMinutes: Number(data.durationMinutes ?? 0), totalMarks: Number(data.totalMarks ?? 0), kind: data.kind === "final_exam" ? "final_exam" : "chapter_quiz", chapter: String(data.chapter ?? "") || undefined, passingPercent: Number.isFinite(Number(data.passingPercent)) ? Number(data.passingPercent) : undefined, maxRetakes: Number.isFinite(Number(data.maxRetakes)) ? Number(data.maxRetakes) : undefined, opensAt: asDateString(data.opensAt), closesAt: asDateString(data.closesAt) };
}

export async function getQuizMeta(quizId: string): Promise<BatchQuiz | null> {
  if (!firestore || !quizId) return null;
  const snapshot = await getDoc(doc(firestore, "quizzes", quizId));
  return snapshot.exists() ? toBatchQuiz(snapshot.id, snapshot.data()) : null;
}

export async function getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  if (!firestore || !quizId) return [];
  const snapshot = await getDocs(query(collection(firestore, "quizzes", quizId, "questions"), orderBy("sortOrder", "asc")));
  return snapshot.docs.map((item) => ({ id: item.id, prompt: String(item.data().prompt ?? ""), options: Array.isArray(item.data().options) ? item.data().options.map(String) : [], marks: Number(item.data().marks ?? 1), ...(item.data().type ? { type: item.data().type as QuizQuestionType } : {}) }));
}

export async function submitQuizAttempt(quizId: string, answers: SubmittedQuizAnswer[], startedAt?: number): Promise<QuizSubmissionResult> {
  if (!firebaseFunctions) throw new Error("Assessment submission is only available in Firebase mode.");
  const callable = httpsCallable<{ quizId: string; answers: SubmittedQuizAnswer[]; startedAt?: number }, QuizSubmissionResult>(firebaseFunctions, "submitQuizAttempt");
  const response = await callable({ quizId, answers, ...(typeof startedAt === "number" ? { startedAt } : {}) });
  const data = response.data;
  return { ...data, score: Number(data.score ?? 0), totalMarks: Number(data.totalMarks ?? 0), percentage: Number(data.percentage ?? 0), attemptNumber: Number(data.attemptNumber ?? 1), attemptCount: Number(data.attemptCount ?? 1), remainingAttempts: typeof data.remainingAttempts === "number" ? data.remainingAttempts : null, timeSpentSeconds: Number(data.timeSpentSeconds ?? 0), passed: Boolean(data.passed), kind: data.kind ?? "chapter_quiz", review: Array.isArray(data.review) ? data.review : undefined };
}

export async function getMyQuizResults(quizId: string): Promise<QuizResultsSummary> {
  if (!firebaseFunctions) throw new Error("Results are only available in Firebase mode.");
  const callable = httpsCallable<{ quizId: string }, QuizResultsSummary>(firebaseFunctions, "getMyQuizResults");
  const response = await callable({ quizId });
  return response.data;
}

function stringOrUndefined(value: unknown) { return typeof value === "string" && value ? value : undefined; }
function asDateString(value: unknown) { return typeof value === "string" ? value : value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate().toISOString() : undefined; }
