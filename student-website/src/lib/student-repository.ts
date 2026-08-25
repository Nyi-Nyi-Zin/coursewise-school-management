import { addDoc, doc, getDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { demoAnnouncements, demoAttendance, demoLessons, type Announcement, type Lesson } from "@/lib/student-data";
import { firestore } from "@/lib/firebase";
import { authenticatedApiFetch } from "@/lib/authenticated-api";
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
  const profileCourseId = String(user.data()?.activeCourseId ?? "");
  const profileBatchId = String(user.data()?.activeBatchId ?? "");

  // Resolve the student's selected enrollment directly first.  Listing the
  // enrolments collection can be rejected by older Firestore rules or require
  // an index that has not reached production, which left a correctly enrolled
  // student with no course/batch context and therefore no quizzes.
  let active: { courseId: string; batchId: string } | null = null;
  if (profileCourseId && profileBatchId) {
    try {
      const profileEnrollment = await getDoc(doc(firestore, "enrollments", `${profileCourseId}_${profileBatchId}_${userId}`));
      if (profileEnrollment.exists() && profileEnrollment.data().status === "active") {
        active = { courseId: profileCourseId, batchId: profileBatchId };
      }
    } catch {
      // Continue to the legacy collection lookup below.
    }
  }

  // The enrollment record remains the source of truth when a legacy profile
  // does not yet have its active course/batch fields.
  try {
    if (!active) {
      const snapshot = await getDocs(query(collection(firestore, "enrollments"), where("studentId", "==", userId), where("status", "==", "active"), limit(10)));
      const records = snapshot.docs.map((item) => ({ courseId: String(item.data().courseId ?? ""), batchId: String(item.data().batchId ?? "") }));
      active = records.find((record) => record.courseId === profileCourseId && record.batchId === profileBatchId) ?? records.at(0) ?? null;
    }
  } catch {
    // A valid direct enrollment above remains usable.  For older data without
    // an enrollment document, retain the profile fallback for compatibility.
    active ??= profileCourseId && profileBatchId ? { courseId: profileCourseId, batchId: profileBatchId } : null;
  }
  if (!active?.courseId || !active.batchId) {
    if (!profileCourseId || !profileBatchId) return null;
    active = { courseId: profileCourseId, batchId: profileBatchId };
  }

  // Course or batch profile documents may be unreadable for freshly enrolled
  // students; that must never erase the enrollment itself, so fall back to
  // generic titles and let the scoped content queries decide visibility.
  const [course, batch] = await Promise.all([
    getDoc(doc(firestore, "courses", active.courseId)).catch(() => null),
    getDoc(doc(firestore, "batches", active.batchId)).catch(() => null),
  ]);
  return {
    courseId: active.courseId,
    batchId: active.batchId,
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

export async function getPublishedLessons(courseId?: string): Promise<Lesson[]> {
  if (!firestore) return demoLessons;
  if (!courseId) return [];
  // The security rules require the query itself to constrain isPublished, so
  // it must stay in the query. Equality-only filters are served without a
  // composite index (unlike orderBy sortOrder, which needs one that is not
  // deployed), so ordering happens in memory.
  const snapshot = await getDocs(query(collection(firestore, "lessons"), where("courseId", "==", courseId), where("isPublished", "==", true)));
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return { sortOrder: Number(data.sortOrder ?? 0), lesson: { id: item.id, title: String(data.title ?? "Lesson"), description: String(data.description ?? ""), module: String(data.module ?? "Module"), duration: String(data.duration ?? ""), thumbnailUrl: data.thumbnailUrl as string | undefined, telegramUrl: data.telegramUrl as string | undefined, videoUrl: data.videoUrl as string | undefined, pdfUrl: data.pdfUrl as string | undefined, status: "new" } satisfies Lesson };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ lesson }) => lesson);
}

export async function getStudentAttendance(studentId: string, courseId?: string, batchId?: string) {
  if (!firestore) return demoAttendance;
  if (!courseId || !batchId) return [];
  // The security rules evaluate ownership and batch fields against the query
  // constraints, so studentId, courseId, and batchId must all be equality
  // filters. Equality-only queries need no composite index (orderBy date
  // would), so sorting and the 30-record limit happen in memory.
  const snapshot = await getDocs(query(collection(firestore, "attendance"), where("studentId", "==", studentId), where("courseId", "==", courseId), where("batchId", "==", batchId)));
  return snapshot.docs
    .map((item) => item.data())
    .sort((left, right) => String(right.date ?? "").localeCompare(String(left.date ?? "")))
    .slice(0, 30);
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
  const payload = await authenticatedApiFetch(`/api/quizzes?${new URLSearchParams({ courseId, batchId })}`) as { quizzes?: Array<Record<string, unknown> & { id: string }> };
  const records = Array.isArray(payload.quizzes) ? payload.quizzes : [];
  return records
    .map((item) => toBatchQuiz(item.id, item))
    .sort((left, right) => left.title.localeCompare(right.title));
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
  const data = await authenticatedApiFetch(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, { method: "POST", body: JSON.stringify({ answers, ...(typeof startedAt === "number" ? { startedAt } : {}) }) }) as QuizSubmissionResult;
  return { ...data, score: Number(data.score ?? 0), totalMarks: Number(data.totalMarks ?? 0), percentage: Number(data.percentage ?? 0), attemptNumber: Number(data.attemptNumber ?? 1), attemptCount: Number(data.attemptCount ?? 1), remainingAttempts: typeof data.remainingAttempts === "number" ? data.remainingAttempts : null, timeSpentSeconds: Number(data.timeSpentSeconds ?? 0), passed: Boolean(data.passed), kind: data.kind ?? "chapter_quiz", review: Array.isArray(data.review) ? data.review : undefined };
}

export async function getMyQuizResults(quizId: string): Promise<QuizResultsSummary> {
  return authenticatedApiFetch(`/api/quizzes/${encodeURIComponent(quizId)}/results`) as Promise<QuizResultsSummary>;
}

function stringOrUndefined(value: unknown) { return typeof value === "string" && value ? value : undefined; }
function asDateString(value: unknown) { return typeof value === "string" ? value : value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate().toISOString() : undefined; }
