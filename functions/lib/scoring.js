"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTrustedQuizScore = calculateTrustedQuizScore;
function normalizeSelection(answer) {
    if (!answer)
        return [];
    if (Array.isArray(answer.selectedIndices)) {
        return [...new Set(answer.selectedIndices.filter(index => Number.isInteger(index)))].sort((first, second) => first - second);
    }
    return Number.isInteger(answer.selectedAnswerIndex) ? [answer.selectedAnswerIndex] : [];
}
function normalizeKey(indices, fallback) {
    const source = Array.isArray(indices) && indices.length ? indices : [fallback];
    return [...new Set(source.filter(index => Number.isInteger(index)))].sort((first, second) => first - second);
}
function sameSet(first, second) {
    return first.length === second.length && first.every((value, index) => value === second[index]);
}
function calculateTrustedQuizScore(questions, answers) {
    const answersByQuestion = new Map(answers.map(answer => [answer.questionId, answer]));
    const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
    const gradedQuestions = questions.map(question => {
        const expected = normalizeKey(question.correctAnswerIndices, question.correctAnswerIndex);
        const actual = normalizeSelection(answersByQuestion.get(question.id));
        const correct = sameSet(expected, actual);
        return { questionId: question.id, marksEarned: correct ? question.marks : 0, correct };
    });
    const score = gradedQuestions.reduce((total, question) => total + question.marksEarned, 0);
    return { score, totalMarks, percentage: totalMarks === 0 ? 0 : Math.round((score / totalMarks) * 100), gradedQuestions };
}
