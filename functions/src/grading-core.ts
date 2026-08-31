/**
 * Pure auto-grading rules shared by the trusted submit function and tests.
 * No Firestore or firebase-functions imports are allowed here so the logic
 * stays unit-testable and deterministic.
 */

export type QuizKind = 'chapter_quiz' | 'final_exam';

export const DEFAULT_PASSING_PERCENT = 50;

/** Submissions up to this many seconds past the limit are still accepted so an
 * automatic submit triggered by the client countdown is never punished. */
export const AUTO_SUBMIT_GRACE_SECONDS = 120;

export type EligibilityInput = {
  kind: QuizKind;
  /** Server clock in milliseconds. */
  now: number;
  opensAt: number | null;
  closesAt: number | null;
  /** Time limit in seconds; 0/null means untimed. */
  durationSeconds: number;
  /** Client-reported start of this attempt in epoch milliseconds, if known. */
  startedAt: number | null;
  /** Number of attempts already recorded for this student and assessment. */
  previousAttempts: number;
  /** Whether a previous attempt already reached the passing percentage. */
  alreadyPassed: boolean;
  /** Maximum retakes after the first attempt; -1 means unlimited. */
  maxRetakes: number;
};

export type EligibilityResult =
  | { ok: true; elapsedSeconds: number }
  | { ok: false; code: 'not-open' | 'closed' | 'already-passed' | 'no-attempts-remaining' | 'time-expired'; message: string };

export function isPassing(percentage: number, passingPercent: number | null | undefined): boolean {
  const threshold = typeof passingPercent === 'number' && passingPercent > 0 ? passingPercent : DEFAULT_PASSING_PERCENT;
  return percentage >= threshold;
}

export function remainingAttempts(maxRetakes: number, previousAttempts: number): number | null {
  if (!Number.isFinite(maxRetakes) || maxRetakes < 0) return null;
  return Math.max(0, maxRetakes + 1 - previousAttempts);
}

function withinWindow(now: number, opensAt: number | null, closesAt: number | null): EligibilityResult | null {
  if (opensAt !== null && now < opensAt) {
    return { ok: false, code: 'not-open', message: 'This assessment is not open yet.' };
  }
  if (closesAt !== null && now >= closesAt) {
    return { ok: false, code: 'closed', message: 'This assessment is closed.' };
  }
  return null;
}

export function evaluateAttemptEligibility(input: EligibilityInput): EligibilityResult {
  const windowFailure = withinWindow(input.now, input.opensAt, input.closesAt);
  if (windowFailure) return windowFailure;

  if (input.kind === 'final_exam') {
    if (input.alreadyPassed) {
      return { ok: false, code: 'already-passed', message: 'You already passed this final exam.' };
    }
    if (remainingAttempts(input.maxRetakes, input.previousAttempts) === 0) {
      return { ok: false, code: 'no-attempts-remaining', message: 'No attempts remain for this final exam.' };
    }
  }

  const elapsedSeconds = measureElapsedTime(input.kind === 'final_exam' ? input.durationSeconds : 0, input.startedAt, input.now);
  if (elapsedSeconds === null) {
    return { ok: false, code: 'time-expired', message: 'Time is up for this assessment.' };
  }
  return { ok: true, elapsedSeconds };
}

/** Returns the clamped elapsed seconds, or null when the submission arrived too
 * late even for the automatic-submit grace window. Untimed assessments always
 * report 0 seconds spent. */
function measureElapsedTime(durationSeconds: number, startedAt: number | null, now: number): number | null {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  const limitMs = durationSeconds * 1000;
  const graceMs = AUTO_SUBMIT_GRACE_SECONDS * 1000;
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return durationSeconds;
  const rawElapsedMs = Math.max(0, now - startedAt);
  if (rawElapsedMs > limitMs + graceMs) return null;
  return Math.min(durationSeconds, Math.round(rawElapsedMs / 1000));
}

export type AttemptOutcome = {
  attemptId: string;
  attemptNumber: number;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  /** Server-side commit time in epoch milliseconds. */
  submittedAtMillis: number;
};

export type StoredQuizSummary = {
  quizId: string;
  studentId: string;
  kind: QuizKind;
  attemptCount: number;
  bestScore: number;
  bestTotalMarks: number;
  bestPercentage: number;
  bestAttemptId: string | null;
  latestAttemptId: string | null;
  latestScore: number;
  latestTotalMarks: number;
  latestPercentage: number;
  latestPassed: boolean;
  latestSubmittedAtMillis: number | null;
  latestTimeSpentSeconds: number;
  /** True once any attempt reached the passing percentage. */
  passed: boolean;
};

export function emptySummary(quizId: string, studentId: string, kind: QuizKind): StoredQuizSummary {
  return {
    quizId,
    studentId,
    kind,
    attemptCount: 0,
    bestScore: 0,
    bestTotalMarks: 0,
    bestPercentage: 0,
    bestAttemptId: null,
    latestAttemptId: null,
    latestScore: 0,
    latestTotalMarks: 0,
    latestPercentage: 0,
    latestPassed: false,
    latestSubmittedAtMillis: null,
    latestTimeSpentSeconds: 0,
    passed: false,
  };
}

/** Keeps the best score per assessment plus the latest result, as required for
 * chapter quizzes (best kept) and final exams (latest and best kept). */
export function mergeQuizSummary(previous: StoredQuizSummary | undefined, outcome: AttemptOutcome, kind: QuizKind, quizId: string, studentId: string): StoredQuizSummary {
  const base = previous ?? emptySummary(quizId, studentId, kind);
  const beatsBest =
    outcome.percentage > base.bestPercentage ||
    (outcome.percentage === base.bestPercentage && outcome.score > base.bestScore);
  return {
    ...base,
    kind,
    attemptCount: base.attemptCount + 1,
    bestScore: beatsBest ? outcome.score : base.bestScore,
    bestTotalMarks: beatsBest ? outcome.totalMarks : base.bestTotalMarks,
    bestPercentage: beatsBest ? outcome.percentage : base.bestPercentage,
    bestAttemptId: beatsBest ? outcome.attemptId : base.bestAttemptId ?? outcome.attemptId,
    latestAttemptId: outcome.attemptId,
    latestScore: outcome.score,
    latestTotalMarks: outcome.totalMarks,
    latestPercentage: outcome.percentage,
    latestPassed: outcome.passed,
    latestSubmittedAtMillis: outcome.submittedAtMillis,
    latestTimeSpentSeconds: outcome.timeSpentSeconds,
    passed: base.passed || outcome.passed,
  };
}
