export type TrustedQuizQuestion = {
  id: string;
  /** Correct option for single-answer questions. Ignored when correctAnswerIndices is present. */
  correctAnswerIndex: number;
  /** Correct options for multiple-select questions; graded with an exact set match. */
  correctAnswerIndices?: number[];
  marks: number;
};
export type SubmittedQuizAnswer = { questionId: string; selectedAnswerIndex: number; selectedIndices?: number[] };

export type GradedQuestion = {
  questionId: string;
  marksEarned: number;
  correct: boolean;
};

function normalizeSelection(answer: SubmittedQuizAnswer | undefined): number[] {
  if (!answer) return [];
  if (Array.isArray(answer.selectedIndices)) {
    return [...new Set(answer.selectedIndices.filter(index => Number.isInteger(index)))].sort((first, second) => first - second);
  }
  return Number.isInteger(answer.selectedAnswerIndex) ? [answer.selectedAnswerIndex] : [];
}

function normalizeKey(indices: number[] | undefined, fallback: number): number[] {
  const source = Array.isArray(indices) && indices.length ? indices : [fallback];
  return [...new Set(source.filter(index => Number.isInteger(index)))].sort((first, second) => first - second);
}

function sameSet(first: number[], second: number[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

export function calculateTrustedQuizScore(questions: TrustedQuizQuestion[], answers: SubmittedQuizAnswer[]) {
  const answersByQuestion = new Map(answers.map(answer => [answer.questionId, answer]));
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const gradedQuestions: GradedQuestion[] = questions.map(question => {
    const expected = normalizeKey(question.correctAnswerIndices, question.correctAnswerIndex);
    const actual = normalizeSelection(answersByQuestion.get(question.id));
    const correct = sameSet(expected, actual);
    return { questionId: question.id, marksEarned: correct ? question.marks : 0, correct };
  });
  const score = gradedQuestions.reduce((total, question) => total + question.marksEarned, 0);
  return { score, totalMarks, percentage: totalMarks === 0 ? 0 : Math.round((score / totalMarks) * 100), gradedQuestions };
}
