export const gradeCategories = ["Assessment", "Assignment", "Project", "Participation"] as const;
export type GradeCategory = (typeof gradeCategories)[number];

export type GradeRecord = {
  id: string;
  studentId: string;
  courseId: string;
  batchId: string;
  title: string;
  category: GradeCategory;
  score: number;
  maxScore: number;
  feedback?: string;
  updatedAt?: string;
};

export type StudentProgressSummary = {
  averagePercent: number | null;
  completedGradeItems: number;
  totalPossibleMarks: number;
  earnedMarks: number;
};

export type PortalNotificationKind = "general" | "grade" | "attendance" | "assignment";
export type PortalNotification = {
  id: string;
  recipientId: string;
  courseId: string;
  batchId: string;
  title: string;
  body: string;
  kind: PortalNotificationKind;
  isRead: boolean;
  createdAt?: string;
};

export function clampScore(score: number, maxScore: number) {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return 0;
  return Math.min(Math.max(score, 0), maxScore);
}

export function buildStudentProgress(records: Pick<GradeRecord, "score" | "maxScore">[]): StudentProgressSummary {
  const totalPossibleMarks = records.reduce((total, record) => total + Math.max(0, Number(record.maxScore) || 0), 0);
  const earnedMarks = records.reduce((total, record) => total + clampScore(Number(record.score) || 0, Number(record.maxScore) || 0), 0);
  return {
    averagePercent: totalPossibleMarks ? Math.round((earnedMarks / totalPossibleMarks) * 100) : null,
    completedGradeItems: records.length,
    totalPossibleMarks,
    earnedMarks,
  };
}
