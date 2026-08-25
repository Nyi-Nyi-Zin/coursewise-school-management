import { describe, expect, it } from 'vitest';
import { calculateTrustedQuizScore } from '../functions/src/scoring';

describe('trusted Firebase quiz scoring', () => {
  it('calculates results only from protected question answers and configured marks', () => {
    const result = calculateTrustedQuizScore([
      { id: 'question-1', correctAnswerIndex: 1, marks: 2 },
      { id: 'question-2', correctAnswerIndex: 0, marks: 3 },
    ], [
      { questionId: 'question-1', selectedAnswerIndex: 1 },
      { questionId: 'question-2', selectedAnswerIndex: 2 },
    ]);
    expect(result.score).toBe(2);
    expect(result.totalMarks).toBe(5);
    expect(result.percentage).toBe(40);
    expect(result.gradedQuestions).toEqual([
      { questionId: 'question-1', marksEarned: 2, correct: true },
      { questionId: 'question-2', marksEarned: 0, correct: false },
    ]);
  });

  it('grades multiple-select questions with an exact set match', () => {
    const questions = [{ id: 'q1', correctAnswerIndex: -1, correctAnswerIndices: [0, 2], marks: 4 }];
    expect(calculateTrustedQuizScore(questions, [{ questionId: 'q1', selectedIndices: [2, 0] }]).score).toBe(4);
    expect(calculateTrustedQuizScore(questions, [{ questionId: 'q1', selectedIndices: [0] }]).score).toBe(0);
    expect(calculateTrustedQuizScore(questions, [{ questionId: 'q1', selectedIndices: [0, 1, 2] }]).score).toBe(0);
    expect(calculateTrustedQuizScore(questions, [{ questionId: 'q1', selectedIndices: [] }]).score).toBe(0);
  });

  it('treats missing or unanswered questions as zero marks without breaking totals', () => {
    const result = calculateTrustedQuizScore([
      { id: 'a', correctAnswerIndex: 0, marks: 2 },
      { id: 'b', correctAnswerIndex: 1, marks: 3 },
    ], []);
    expect(result).toMatchObject({ score: 0, totalMarks: 5, percentage: 0 });
  });
});
