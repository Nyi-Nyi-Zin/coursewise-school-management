import { describe, expect, it } from "vitest";

import { evaluateAttemptEligibility, remainingAttempts } from "../functions/src/grading-core";

describe("quiz retake limits", () => {
  it("counts maxRetakes after the initial attempt", () => {
    expect(remainingAttempts(2, 0)).toBe(3);
    expect(remainingAttempts(2, 1)).toBe(2);
    expect(remainingAttempts(2, 3)).toBe(0);
    expect(remainingAttempts(-1, 500)).toBeNull();
  });

  it("blocks chapter quizzes after the configured retake limit", () => {
    expect(evaluateAttemptEligibility({
      kind: "chapter_quiz",
      now: 1_000,
      opensAt: null,
      closesAt: null,
      durationSeconds: 0,
      startedAt: null,
      previousAttempts: 2,
      alreadyPassed: false,
      maxRetakes: 1,
    })).toMatchObject({ ok: false, code: "no-attempts-remaining" });
  });
});
