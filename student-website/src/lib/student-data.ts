export type Announcement = { id: string; title: string; description: string; accent: string; publishedAt: string; bannerUrl?: string; linkUrl?: string };
export type Lesson = { id: string; title: string; description: string; module: string; duration: string; status: "new" | "complete" | "continue"; thumbnailUrl?: string; telegramUrl?: string; videoUrl?: string; pdfUrl?: string };
export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

export const studentQueryKeys = {
  profile: ["student", "profile"] as const,
  announcements: ["student", "announcements"] as const,
  lessons: ["student", "lessons"] as const,
  lessonProgress: ["student", "lessonProgress"] as const,
  quizzes: ["student", "quizzes"] as const,
  attendance: ["student", "attendance"] as const,
  assignments: ["student", "assignments"] as const,
};

export const demoAnnouncements: Announcement[] = [
  { id: "orientation", title: "Welcome to Teza Tech Lab", description: "Your next learning chapter starts here. Explore your courses and stay on track.", accent: "from-sky-400/30 via-blue-500/20 to-transparent", publishedAt: "Today" },
  { id: "quiz-week", title: "Quiz week is open", description: "Review your lessons and complete each published quiz before its due date.", accent: "from-lime-300/20 via-teal-400/10 to-transparent", publishedAt: "This week" },
];

export const demoLessons: Lesson[] = [
  { id: "web-basics", title: "Modern Web Foundations", description: "Understand the browser, responsive layout, and clean interface patterns.", module: "Module 01", duration: "42 min", status: "continue" },
  { id: "logic", title: "Programming Logic", description: "Build reliable problem-solving habits through practical exercises.", module: "Module 02", duration: "36 min", status: "new" },
  { id: "project", title: "Project Planning", description: "Turn a product idea into a well-scoped build plan.", module: "Module 03", duration: "28 min", status: "complete" },
];

export const demoAttendance: { date: string; status: AttendanceStatus; note: string }[] = [
  { date: "Mon, 18 Aug", status: "Present", note: "On time" },
  { date: "Wed, 20 Aug", status: "Late", note: "Joined 10 minutes late" },
  { date: "Fri, 22 Aug", status: "Present", note: "On time" },
];

const DEMO_LESSON_PROGRESS_KEY = "demo-lesson-progress";

// Demo mode stores per-student lesson status in localStorage so progress
// survives reloads without a Firebase project. On clean profiles the seed
// mirrors the representative statuses demoLessons already ships with.
export function getDemoLessonProgress(): Map<string, Lesson["status"]> {
  const seed = new Map(demoLessons.map((lesson) => [lesson.id, lesson.status] as const));
  if (typeof window === "undefined") return seed;
  try {
    const stored = window.localStorage.getItem(DEMO_LESSON_PROGRESS_KEY);
    if (!stored) {
      window.localStorage.setItem(DEMO_LESSON_PROGRESS_KEY, JSON.stringify([...seed]));
      return seed;
    }
    const restored = new Map<string, Lesson["status"]>();
    const parsed = JSON.parse(stored) as [string, Lesson["status"]][];
    parsed.forEach(([lessonId, status]) => {
      if (lessonId && (status === "new" || status === "continue" || status === "complete")) restored.set(lessonId, status);
    });
    return restored;
  } catch {
    // Storage may be unavailable (private mode); fall back to the in-memory seed.
    return seed;
  }
}

export function setDemoLessonProgress(lessonId: string, status: Lesson["status"]): void {
  if (typeof window === "undefined") return;
  try {
    const next = new Map(getDemoLessonProgress());
    next.set(lessonId, status);
    window.localStorage.setItem(DEMO_LESSON_PROGRESS_KEY, JSON.stringify([...next]));
  } catch {
    // Non-fatal in demo mode: the status just won't persist across reloads.
  }
}
