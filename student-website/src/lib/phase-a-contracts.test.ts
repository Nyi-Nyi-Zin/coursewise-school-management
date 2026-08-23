import { describe, expect, it } from "vitest";
import { buildStudentProgress, clampScore } from "../../../shared/phase-a-contracts";
import { mobileResponsiveEnabled } from "../../../shared/portal-display-settings";

describe("Phase A student progress contracts", () => {
  it("clamps grade scores before producing a private progress summary", () => {
    expect(clampScore(120, 100)).toBe(100);
    expect(buildStudentProgress([{ score: 120, maxScore: 100 }, { score: 25, maxScore: 50 }])).toEqual({
      averagePercent: 83,
      completedGradeItems: 2,
      totalPossibleMarks: 150,
      earnedMarks: 125,
    });
  });

  it("keeps the new portal release responsive by default", () => {
    expect(mobileResponsiveEnabled).toBe(true);
  });
});
