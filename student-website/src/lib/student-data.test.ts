import { describe, expect, it } from "vitest";
import { demoAnnouncements, demoAttendance, demoLessons } from "./student-data";

describe("Student Website data contracts", () => {
  it("provides unique, renderable lesson records for the learning portal", () => {
    expect(demoLessons.length).toBeGreaterThan(0);
    expect(new Set(demoLessons.map((lesson) => lesson.id)).size).toBe(demoLessons.length);
    expect(demoLessons.every((lesson) => lesson.title && lesson.module && lesson.duration)).toBe(true);
  });

  it("uses only the required attendance statuses", () => {
    expect(new Set(demoAttendance.map((record) => record.status))).toEqual(new Set(["Present", "Late"]));
    expect(demoAttendance.every((record) => ["Present", "Absent", "Late", "Excused"].includes(record.status))).toBe(true);
  });

  it("has a published announcement surface for the Student Website home flow", () => {
    expect(demoAnnouncements.length).toBeGreaterThan(0);
    expect(demoAnnouncements.every((announcement) => announcement.title && announcement.description)).toBe(true);
  });
});
