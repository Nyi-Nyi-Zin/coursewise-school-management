import { describe, expect, it } from "vitest";
import { emptyOfflineRecords, type OfflineRecords } from "./offline-records";
import { buildOverviewDashboardData } from "./overview-dashboard";

const now = new Date("2026-09-12T09:00:00");

function recordsWith(overrides: Partial<OfflineRecords>): OfflineRecords {
  return { ...structuredClone(emptyOfflineRecords), ...overrides };
}

describe("buildOverviewDashboardData", () => {
  it("summarizes students, courses, batches, and published content without attendance", () => {
    const data = buildOverviewDashboardData(
      recordsWith({
        students: [
          { id: "student-1", title: "Active", description: "", status: "Active", createdAt: "Firebase" },
          { id: "student-2", title: "Inactive", description: "", status: "Inactive", createdAt: "Firebase" },
        ],
        lessons: [{ id: "lesson-1", title: "Lesson", description: "", status: "Published", createdAt: "Firebase" }],
        assignments: [{ id: "assignment-1", title: "Assignment", description: "", status: "Draft", createdAt: "Firebase" }],
      }),
      [{ id: "course-1", title: "Course", isActive: true, enrolledStudentIds: [] }],
      [
        { id: "batch-1", courseId: "course-1", name: "Batch 1", isActive: true, enrolledStudentIds: [] },
        { id: "batch-2", courseId: "course-1", name: "Batch 2", isActive: false, enrolledStudentIds: [] },
      ],
      now,
    );

    expect(data.students).toEqual({ total: 2, active: 1, inactive: 1 });
    expect(data.courses).toEqual({ total: 1, active: 1 });
    expect(data.batches).toEqual({ total: 2, active: 1 });
    expect(data.publishedContent).toBe(1);
    expect(data.draftContent).toBe(1);
    expect(data.content.find(item => item.key === "assignments")).toMatchObject({ total: 1, published: 0, draft: 1 });
  });

  it("sorts published assignments and quizzes by their next scheduled event", () => {
    const data = buildOverviewDashboardData(
      recordsWith({
        assignments: [
          { id: "assignment-late", title: "Later", description: "", status: "Published", createdAt: "Firebase", fields: { dueAt: "2026-09-15T09:00" } },
          { id: "assignment-soon", title: "Soon", description: "", status: "Published", createdAt: "Firebase", fields: { dueAt: "2026-09-13T09:00" } },
        ],
        quizzes: [{ id: "quiz-soon", title: "Quiz", description: "", status: "Published", createdAt: "Firebase", fields: { opensAt: "2026-09-14T09:00" } }],
      }),
      [],
      [],
      now,
    );

    expect(data.upcomingWork.map(item => item.id)).toEqual(["assignment-soon", "quiz-soon", "assignment-late"]);
    expect(data.upcomingWork[1]).toMatchObject({ section: "quizzes", label: "Opens" });
  });

  it("ignores drafts, invalid dates, and past scheduled work", () => {
    const data = buildOverviewDashboardData(
      recordsWith({
        assignments: [
          { id: "draft", title: "Draft", description: "", status: "Draft", createdAt: "Firebase", fields: { dueAt: "2026-09-13T09:00" } },
          { id: "invalid", title: "Invalid", description: "", status: "Published", createdAt: "Firebase", fields: { dueAt: "not-a-date" } },
        ],
        quizzes: [{ id: "past", title: "Past", description: "", status: "Published", createdAt: "Firebase", fields: { opensAt: "2026-09-10T09:00", closesAt: "2026-09-11T09:00" } }],
      }),
      [],
      [],
      now,
    );

    expect(data.upcomingWork).toEqual([]);
    expect(data.emptyModules.map(item => item.key)).toEqual(["announcements", "lessons"]);
  });

  it("builds student growth and ranks performers by weighted quiz score", () => {
    const data = buildOverviewDashboardData(
      recordsWith({
        students: [
          { id: "student-1", title: "Ada", description: "", status: "Active", createdAt: "2026-08-10T09:00:00" },
          { id: "student-2", title: "Grace", description: "", status: "Active", createdAt: "2026-09-01T09:00:00" },
        ],
      }),
      [],
      [],
      now,
      [
        { studentId: "student-1", bestScore: 9, bestTotalMarks: 10, bestPercentage: 90, attemptCount: 1, latestSubmittedAtMillis: null },
        { studentId: "student-1", bestScore: 18, bestTotalMarks: 20, bestPercentage: 90, attemptCount: 1, latestSubmittedAtMillis: null },
        { studentId: "student-2", bestScore: 8, bestTotalMarks: 10, bestPercentage: 80, attemptCount: 1, latestSubmittedAtMillis: null },
      ],
    );

    expect(data.studentGrowth.at(-2)).toMatchObject({ label: "Aug", count: 1 });
    expect(data.studentGrowth.at(-1)).toMatchObject({ label: "Sep", count: 1 });
    expect(data.topPerformers.map(item => item.name)).toEqual(["Ada", "Grace"]);
    expect(data.topPerformers[0]).toMatchObject({ score: 90, quizCount: 2 });
  });
});
