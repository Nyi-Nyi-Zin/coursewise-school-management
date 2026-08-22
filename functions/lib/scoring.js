"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTrustedQuizScore = calculateTrustedQuizScore;
function calculateTrustedQuizScore(questions, answers) {
    const selectedByQuestion = new Map(answers.map(answer => [answer.questionId, answer.selectedAnswerIndex]));
    const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
    const score = questions.reduce((total, question) => total + (selectedByQuestion.get(question.id) === question.correctAnswerIndex ? question.marks : 0), 0);
    return { score, totalMarks, percentage: totalMarks === 0 ? 0 : Math.round((score / totalMarks) * 100) };
}
