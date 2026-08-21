import { describe, expect, it } from "vitest";
import type { TrpcContext } from "../_core/context";
import { attendanceSummary, calculateQuizOutcome, schoolRouter } from "./school";

function makeContext(role: "admin" | "student", isActive = true): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      name: "Test Learner",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      studentId: "STU-001",
      profilePhotoUrl: null,
      isActive,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("school access control", () => {
  it("denies a student account from the administrative workspace", async () => {
    const caller = schoolRouter.createCaller(makeContext("student"));
    await expect(caller.admin.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies an inactive student from student procedures", async () => {
    const caller = schoolRouter.createCaller(makeContext("student", false));
    await expect(caller.student.home()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("quiz scoring", () => {
  it("calculates marks and a rounded percentage from server-trusted answers", () => {
    const outcome = calculateQuizOutcome(
      [
        { id: 1, marks: 2, correctAnswerIndex: 1 },
        { id: 2, marks: 3, correctAnswerIndex: 0 },
        { id: 3, marks: 5, correctAnswerIndex: 2 },
      ],
      [
        { questionId: 1, selectedAnswerIndex: 1 },
        { questionId: 2, selectedAnswerIndex: 2 },
        { questionId: 3, selectedAnswerIndex: 2 },
      ],
    );

    expect(outcome).toEqual({ score: 7, totalMarks: 10, percentage: 70 });
  });
});

describe("attendance summaries", () => {
  it("counts exact attendance statuses and treats late as attending", () => {
    const now = new Date();
    const rows = [
      { id: 1, studentUserId: 1, date: "2026-08-01", status: "Present", note: null, createdAt: now, updatedAt: now },
      { id: 2, studentUserId: 1, date: "2026-08-02", status: "Late", note: null, createdAt: now, updatedAt: now },
      { id: 3, studentUserId: 1, date: "2026-08-03", status: "Absent", note: null, createdAt: now, updatedAt: now },
      { id: 4, studentUserId: 1, date: "2026-08-04", status: "Excused", note: null, createdAt: now, updatedAt: now },
    ] as const;

    expect(attendanceSummary([...rows])).toEqual({
      Present: 1,
      Absent: 1,
      Late: 1,
      Excused: 1,
      recorded: 4,
      attendanceRate: 50,
    });
  });
});
