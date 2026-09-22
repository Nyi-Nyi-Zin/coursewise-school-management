import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const describeWithEmulator = process.env.FIRESTORE_EMULATOR_HOST
  ? describe
  : describe.skip;
let testEnv: RulesTestEnvironment;

async function seedBatchIsolationFixture() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users", "admin-1"), { role: "admin" }),
      setDoc(doc(db, "users", "student-a"), {
        role: "student",
        requiresEmailVerification: true,
      }),
      setDoc(doc(db, "users", "student-b"), {
        role: "student",
        requiresEmailVerification: true,
      }),
      setDoc(doc(db, "courses", "course-1"), {
        title: "Web Engineering",
        enrolledStudentIds: ["student-a", "student-b"],
      }),
      setDoc(doc(db, "batches", "batch-a"), {
        name: "Batch A",
        courseId: "course-1",
        enrolledStudentIds: ["student-a"],
      }),
      setDoc(doc(db, "batches", "batch-b"), {
        name: "Batch B",
        courseId: "course-1",
        enrolledStudentIds: ["student-b"],
      }),
      setDoc(doc(db, "enrollments", "course-1_batch-a_student-a"), {
        studentId: "student-a",
        courseId: "course-1",
        batchId: "batch-a",
        status: "active",
      }),
      setDoc(doc(db, "enrollments", "course-1_batch-b_student-b"), {
        studentId: "student-b",
        courseId: "course-1",
        batchId: "batch-b",
        status: "active",
      }),
      setDoc(doc(db, "lessons", "lesson-a"), {
        title: "Batch A lesson",
        courseId: "course-1",
        batchId: "batch-a",
        isPublished: true,
      }),
      setDoc(doc(db, "lessons", "lesson-b"), {
        title: "Batch B lesson",
        courseId: "course-1",
        batchId: "batch-b",
        isPublished: true,
      }),
      setDoc(doc(db, "quizAttempts", "attempt-a"), {
        studentId: "student-a",
        courseId: "course-1",
        batchId: "batch-a",
        score: 92,
      }),
      setDoc(doc(db, "quizAttempts", "attempt-b"), {
        studentId: "student-b",
        courseId: "course-1",
        batchId: "batch-b",
        score: 88,
      }),
      setDoc(doc(db, "attendance", "attendance-a"), {
        studentId: "student-a",
        courseId: "course-1",
        batchId: "batch-a",
        status: "Present",
      }),
      setDoc(doc(db, "attendance", "attendance-b"), {
        studentId: "student-b",
        courseId: "course-1",
        batchId: "batch-b",
        status: "Absent",
      }),
      setDoc(doc(db, "quizzes", "quiz-a"), {
        title: "Batch A Quiz",
        courseId: "course-1",
        batchId: "batch-a",
        isPublished: true,
      }),
      setDoc(doc(db, "quizzes/quiz-a/questions/question-a"), {
        prompt: "Question",
        options: ["A", "B"],
        marks: 1,
        sortOrder: 1,
      }),
      setDoc(doc(db, "quizzes/quiz-a/answerKeys/question-a"), {
        correctAnswerIndex: 1,
      }),
      setDoc(doc(db, "assignments/assignment-a"), {
        title: "Assignment A",
        courseId: "course-1",
        batchId: "batch-a",
        isPublished: true,
      }),
      setDoc(doc(db, "lessonProgress", "lesson-a_student-a"), {
        lessonId: "lesson-a",
        studentId: "student-a",
        courseId: "course-1",
        batchId: "batch-a",
        status: "continue",
      }),
      setDoc(doc(db, "lessonProgress", "lesson-b_student-b"), {
        lessonId: "lesson-b",
        studentId: "student-b",
        courseId: "course-1",
        batchId: "batch-b",
        status: "complete",
      }),
    ]);
  });
}

function authenticatedStudent(studentId: string) {
  return testEnv
    .authenticatedContext(studentId, {
      email_verified: true,
      email: `${studentId}@example.com`,
    })
    .firestore();
}

