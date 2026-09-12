import type { BatchRecord, CourseRecord } from "./course-batch-service";
import type { OfflineItem, OfflineRecords } from "./offline-records";

export const overviewContentSections = [
  { key: "announcements", label: "Announcements" },
  { key: "lessons", label: "Lessons" },
  { key: "assignments", label: "Assignments" },
  { key: "quizzes", label: "Quizzes" },
] as const;

export type OverviewContentSection = (typeof overviewContentSections)[number]["key"];
export type OverviewNavigationSection = "students" | "courses" | OverviewContentSection;

export type OverviewContentSummary = {
  key: OverviewContentSection;
  label: string;
  total: number;
  published: number;
  draft: number;
};

export type OverviewUpcomingWork = {
  id: string;
  title: string;
  section: "assignments" | "quizzes";
  label: "Due" | "Opens" | "Closes";
  date: string;
  timestamp: number;
};

export type OverviewQuizSummary = {
  studentId: string;
  bestScore: number;
  bestTotalMarks: number;
  bestPercentage: number;
  attemptCount: number;
  latestSubmittedAtMillis: number | null;
};

export type OverviewStudentGrowth = { label: string; count: number };
export type OverviewTopPerformer = { studentId: string; name: string; score: number; quizCount: number };

export type OverviewDashboardData = {
  students: { total: number; active: number; inactive: number };
  courses: { total: number; active: number };
  batches: { total: number; active: number };
  publishedContent: number;
  draftContent: number;
  content: OverviewContentSummary[];
  emptyModules: OverviewContentSummary[];
  upcomingWork: OverviewUpcomingWork[];
  studentGrowth: OverviewStudentGrowth[];
  topPerformers: OverviewTopPerformer[];
};

export function buildOverviewDashboardData(
  records: OfflineRecords,
  courses: CourseRecord[] = [],
  batches: BatchRecord[] = [],
  now = new Date(),
  quizSummaries: OverviewQuizSummary[] = [],
): OverviewDashboardData {
  const activeStudents = records.students.filter(item => item.status === "Active").length;
  const content = overviewContentSections.map(({ key, label }) => {
    const items = records[key];
    const published = items.filter(item => item.status === "Published").length;
    return { key, label, total: items.length, published, draft: items.length - published };
  });

  const publishedContent = content.reduce((total, item) => total + item.published, 0);
  const draftContent = content.reduce((total, item) => total + item.draft, 0);

  return {
    students: {
      total: records.students.length,
      active: activeStudents,
      inactive: records.students.length - activeStudents,
    },
    courses: {
      total: courses.length,
      active: courses.filter(item => item.isActive).length,
    },
    batches: {
      total: batches.length,
      active: batches.filter(item => item.isActive).length,
    },
    publishedContent,
    draftContent,
    content,
    emptyModules: content.filter(item => item.total === 0),
    upcomingWork: collectUpcomingWork(records, now),
    studentGrowth: buildStudentGrowth(records, now),
    topPerformers: buildTopPerformers(records, quizSummaries),
  };
}

function buildStudentGrowth(records: OfflineRecords, now: Date): OverviewStudentGrowth[] {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { date, key: `${date.getFullYear()}-${date.getMonth()}` };
  });
  const counts = new Map(months.map(month => [month.key, 0]));

  for (const student of records.students) {
    const createdAt = parseDate(student.createdAt);
    if (!createdAt) continue;
    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return months.map(({ date, key }) => ({
    label: date.toLocaleDateString("en-US", { month: "short" }),
    count: counts.get(key) ?? 0,
  }));
}

function buildTopPerformers(records: OfflineRecords, summaries: OverviewQuizSummary[]): OverviewTopPerformer[] {
  const names = new Map(records.students.map(student => [student.id, student.title]));
  const totals = new Map<string, { score: number; totalMarks: number; quizCount: number }>();

  for (const summary of summaries) {
    if (!summary.studentId || summary.attemptCount <= 0) continue;
    const score = Number(summary.bestScore);
    const totalMarks = Number(summary.bestTotalMarks);
    const fallbackPercentage = Number(summary.bestPercentage);
    const result = totals.get(summary.studentId) ?? { score: 0, totalMarks: 0, quizCount: 0 };

    if (Number.isFinite(score) && Number.isFinite(totalMarks) && totalMarks > 0) {
      result.score += score;
      result.totalMarks += totalMarks;
    } else if (Number.isFinite(fallbackPercentage)) {
      result.score += fallbackPercentage;
      result.totalMarks += 100;
    }
    result.quizCount += 1;
    totals.set(summary.studentId, result);
  }

  return [...totals.entries()]
    .map(([studentId, result]) => ({
      studentId,
      name: names.get(studentId) ?? "Student",
      score: result.totalMarks ? Math.round((result.score / result.totalMarks) * 100) : 0,
      quizCount: result.quizCount,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function collectUpcomingWork(records: OfflineRecords, now: Date): OverviewUpcomingWork[] {
  const nowTimestamp = now.getTime();
  const candidates: Array<OverviewUpcomingWork | null> = [];

  for (const item of records.assignments) {
    if (item.status !== "Published") continue;
    const dueAt = parseDate(item.fields?.dueAt);
    if (dueAt && dueAt.getTime() >= nowTimestamp) {
      candidates.push({
        id: item.id,
        title: item.title,
        section: "assignments",
        label: "Due",
        date: item.fields?.dueAt ?? "",
        timestamp: dueAt.getTime(),
      });
    }
  }

  for (const item of records.quizzes) {
    if (item.status !== "Published") continue;
    const opensAt = parseDate(item.fields?.opensAt);
    const closesAt = parseDate(item.fields?.closesAt);
    const nextEvent = opensAt && opensAt.getTime() >= nowTimestamp
      ? { label: "Opens" as const, date: item.fields?.opensAt ?? "", parsed: opensAt }
      : closesAt && closesAt.getTime() >= nowTimestamp
        ? { label: "Closes" as const, date: item.fields?.closesAt ?? "", parsed: closesAt }
        : null;

    if (nextEvent) {
      candidates.push({
        id: item.id,
        title: item.title,
        section: "quizzes",
        label: nextEvent.label,
        date: nextEvent.date,
        timestamp: nextEvent.parsed.getTime(),
      });
    }
  }

  return candidates
    .filter((item): item is OverviewUpcomingWork => item !== null)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 5);
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatOverviewDate(value: string) {
  const date = parseDate(value);
  if (!date) return "Date unavailable";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function sectionLabel(section: OverviewNavigationSection) {
  if (section === "students") return "Students";
  if (section === "courses") return "Courses & batches";
  return overviewContentSections.find(item => item.key === section)?.label ?? section;
}

export function contentItems(records: OfflineRecords, section: OverviewContentSection): OfflineItem[] {
  return records[section];
}
