import { describe, expect, it } from "vitest";
import { mergeAdminRecordDelete, mergeAdminRecordSave } from "./admin-records-query";
import { emptyOfflineRecords } from "./offline-records";

describe("Admin Website record cache helpers", () => {
  const student = { id: "student-1", title: "Mya", description: "TL-001", status: "Active", createdAt: "Today" };
  it("adds and updates an item only in its management module", () => {
    const first = mergeAdminRecordSave(emptyOfflineRecords, "students", student);
    const updated = mergeAdminRecordSave(first, "students", { ...student, status: "Inactive" });
    expect(updated.students).toEqual([{ ...student, status: "Inactive" }]);
    expect(updated.lessons).toEqual([]);
  });
  it("deletes an item from the targeted module without mutating other modules", () => {
    const withStudent = mergeAdminRecordSave(emptyOfflineRecords, "students", student);
    const withLesson = mergeAdminRecordSave(withStudent, "lessons", { id: "lesson-1", title: "Web", description: "", status: "Published", createdAt: "Today" });
    const result = mergeAdminRecordDelete(withLesson, "students", "student-1");
    expect(result.students).toEqual([]);
    expect(result.lessons).toHaveLength(1);
  });
});