describeWithEmulator("Firestore course and batch isolation", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-coursewise-audit",
      firestore: {
        rules: readFileSync(
          resolve(process.cwd(), "firebase/firestore.rules"),
          "utf8"
        ),
      },
    });
  });
  afterEach(async () => {
    await testEnv.clearFirestore();
  });
  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("locks a photo after the first upload until an admin resets it", async () => {
    await seedBatchIsolationFixture();
    const student = authenticatedStudent("student-a");
    const admin = testEnv.authenticatedContext("admin-1").firestore();
    const profile = doc(student, "users", "student-a");
    await assertSucceeds(
      updateDoc(profile, { photoUrl: "https://example.com/first.jpg" })
    );
    await assertFails(
      updateDoc(profile, { photoUrl: "https://example.com/second.jpg" })
    );
    await assertFails(updateDoc(profile, { photoUrl: null }));
    await assertFails(updateDoc(profile, { photoUrl: "" }));
    await assertSucceeds(updateDoc(profile, { name: "Updated name" }));
    await assertSucceeds(
      updateDoc(doc(admin, "users", "student-a"), { photoUrl: null })
    );
    await assertSucceeds(
      updateDoc(profile, { photoUrl: "https://example.com/replacement.jpg" })
    );
    await assertFails(
      updateDoc(profile, { photoUrl: "https://example.com/third.jpg" })
    );
  });

  it("allows a student only into their enrolled course and batch content, never answer keys", async () => {
    await seedBatchIsolationFixture();
    const studentA = authenticatedStudent("student-a");
    await assertSucceeds(getDoc(doc(studentA, "courses", "course-1")));
    await assertSucceeds(getDoc(doc(studentA, "lessons", "lesson-a")));
    await assertFails(getDoc(doc(studentA, "lessons", "lesson-b")));
    await assertFails(
      getDoc(doc(studentA, "enrollments", "course-1_batch-b_student-b"))
    );
    await assertFails(
      getDoc(doc(studentA, "quizzes/quiz-a/questions/question-a"))
    );
    await assertFails(
      getDoc(doc(studentA, "quizzes/quiz-a/answerKeys/question-a"))
    );
  });

  it("does not permit a student to read another student's quiz score or attendance", async () => {
    await seedBatchIsolationFixture();
    const studentA = authenticatedStudent("student-a");
    await assertSucceeds(getDoc(doc(studentA, "quizAttempts", "attempt-a")));
    await assertSucceeds(getDoc(doc(studentA, "attendance", "attendance-a")));
    await assertFails(getDoc(doc(studentA, "quizAttempts", "attempt-b")));
    await assertFails(getDoc(doc(studentA, "attendance", "attendance-b")));
  });

  it("allows an administrator to manage unlimited course records", async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), "users", "admin-1"), {
        role: "admin",
      });
    });
    const admin = testEnv.authenticatedContext("admin-1").firestore();
    await assertSucceeds(
      setDoc(doc(admin, "courses", "course-2"), {
        title: "Data Design",
        enrolledStudentIds: [],
      })
    );
    expect(
      (await getDoc(doc(admin, "courses", "course-2"))).data()?.title
    ).toBe("Data Design");
  });

  it("allows an administrator to create, update, and delete enrolments", async () => {
    await seedBatchIsolationFixture();
    const admin = testEnv.authenticatedContext("admin-1").firestore();
    const enrollmentRef = doc(
      admin,
      "enrollments",
      "course-1_batch-a_student-a"
    );
    await assertSucceeds(
      setDoc(doc(admin, "enrollments", "course-1_batch-b_student-a"), {
        studentId: "student-a",
        courseId: "course-1",
        batchId: "batch-b",
        status: "active",
      })
    );
    await assertSucceeds(
      setDoc(enrollmentRef, { status: "inactive" }, { merge: true })
    );
    await assertSucceeds(deleteDoc(enrollmentRef));
  });

  it("lets a student read and update only their own lesson progress", async () => {
    await seedBatchIsolationFixture();
    const studentA = authenticatedStudent("student-a");
    await assertSucceeds(
      getDoc(doc(studentA, "lessonProgress", "lesson-a_student-a"))
    );
    await assertFails(
      getDoc(doc(studentA, "lessonProgress", "lesson-b_student-b"))
    );
    await assertSucceeds(
      setDoc(
        doc(studentA, "lessonProgress", "lesson-a_student-a"),
        { status: "complete", updatedAt: new Date() },
        { merge: true }
      )
    );
  });

  it("denies portal data to an inactive student even if their old token still exists", async () => {
    await seedBatchIsolationFixture();
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(
        doc(context.firestore(), "users", "student-a"),
        { isActive: false },
        { merge: true }
      );
    });
    const inactiveStudent = authenticatedStudent("student-a");
    await assertFails(getDoc(doc(inactiveStudent, "courses", "course-1")));
    await assertFails(
      getDoc(doc(inactiveStudent, "lessonProgress", "lesson-a_student-a"))
    );
  });

  it("lets an enrolled student create lesson progress for their course-batch lesson", async () => {
    await seedBatchIsolationFixture();
    const studentA = authenticatedStudent("student-a");
    await assertSucceeds(
      setDoc(
        doc(
          studentA,
          "lessonProgress",
          "course-1_batch-a_lesson-a_student-a-new"
        ),
        {
          lessonId: "lesson-a",
          studentId: "student-a",
          courseId: "course-1",
          batchId: "batch-a",
          status: "continue",
          updatedAt: new Date(),
        }
      )
    );
  });

  it("rejects invalid lesson progress statuses and foreign students", async () => {
    await seedBatchIsolationFixture();
    const studentA = authenticatedStudent("student-a");
    await assertFails(
      setDoc(doc(studentA, "lessonProgress", "invalid-status"), {
        lessonId: "lesson-a",
        studentId: "student-a",
        courseId: "course-1",
        batchId: "batch-a",
        status: "watched",
        updatedAt: new Date(),
      })
    );
    await assertFails(
      setDoc(doc(studentA, "lessonProgress", "foreign-student"), {
        lessonId: "lesson-a",
        studentId: "student-b",
        courseId: "course-1",
        batchId: "batch-a",
        status: "continue",
        updatedAt: new Date(),
      })
    );
  });

  it("still denies enrolment deletes and writes for non-administrators", async () => {
    await seedBatchIsolationFixture();
    const studentA = authenticatedStudent("student-a");
    await assertFails(
      deleteDoc(doc(studentA, "enrollments", "course-1_batch-b_student-b"))
    );
    await assertFails(
      setDoc(
        doc(studentA, "enrollments", "course-1_batch-b_student-b"),
        { status: "inactive" },
        { merge: true }
      )
    );
  });

  it("prevents students from forging assignment grades or deleting reviewed work", async () => {
    await seedBatchIsolationFixture();
    const studentA = authenticatedStudent("student-a");
    const admin = testEnv.authenticatedContext("admin-1").firestore();
    const base = {
      assignmentId: "assignment-a",
      studentId: "student-a",
      courseId: "course-1",
      batchId: "batch-a",
      submissionText: "My work",
      submissionUrl: null,
      submissionFileName: null,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await assertFails(
      setDoc(doc(studentA, "assignmentSubmissions", "submission-forged"), {
        ...base,
        score: 100,
        feedback: "Perfect",
      })
    );
    await assertSucceeds(
      setDoc(doc(studentA, "assignmentSubmissions", "submission-valid"), base)
    );
    await assertSucceeds(
      setDoc(doc(studentA, "assignmentSubmissions", "submission-file"), {
        ...base,
        submissionFileName: "report.pdf",
        assetPublicId:
          "coursewise/assignments/student-a/assignment-a/550e8400-e29b-41d4-a716-446655440000",
        assetResourceType: "raw",
        assetDeliveryType: "authenticated",
        assetFormat: "pdf",
        assetVersion: 1,
      })
    );
    await assertFails(
      setDoc(
        doc(studentA, "assignmentSubmissions", "submission-foreign-file"),
        {
          ...base,
          submissionFileName: "stolen.pdf",
          assetPublicId:
            "coursewise/assignments/student-b/assignment-a/550e8400-e29b-41d4-a716-446655440000",
          assetResourceType: "raw",
          assetDeliveryType: "authenticated",
          assetFormat: "pdf",
          assetVersion: 1,
        }
      )
    );
    await assertSucceeds(
      updateDoc(doc(admin, "assignmentSubmissions", "submission-valid"), {
        score: 100,
        feedback: "Reviewed",
      })
    );
    await assertFails(
      deleteDoc(doc(studentA, "assignmentSubmissions", "submission-valid"))
    );
    await assertSucceeds(
      deleteDoc(doc(admin, "assignmentSubmissions", "submission-valid"))
    );
  });

  it("requires verified email for student portal access and denies direct self-provisioning", async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, "users", "student-required"), {
        role: "student",
        requiresEmailVerification: true,
      });
      await setDoc(doc(db, "courses", "course-required"), {
        title: "Required",
        enrolledStudentIds: ["student-required"],
      });
      await setDoc(doc(db, "batches", "batch-required"), {
        courseId: "course-required",
        enrolledStudentIds: ["student-required"],
      });
      await setDoc(
        doc(
          db,
          "enrollments",
          "course-required_batch-required_student-required"
        ),
        {
          studentId: "student-required",
          courseId: "course-required",
          batchId: "batch-required",
          status: "active",
        }
      );
    });
    const unverified = testEnv
      .authenticatedContext("student-required", {
        email_verified: false,
        email: "required@example.com",
      })
      .firestore();
    const verified = testEnv
      .authenticatedContext("student-required", {
        email_verified: true,
        email: "required@example.com",
      })
      .firestore();
    await assertFails(getDoc(doc(unverified, "courses", "course-required")));
    await assertSucceeds(getDoc(doc(verified, "courses", "course-required")));
    const unverifiedNew = testEnv
      .authenticatedContext("student-new", {
        email_verified: false,
        email: "new@example.com",
      })
      .firestore();
    const profile = {
      name: "Student New",
      email: "new@example.com",
      role: "student",
      studentId: "Pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await assertFails(
      setDoc(doc(unverifiedNew, "users", "student-new"), profile)
    );
    const verifiedNew = testEnv
      .authenticatedContext("student-new-verified", {
        email_verified: true,
        email: "new@example.com",
      })
      .firestore();
    await assertFails(
      setDoc(doc(verifiedNew, "users", "student-new-verified"), profile)
    );
  });

  it("denies direct profile creation even with a verified identity or chosen student number", async () => {
    const student = testEnv
      .authenticatedContext("student-c", {
        email_verified: true,
        email: "c@example.com",
      })
      .firestore();
    const selfProfile = {
      name: "Student C",
      email: "c@example.com",
      role: "student",
      studentId: "Pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await assertFails(setDoc(doc(student, "users", "student-c"), selfProfile));
    await assertFails(
      setDoc(doc(student, "users", "student-c"), {
        ...selfProfile,
        studentId: "1",
        createdAt: "forged",
      })
    );
    await assertFails(setDoc(doc(student, "users", "student-d"), selfProfile));
    await assertFails(
      setDoc(doc(student, "users", "student-c"), {
        ...selfProfile,
        role: "admin",
      })
    );
  });
});
