import { addDoc, doc, getDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { demoAnnouncements, demoAttendance, demoLessons, getDemoLessonProgress, setDemoLessonProgress, type Announcement, type Lesson } from "@/lib/student-data";
import { firestore } from "@/lib/firebase";
import { authenticatedApiFetch } from "@/lib/authenticated-api";
import type { QuizCatalogPage, QuizCatalogRequest } from "@/lib/quiz-catalog";
import { uploadStudentPhotoToCloudinary, uploadAssignmentFileToCloudinary } from "@/lib/cloudinary-upload-service";

export type StudentProfile = { id: string; name: string; email: string; studentId: string; photoUrl?: string; activeCourseId?: string; activeBatchId?: string };
export type EnrollmentContext = { courseId: string; batchId: string; courseTitle: string; batchName: string };
export type PrivateQuizAttempt = { id: string; quizId: string; courseId: string; batchId: string; score: number; totalMarks: number; submittedAt?: string };
export type QuizKind = "chapter_quiz" | "final_exam";
export type BatchQuiz = { id: string; title: string; description: string; durationMinutes: number; totalMarks: number; kind: QuizKind; chapter?: string; passingPercent?: number; maxRetakes?: number; remainingAttempts: number | null; drawQuestionCount?: number; retakeCooldownHours?: number; opensAt?: string | null; closesAt?: string | null; eligible: boolean; lockReason?: string | null; completedChapterCount: number; totalChapterCount: number; nextEligibleAt?: string | null; bestPercentage: number; attemptCount: number; passed: boolean };
export type QuizQuestionType = "multiple_choice" | "multiple_select" | "true_false";
export type QuizQuestion = { id: string; prompt: string; options: string[]; marks: number; type?: QuizQuestionType };
export type SubmittedQuizAnswer = { questionId: string; selectedAnswerIndex: number; selectedIndices?: number[] };
export type QuestionReviewItem = { questionId: string; prompt: string; options: string[]; explanation: string; selectedIndex: number | null; selectedIndices: number[]; selectedAnswers: string[]; correctAnswerIndex: number; correctAnswerIndices: number[]; correctAnswers: string[]; correct: boolean; marksEarned: number };
export type QuizSubmissionResult = { id: string; kind: QuizKind; score: number; totalMarks: number; percentage: number; passed: boolean; attemptNumber: number; attemptCount: number; remainingAttempts: number | null; timeSpentSeconds: number; bestPercentage?: number; integrityViolations?: number; nextEligibleAt?: string | null; certificateIssued?: boolean; review?: QuestionReviewItem[] };
export type QuizResultsSummary = { quizId: string; kind: QuizKind; title: string; chapter: string; passingPercent: number; attemptCount: number; remainingAttempts: number | null; bestPercentage: number; passed: boolean; nextEligibleAt?: string | null; latest: { score: number; totalMarks: number; percentage: number; passed: boolean; timeSpentSeconds: number; submittedAtMillis: number | null; integrityViolations?: number } | null; review?: QuestionReviewItem[] };
export type AssessmentSession = { sessionId: string; kind: QuizKind; title: string; chapter: string; passingPercent: number; startedAtMillis: number; expiresAtMillis: number | null; integrityViolations: number; checkedQuestionIds: string[]; questions: QuizQuestion[] };
export type ChapterAnswerFeedback = { questionId: string; correct: boolean; marksEarned: number; explanation: string; correctIndices: number[]; correctAnswers: string[] };
export type Assignment = { id: string; title: string; description: string; courseId: string; batchId: string; dueAt?: string; resourceUrl?: string; submissionInstructions?: string };
export type AssignmentSubmission = { id: string; assignmentId: string; submittedAt?: string; submissionText?: string; submissionUrl?: string; submissionFileName?: string; feedback?: string; score?: number | null };
export type StudentCertificate = { id: string; certificateId: string; verificationCode: string; studentName: string; studentCode: string; courseTitle: string; batchName: string; courseDescription: string; quizTitle: string; score: number; totalMarks: number; percentage: number; issuedAt?: string; templateKey: "classic" | "modern" };

export async function getStudentProfile(userId: string): Promise<StudentProfile> {
  if (!firestore) return { id: userId, name: "Student", email: "student@example.com", studentId: "TL-2026-001" };
  const snapshot = await getDoc(doc(firestore, "users", userId));
  if (!snapshot.exists()) return { id: userId, name: "Student", email: "", studentId: "Pending" };
  return { id: snapshot.id, ...(snapshot.data() as Omit<StudentProfile, "id">) };
}

export async function uploadStudentPhoto(userId: string, file: File): Promise<string> {
  if (!firestore) throw new Error("Profile photos are only available in Firebase mode.");
  const profile = await getStudentProfile(userId);
  if (profile.photoUrl) throw new Error("You have already uploaded a profile photo. Ask an administrator to reset it before uploading again.");
  const photoUrl = await uploadStudentPhotoToCloudinary(file);
  await updateDoc(doc(firestore, "users", userId), { photoUrl, updatedAt: serverTimestamp() });
  return photoUrl;
}

export async function updateStudentName(userId: string, name: string): Promise<void> {
  if (!firestore) throw new Error("Profile updates are only available in Firebase mode.");
  await updateDoc(doc(firestore, "users", userId), { name, updatedAt: serverTimestamp() });
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

/** Returns every active course/batch enrollment for use in the student profile. */
export async function getStudentEnrollments(userId: string): Promise<EnrollmentContext[]> {
  const database = firestore;
  if (!database) {
    return [{ courseId: "demo-web", batchId: "demo-batch", courseTitle: "Web Engineering", batchName: "Demo learning batch" }];
  }

  const user = await getDoc(doc(database, "users", userId));
  const profileEnrollments: Array<{ courseId: string; batchId: string }> = Array.isArray(user.data()?.enrollments)
    ? user.data()!.enrollments
      .map((item: unknown) => {
        const enrollment = item as { courseId?: unknown; batchId?: unknown };
        return { courseId: String(enrollment.courseId ?? ""), batchId: String(enrollment.batchId ?? "") };
      })
      .filter(({ courseId, batchId }: { courseId: string; batchId: string }) => Boolean(courseId && batchId))
    : [];
  const activeCourseId = String(user.data()?.activeCourseId ?? "");
  const activeBatchId = String(user.data()?.activeBatchId ?? "");
  if (activeCourseId && activeBatchId) profileEnrollments.push({ courseId: activeCourseId, batchId: activeBatchId });

  const enrollmentByKey = new Map<string, { courseId: string; batchId: string }>();
  const addActiveEnrollment = (courseId: string, batchId: string) => {
    if (courseId && batchId) enrollmentByKey.set(`${courseId}:${batchId}`, { courseId, batchId });
  };

  await Promise.all(profileEnrollments.map(async ({ courseId, batchId }) => {
    try {
      const enrollment = await getDoc(doc(database, "enrollments", `${courseId}_${batchId}_${userId}`));
      if (enrollment.exists() && enrollment.data().status === "active") addActiveEnrollment(courseId, batchId);
    } catch {
      // The collection lookup below can still discover enrollment records.
    }
  }));

  try {
    const snapshot = await getDocs(query(
      collection(database, "enrollments"),
      where("studentId", "==", userId),
      where("status", "==", "active"),
    ));
    snapshot.docs.forEach((item) => addActiveEnrollment(
      String(item.data().courseId ?? ""),
      String(item.data().batchId ?? ""),
    ));
  } catch {
    // Known enrollment document reads above remain available when listing is denied.
  }

  return Promise.all([...enrollmentByKey.values()].map(async ({ courseId, batchId }) => {
    const [course, batch] = await Promise.all([
      getDoc(doc(database, "courses", courseId)).catch(() => null),
      getDoc(doc(database, "batches", batchId)).catch(() => null),
    ]);
    return {
      courseId,
      batchId,
      courseTitle: course?.exists() ? String(course.data().title ?? "Course") : "Course",
      batchName: batch?.exists() ? String(batch.data().name ?? "Batch") : "Batch",
    };
  }));
}

export async function getStudentAnnouncements(userId: string): Promise<Announcement[]> {
  if (!firestore) return demoAnnouncements;
  const enrollments = await getStudentEnrollments(userId);
  const announcements = await Promise.all(enrollments.map(({ courseId, batchId }) =>
    getPublishedAnnouncements(courseId, batchId),
  ));
  return [...new Map(announcements.flat().map(item => [item.id, item])).values()];
}

export async function getPublishedAnnouncements(courseId?: string, batchId?: string): Promise<Announcement[]> {
  if (!firestore) return demoAnnouncements;
  if (!courseId || !batchId) return [];
  const snapshot = await getDocs(query(collection(firestore, "announcements"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("isPublished", "==", true), orderBy("sortOrder", "asc")));
  return snapshot.docs.map((item) => {
    const data = item.data();
    const publishedAt = data.publishedAt as string ?? (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : "") ?? "";
    return { id: item.id, title: String(data.title ?? "Announcement"), description: String(data.description ?? ""), bannerUrl: data.bannerUrl as string | undefined, linkUrl: data.linkUrl as string | undefined, publishedAt, accent: "from-sky-400/30 via-blue-500/20 to-transparent" } satisfies Announcement;
  });
}

export async function getPublishedLessons(courseId?: string, batchId?: string): Promise<Lesson[]> {
  if (!firestore) return demoLessons;
  if (!courseId || !batchId) return [];
  // The security rules require the query itself to constrain isPublished, so
  // it must stay in the query. Equality-only filters are served without a
  // composite index (unlike orderBy sortOrder, which needs one that is not
  // deployed), so ordering happens in memory.
  const snapshot = await getDocs(query(collection(firestore, "lessons"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("isPublished", "==", true)));
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return { sortOrder: Number(data.sortOrder ?? 0), lesson: { id: item.id, courseId, batchId, title: String(data.title ?? "Lesson"), description: String(data.description ?? ""), module: String(data.module ?? "Module"), duration: String(data.duration ?? ""), thumbnailUrl: data.thumbnailUrl as string | undefined, telegramUrl: data.telegramUrl as string | undefined, videoUrl: data.videoUrl as string | undefined, pdfUrl: data.pdfUrl as string | undefined, status: "new" } satisfies Lesson };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ lesson }) => lesson);
}

export async function getLessonById(lessonId: string, courseId?: string, batchId?: string): Promise<Lesson | null> {
  if (!lessonId) return null;
  if (!firestore) return demoLessons.find((lesson) => lesson.id === lessonId && lesson.courseId === courseId && lesson.batchId === batchId) ?? null;
  if (!courseId || !batchId) return null;
  const snapshot = await getDoc(doc(firestore, "lessons", lessonId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.isPublished !== true || data.courseId !== courseId || data.batchId !== batchId) return null;
  return { id: snapshot.id, courseId, batchId, title: String(data.title ?? "Lesson"), description: String(data.description ?? ""), module: String(data.module ?? "Module"), duration: String(data.duration ?? ""), thumbnailUrl: data.thumbnailUrl as string | undefined, telegramUrl: data.telegramUrl as string | undefined, videoUrl: data.videoUrl as string | undefined, pdfUrl: data.pdfUrl as string | undefined, status: "new" } satisfies Lesson;
}

export async function getLessonProgress(studentId?: string, courseId?: string, batchId?: string): Promise<Map<string, Lesson["status"]>> {
  if (!firestore) return getDemoLessonProgress();
  if (!studentId || !courseId || !batchId) return new Map();
  // Students only ever read their own progress, so equality filters on
  // courseId + batchId + studentId are backed by the deployed composite index.
  const snapshot = await getDocs(query(collection(firestore, "lessonProgress"), where("courseId", "==", courseId), where("batchId", "==", batchId), where("studentId", "==", studentId)));
  const progress = new Map<string, Lesson["status"]>();
  snapshot.docs.forEach((item) => {
    const status = item.data().status;
    if (status === "new" || status === "continue" || status === "complete") progress.set(String(item.data().lessonId ?? item.id), status);
  });
  return progress;
}

export async function updateLessonProgress(studentId: string | undefined, lessonId: string, courseId: string, batchId: string, status: Lesson["status"]): Promise<void> {
  if (!firestore) {
    setDemoLessonProgress(lessonId, status);
    return;
  }
  if (!studentId || !courseId || !batchId || !lessonId) throw new Error("Lesson progress requires an active course and batch enrollment.");
  await setDoc(doc(firestore, "lessonProgress", `${courseId}_${batchId}_${lessonId}_${studentId}`), {
    lessonId,
    studentId,
    courseId,
    batchId,
    status,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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
    return { id: item.id, assignmentId: String(data.assignmentId ?? ""), submittedAt: asDateString(data.submittedAt), submissionText: stringOrUndefined(data.submissionText), submissionUrl: stringOrUndefined(data.submissionUrl), submissionFileName: stringOrUndefined(data.submissionFileName), feedback: stringOrUndefined(data.feedback), score: typeof data.score === "number" ? data.score : null };
  });
}

export async function submitAssignment(studentId: string, assignment: Assignment, input: { submissionText?: string; submissionUrl?: string; submissionFile?: File }) {
  if (!firestore) throw new Error("Assignment submission is only available in Firebase mode.");
  const submissionText = input.submissionText?.trim() ?? "";
  const submissionUrl = input.submissionUrl?.trim() ?? "";
  let fileUrl = "";
  let fileName = "";
  if (input.submissionFile) {
    fileUrl = await uploadAssignmentFileToCloudinary(input.submissionFile);
    fileName = input.submissionFile.name;
  }
  if (!submissionText && !submissionUrl && !fileUrl) throw new Error("Add your response, a submission link, or a file before sending.");
  await addDoc(collection(firestore, "assignmentSubmissions"), { assignmentId: assignment.id, studentId, courseId: assignment.courseId, batchId: assignment.batchId, submissionText: submissionText || null, submissionUrl: submissionUrl || fileUrl || null, submissionFileName: fileName || null, submittedAt: serverTimestamp(), updatedAt: serverTimestamp() });
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

export async function getQuizCatalogPage(input: QuizCatalogRequest): Promise<QuizCatalogPage> {
  if (!firestore) return { quizzes: [], page: 0, pageSize: 10, total: 0, scores: [], summary: { total: 0, completed: 0, available: 0, averageScore: 0, bestScore: 0, passed: 0 } };
  const params = new URLSearchParams({
    page: String(input.page), query: input.query, filter: input.filter,
    enrollments: JSON.stringify(input.enrollments.map(({ courseId, batchId }) => ({ courseId, batchId }))),
  });
  return authenticatedApiFetch(`/api/quizzes?${params}`) as Promise<QuizCatalogPage>;
}

function toBatchQuiz(id: string, data: Record<string, unknown>): BatchQuiz {
  return { id, title: String(data.title ?? "Quiz"), description: String(data.description ?? ""), durationMinutes: Number(data.durationMinutes ?? 0), totalMarks: Number(data.totalMarks ?? 0), kind: data.kind === "final_exam" ? "final_exam" : "chapter_quiz", chapter: String(data.chapter ?? "") || undefined, passingPercent: Number.isFinite(Number(data.passingPercent)) ? Number(data.passingPercent) : undefined, maxRetakes: Number.isFinite(Number(data.maxRetakes)) ? Number(data.maxRetakes) : undefined, remainingAttempts: typeof data.remainingAttempts === "number" ? data.remainingAttempts : null, drawQuestionCount: Number(data.drawQuestionCount ?? 50), retakeCooldownHours: Number(data.retakeCooldownHours ?? 24), opensAt: asDateString(data.opensAt), closesAt: asDateString(data.closesAt), eligible: data.eligible !== false, lockReason: typeof data.lockReason === "string" ? data.lockReason : null, completedChapterCount: Number(data.completedChapterCount ?? 0), totalChapterCount: Number(data.totalChapterCount ?? 0), nextEligibleAt: asDateString(data.nextEligibleAt), bestPercentage: Number(data.bestPercentage ?? 0), attemptCount: Number(data.attemptCount ?? 0), passed: data.passed === true };
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

export async function startAssessment(quizId: string): Promise<AssessmentSession> {
  return authenticatedApiFetch(`/api/quizzes/${encodeURIComponent(quizId)}/start`, { method: "POST" }) as Promise<AssessmentSession>;
}

export async function checkChapterAnswer(quizId: string, questionId: string, selectedIndices: number[]): Promise<ChapterAnswerFeedback> {
  return authenticatedApiFetch(`/api/quizzes/${encodeURIComponent(quizId)}/check`, { method: "POST", body: JSON.stringify({ questionId, selectedIndices }) }) as Promise<ChapterAnswerFeedback>;
}

export async function recordExamIntegrityViolation(quizId: string, reason: string): Promise<{ violationCount: number; shouldSubmit: boolean }> {
  return authenticatedApiFetch(`/api/quizzes/${encodeURIComponent(quizId)}/integrity`, { method: "POST", body: JSON.stringify({ reason }) }) as Promise<{ violationCount: number; shouldSubmit: boolean }>;
}

export async function submitQuizAttempt(quizId: string, sessionId: string, answers: SubmittedQuizAnswer[]): Promise<QuizSubmissionResult> {
  const data = await authenticatedApiFetch(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, { method: "POST", body: JSON.stringify({ sessionId, answers }) }) as QuizSubmissionResult;
  return { ...data, score: Number(data.score ?? 0), totalMarks: Number(data.totalMarks ?? 0), percentage: Number(data.percentage ?? 0), attemptNumber: Number(data.attemptNumber ?? 1), attemptCount: Number(data.attemptCount ?? 1), remainingAttempts: typeof data.remainingAttempts === "number" ? data.remainingAttempts : null, timeSpentSeconds: Number(data.timeSpentSeconds ?? 0), passed: Boolean(data.passed), kind: data.kind ?? "chapter_quiz", certificateIssued: Boolean(data.certificateIssued), review: Array.isArray(data.review) ? data.review : undefined };
}

export async function getMyQuizResults(quizId: string): Promise<QuizResultsSummary> {
  return authenticatedApiFetch(`/api/quizzes/${encodeURIComponent(quizId)}/results`) as Promise<QuizResultsSummary>;
}

export async function getMyCertificates(): Promise<StudentCertificate[]> {
  const data = await authenticatedApiFetch("/api/certificates") as { certificates?: Array<Record<string, unknown>> };
  const records = Array.isArray(data.certificates) ? data.certificates : [];
  return records.map((item) => ({
    id: String(item.id ?? ""),
    certificateId: String(item.certificateId ?? ""),
    verificationCode: String(item.verificationCode ?? ""),
    studentName: String(item.studentName ?? ""),
    studentCode: String(item.studentCode ?? ""),
    courseTitle: String(item.courseTitle ?? ""),
    batchName: String(item.batchName ?? ""),
    courseDescription: String(item.courseDescription ?? item.includedTopics ?? ""),
    quizTitle: String(item.quizTitle ?? ""),
    score: Number(item.score ?? 0),
    totalMarks: Number(item.totalMarks ?? 0),
    percentage: Number(item.percentage ?? 0),
    issuedAt: typeof item.issuedAt === "string" ? item.issuedAt : undefined,
    templateKey: item.templateKey === "modern" ? "modern" : "classic",
  }));
}

function stringOrUndefined(value: unknown) { return typeof value === "string" && value ? value : undefined; }
function asDateString(value: unknown) { return typeof value === "string" ? value : value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate().toISOString() : undefined; }
