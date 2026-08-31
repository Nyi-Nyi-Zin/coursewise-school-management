// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { demoLessons, getDemoLessonProgress, setDemoLessonProgress } from "./student-data";

const PROGRESS_KEY = "demo-lesson-progress";

describe("Demo lesson progress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("seeds one status per demo lesson on first access", () => {
    const progress = getDemoLessonProgress();
    expect(progress.size).toBe(demoLessons.length);
    demoLessons.forEach(lesson => expect(progress.get(lesson.id)).toBe(lesson.status));
  });

  it("persists status changes so later reads return the new status", () => {
    const lesson = demoLessons[0];
    setDemoLessonProgress(lesson.id, "complete");
    expect(getDemoLessonProgress().get(lesson.id)).toBe("complete");
  });

  it("keeps an updated status across independent reads", () => {
    setDemoLessonProgress(demoLessons[1].id, "continue");
    const first = getDemoLessonProgress();
    const second = getDemoLessonProgress();
    expect(first.get(demoLessons[1].id)).toBe("continue");
    expect(second.get(demoLessons[1].id)).toBe("continue");
  });

  it("discards invalid stored statuses", () => {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify([["web-basics", "invalid"], ["logic", "continue"]]));
    const progress = getDemoLessonProgress();
    expect(progress.get("web-basics")).toBeUndefined();
    expect(progress.get("logic")).toBe("continue");
  });

  it("falls back to the seed when stored data is unreadable", () => {
    window.localStorage.setItem(PROGRESS_KEY, "{not json");
    const progress = getDemoLessonProgress();
    expect(progress.size).toBe(demoLessons.length);
  });
});