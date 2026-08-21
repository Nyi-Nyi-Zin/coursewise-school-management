export type TrustedQuizQuestion = { id: string; correctAnswerIndex: number; marks: number };
export type SubmittedQuizAnswer = { questionId: string; selectedAnswerIndex: number };

export function calculateTrustedQuizScore(questions: TrustedQuizQuestion[], answers: SubmittedQuizAnswer[]) {
  const selectedByQuestion = new Map(answers.map(answer => [answer.questionId, answer.selectedAnswerIndex]));
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const score = questions.reduce((total, question) => total + (selectedByQuestion.get(question.id) === question.correctAnswerIndex ? question.marks : 0), 0);
  return { score, totalMarks, percentage: totalMarks === 0 ? 0 : Math.round((score / totalMarks) * 100) };
}
