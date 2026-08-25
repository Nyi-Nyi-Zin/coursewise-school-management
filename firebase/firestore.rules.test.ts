import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

const describeWithEmulator = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
let testEnv: RulesTestEnvironment;

async function seedBatchIsolationFixture() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users", "admin-1"), { role: "admin" }),
      setDoc(doc(db, "users", "student-a"), { role: "student" }),
      setDoc(doc(db, "users", "student-b"), { role: "student" }),
      setDoc(doc(db, "courses", "course-1"), { title: "Web Engineering", enrolledStudentIds: ["student-a", "student-b"] }),
      setDoc(doc(db, "batches", "batch-a"), { name: "Batch A", courseId: "course-1", enrolledStudentIds: ["student-a"] }),
      setDoc(doc(db, "batches", "batch-b"), { name: "Batch B", courseId: "course-1", enrolledStudentIds: ["student-b"] }),
      setDoc(doc(db, "enrollments", "course-1_batch-a_student-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-a", status: "active" }),
      setDoc(doc(db, "enrollments", "course-1_batch-b_student-b"), { studentId: "student-b", courseId: "course-1", batchId: "batch-b", status: "active" }),
      setDoc(doc(db, "lessons", "lesson-a"), { title: "Batch A lesson", courseId: "course-1", batchId: "batch-a", isPublished: true }),
      setDoc(doc(db, "lessons", "lesson-b"), { title: "Batch B lesson", courseId: "course-1", batchId: "batch-b", isPublished: true }),
      setDoc(doc(db, "quizAttempts", "attempt-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-a", score: 92 }),
      setDoc(doc(db, "quizAttempts", "attempt-b"), { studentId: "student-b", courseId: "course-1", batchId: "batch-b", score: 88 }),
      setDoc(doc(db, "attendance", "attendance-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-a", status: "Present" }),
      setDoc(doc(db, "attendance", "attendance-b"), { studentId: "student-b", courseId: "course-1", batchId: "batch-b", status: "Absent" }),
      setDoc(doc(db, "quizzes", "quiz-a"), { title: "Batch A Quiz", courseId: "course-1", batchId: "batch-a", isPublished: true }),
      setDoc(doc(db, "quizzes/quiz-a/questions/question-a"), { prompt: "Question", options: ["A", "B"], marks: 1, sortOrder: 1 }),
      setDoc(doc(db, "quizzes/quiz-a/answerKeys/question-a"), { correctAnswerIndex: 1 }),
    ]);
  });
}

describeWithEmulator("Firestore course and batch isolation", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({ projectId: "teza-tech-lab-rules", firestore: { rules: readFileSync(resolve(process.cwd(), "firebase/firestore.rules"), "utf8") } });
  });
  afterEach(async () => { await testEnv.clearFirestore(); });
  afterAll(async () => { await testEnv.cleanup(); });

  it("allows a student only into their enrolled course and batch content, never answer keys", async () => {
    await seedBatchIsolationFixture();
    const studentA = testEnv.authenticatedContext("student-a").firestore();
    await assertSucceeds(getDoc(doc(studentA, "courses", "course-1")));
    await assertSucceeds(getDoc(doc(studentA, "lessons", "lesson-a")));
    await assertFails(getDoc(doc(studentA, "lessons", "lesson-b")));
    await assertFails(getDoc(doc(studentA, "enrollments", "course-1_batch-b_student-b")));
    await assertSucceeds(getDoc(doc(studentA, "quizzes/quiz-a/questions/question-a")));
    await assertFails(getDoc(doc(studentA, "quizzes/quiz-a/answerKeys/question-a")));
  });

  it("does not permit a student to read another student's quiz score or attendance", async () => {
    await seedBatchIsolationFixture();
    const studentA = testEnv.authenticatedContext("student-a").firestore();
    await assertSucceeds(getDoc(doc(studentA, "quizAttempts", "attempt-a")));
    await assertSucceeds(getDoc(doc(studentA, "attendance", "attendance-a")));
    await assertFails(getDoc(doc(studentA, "quizAttempts", "attempt-b")));
    await assertFails(getDoc(doc(studentA, "attendance", "attendance-b")));
  });

  it("allows an administrator to manage unlimited course records", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), "users", "admin-1"), { role: "admin" }); });
    const admin = testEnv.authenticatedContext("admin-1").firestore();
    await assertSucceeds(setDoc(doc(admin, "courses", "course-2"), { title: "Data Design", enrolledStudentIds: [] }));
    expect((await getDoc(doc(admin, "courses", "course-2"))).data()?.title).toBe("Data Design");
  });

  it("allows an administrator to create, update, and delete enrolments", async () => {
    await seedBatchIsolationFixture();
    const admin = testEnv.authenticatedContext("admin-1").firestore();
    const enrollmentRef = doc(admin, "enrollments", "course-1_batch-a_student-a");
    await assertSucceeds(setDoc(doc(admin, "enrollments", "course-1_batch-b_student-a"), { studentId: "student-a", courseId: "course-1", batchId: "batch-b", status: "active" }));
    await assertSucceeds(setDoc(enrollmentRef, { status: "inactive" }, { merge: true }));
    await assertSucceeds(deleteDoc(enrollmentRef));
  });

  it("still denies enrolment deletes and writes for non-administrators", async () => {
    await seedBatchIsolationFixture();
    const studentA = testEnv.authenticatedContext("student-a").firestore();
    await assertFails(deleteDoc(doc(studentA, "enrollments", "course-1_batch-b_student-b")));
    await assertFails(setDoc(doc(studentA, "enrollments", "course-1_batch-b_student-b"), { status: "inactive" }, { merge: true }));
  });

  it("allows a signed-in user to create only their own initial student profile", async () => {
    const student = testEnv.authenticatedContext("student-c").firestore();
    const selfProfile = { name: "Student C", email: "c@example.com", role: "student", studentId: "Pending", createdAt: new Date(), updatedAt: new Date() };
    await assertSucceeds(setDoc(doc(student, "users", "student-c"), selfProfile));
    await assertFails(setDoc(doc(student, "users", "student-d"), selfProfile));
    await assertFails(setDoc(doc(student, "users", "student-c"), { ...selfProfile, role: "admin" }));
  });
});
