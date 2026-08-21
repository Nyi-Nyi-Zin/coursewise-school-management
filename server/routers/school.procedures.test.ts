import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  requireDb: vi.fn(),
  getQuizQuestions: vi.fn(),
  getStudentAttendance: vi.fn(),
  getStudentAttempts: vi.fn(),
  listAnnouncements: vi.fn(),
  listLessons: vi.fn(),
  listQuizzes: vi.fn(),
  listStudents: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("../db", () => ({
  requireDb: mocks.requireDb,
  getQuizQuestions: mocks.getQuizQuestions,
  getStudentAttendance: mocks.getStudentAttendance,
  getStudentAttempts: mocks.getStudentAttempts,
  listAnnouncements: mocks.listAnnouncements,
  listLessons: mocks.listLessons,
  listQuizzes: mocks.listQuizzes,
  listStudents: mocks.listStudents,
}));

vi.mock("../storage", () => ({ storagePut: mocks.storagePut }));

import { schoolRouter } from "./school";

function makeContext(role: "admin" | "student"): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: role === "admin" ? 9 : 4,
      openId: `${role}-open-id`,
      name: role === "admin" ? "Course Admin" : "Student User",
      email: `${role}@example.com`,
      loginMethod: "manus",
      role,
      studentId: role === "student" ? "STU-004" : null,
      profilePhotoUrl: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("school management contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a student profile only through the administrator procedure", async () => {
    const values = vi.fn().mockResolvedValue({});
    mocks.requireDb.mockResolvedValue({ insert: vi.fn(() => ({ values })) });
    const caller = schoolRouter.createCaller(makeContext("admin"));

    await caller.admin.students.create({
      openId: "student-manus-id",
      name: "Aye Aye",
      email: "aye@example.com",
      studentId: "STU-101",
      profilePhotoUrl: null,
      isActive: true,
    });

    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      openId: "student-manus-id",
      role: "student",
      studentId: "STU-101",
    }));
  });

  it("sends permitted banner files to S3-backed storage", async () => {
    mocks.storagePut.mockResolvedValue({ key: "school-management/announcements/banner.png", url: "/manus-storage/banner.png" });
    const caller = schoolRouter.createCaller(makeContext("admin"));
    const result = await caller.upload({
      folder: "announcements",
      fileName: "banner.png",
      contentType: "image/png",
      base64: Buffer.from("banner-image").toString("base64"),
    });

    expect(result.url).toBe("/manus-storage/banner.png");
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringContaining("school-management/announcements/"), expect.any(Buffer), "image/png");
  });

  it("stores one exact attendance status through the attendance upsert", async () => {
    const onDuplicateKeyUpdate = vi.fn().mockResolvedValue({});
    const values = vi.fn(() => ({ onDuplicateKeyUpdate }));
    mocks.requireDb.mockResolvedValue({ insert: vi.fn(() => ({ values })) });
    const caller = schoolRouter.createCaller(makeContext("admin"));

    await caller.admin.attendance.upsert({ studentUserId: 4, date: "2026-08-22", status: "Late", note: "Arrived after registration" });

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ status: "Late", date: "2026-08-22" }));
    expect(onDuplicateKeyUpdate).toHaveBeenCalledOnce();
  });

  it("updates a student profile while retaining the student-only data boundary", async () => {
    const where = vi.fn().mockResolvedValue({});
    const set = vi.fn(() => ({ where }));
    mocks.requireDb.mockResolvedValue({ update: vi.fn(() => ({ set })) });
    const caller = schoolRouter.createCaller(makeContext("admin"));

    await caller.admin.students.update({
      id: 4,
      name: "Aye Aye Updated",
      email: "aye.updated@example.com",
      studentId: "STU-101",
      profilePhotoUrl: "/manus-storage/student.png",
      isActive: false,
    });

    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      name: "Aye Aye Updated",
      isActive: false,
      profilePhotoUrl: "/manus-storage/student.png",
    }));
    expect(where).toHaveBeenCalledOnce();
  });

  it("updates quiz settings through the administrator-only procedure", async () => {
    const where = vi.fn().mockResolvedValue({});
    const set = vi.fn(() => ({ where }));
    mocks.requireDb.mockResolvedValue({ update: vi.fn(() => ({ set })) });
    const caller = schoolRouter.createCaller(makeContext("admin"));

    await caller.admin.quizzes.update({
      id: 7,
      title: "Updated checkpoint",
      description: "Refined quiz instructions",
      durationMinutes: 30,
      isPublished: true,
    });

    expect(set).toHaveBeenCalledWith({
      title: "Updated checkpoint",
      description: "Refined quiz instructions",
      durationMinutes: 30,
      isPublished: true,
    });
    expect(where).toHaveBeenCalledOnce();
  });

  it("calculates a student quiz attempt on the server and saves the outcome", async () => {
    const savedAttempt = vi.fn().mockResolvedValue([{ insertId: 41 }]);
    const quizQuery = { limit: vi.fn().mockResolvedValue([{ id: 7, isPublished: true }]) };
    mocks.requireDb.mockResolvedValue({
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => quizQuery) })) })),
      insert: vi.fn(() => ({ values: savedAttempt })),
    });
    mocks.getQuizQuestions.mockResolvedValue([
      { id: 1, correctAnswerIndex: 1, marks: 2 },
      { id: 2, correctAnswerIndex: 0, marks: 3 },
    ]);
    const caller = schoolRouter.createCaller(makeContext("student"));

    const outcome = await caller.student.quizzes.submit({
      quizId: 7,
      answers: [
        { questionId: 1, selectedAnswerIndex: 1 },
        { questionId: 2, selectedAnswerIndex: 2 },
      ],
    });

    expect(outcome).toEqual({ id: 41, score: 2, totalMarks: 5, percentage: 40 });
    expect(savedAttempt).toHaveBeenCalledWith(expect.objectContaining({
      studentUserId: 4,
      quizId: 7,
      score: 2,
      totalMarks: 5,
      percentage: 40,
    }));
  });
});
