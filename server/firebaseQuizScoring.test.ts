import { describe, expect, it } from 'vitest';
import { calculateTrustedQuizScore } from '../functions/src/scoring';

describe('trusted Firebase quiz scoring', () => {
  it('calculates results only from protected question answers and configured marks', () => {
    expect(calculateTrustedQuizScore([
      { id: 'question-1', correctAnswerIndex: 1, marks: 2 },
      { id: 'question-2', correctAnswerIndex: 0, marks: 3 },
    ], [
      { questionId: 'question-1', selectedAnswerIndex: 1 },
      { questionId: 'question-2', selectedAnswerIndex: 2 },
    ])).toEqual({ score: 2, totalMarks: 5, percentage: 40 });
  });
});
