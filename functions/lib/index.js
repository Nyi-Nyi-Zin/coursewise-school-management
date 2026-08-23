"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCreatePasswordResetLink = exports.adminListStudents = exports.adminCreateStudentAccount = exports.submitQuizAttempt = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const scoring_js_1 = require("./scoring.js");
(0, app_1.initializeApp)();
async function assertBatchEnrollment(studentId, courseId, batchId) {
    const enrollment = await (0, firestore_1.getFirestore)().doc(`enrollments/${courseId}_${batchId}_${studentId}`).get();
    if (!enrollment.exists || enrollment.data()?.status !== 'active') {
        throw new https_1.HttpsError('permission-denied', 'You are not enrolled in this course batch.');
    }
}
async function assertAdmin(userId) {
    const user = await (0, firestore_1.getFirestore)().collection('users').doc(userId).get();
    if (!user.exists || user.data()?.role !== 'admin')
        throw new https_1.HttpsError('permission-denied', 'Administrator access is required.');
}
exports.submitQuizAttempt = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before submitting a quiz.');
    const quizId = request.data?.quizId;
    const answers = request.data?.answers;
    if (typeof quizId !== 'string' || !Array.isArray(answers)) {
        throw new https_1.HttpsError('invalid-argument', 'A quiz ID and answer list are required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const quiz = await db.collection('quizzes').doc(quizId).get();
    if (!quiz.exists || quiz.data()?.isPublished !== true) {
        throw new https_1.HttpsError('not-found', 'This quiz is not available.');
    }
    const courseId = String(quiz.data()?.courseId ?? '');
    const batchId = String(quiz.data()?.batchId ?? '');
    if (!courseId || !batchId)
        throw new https_1.HttpsError('failed-precondition', 'This quiz is missing course or batch information.');
    await assertBatchEnrollment(request.auth.uid, courseId, batchId);
    const questionSnapshot = await quiz.ref.collection('questions').orderBy('sortOrder').get();
    const answerKeySnapshot = await quiz.ref.collection('answerKeys').get();
    const answerKeys = new Map(answerKeySnapshot.docs.map(key => [key.id, Number(key.data().correctAnswerIndex)]));
    const result = (0, scoring_js_1.calculateTrustedQuizScore)(questionSnapshot.docs.map(question => ({ id: question.id, correctAnswerIndex: answerKeys.get(question.id) ?? -1, marks: Number(question.data().marks ?? 1) })), answers);
    const attempt = await db.collection('quizAttempts').add({
        quizId,
        studentId: request.auth.uid,
        courseId,
        batchId,
        answers: answers.map(answer => ({ questionId: answer.questionId, selectedAnswerIndex: answer.selectedAnswerIndex })),
        ...result,
        submittedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { id: attempt.id, ...result };
});
exports.adminCreateStudentAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before creating a student account.');
    await assertAdmin(request.auth.uid);
    const name = String(request.data?.name ?? '').trim();
    const email = String(request.data?.email ?? '').trim().toLowerCase();
    const studentId = String(request.data?.studentId ?? '').trim();
    const photoUrl = typeof request.data?.photoUrl === 'string' ? request.data.photoUrl.trim() : '';
    const isActive = request.data?.isActive !== false;
    if (!name || !email.includes('@') || !studentId) {
        throw new https_1.HttpsError('invalid-argument', 'A student name, email address, and student ID are required.');
    }
    const auth = (0, auth_1.getAuth)();
    try {
        const user = await auth.createUser({ email, password: (0, node_crypto_1.randomBytes)(18).toString('base64url'), displayName: name });
        await (0, firestore_1.getFirestore)().collection('users').doc(user.uid).set({
            name,
            email,
            role: 'student',
            studentId,
            isActive,
            ...(photoUrl ? { photoUrl } : {}),
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const resetLink = await auth.generatePasswordResetLink(email);
        return { uid: user.uid, resetLink };
    }
    catch (error) {
        if (typeof error === 'object' && error && 'errorInfo' in error) {
            const code = error.errorInfo?.code ?? '';
            if (code.includes('email-already-exists'))
                throw new https_1.HttpsError('already-exists', 'An account with this email already exists.');
            if (code.includes('invalid-email'))
                throw new https_1.HttpsError('invalid-argument', 'The email address is not valid.');
        }
        throw new https_1.HttpsError('internal', 'Could not create the student account.');
    }
});
exports.adminListStudents = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before viewing students.');
    await assertAdmin(request.auth.uid);
    const snapshot = await (0, firestore_1.getFirestore)().collection('users').where('role', '==', 'student').get();
    return snapshot.docs.map(student => ({ id: student.id, data: student.data() }));
});
exports.adminCreatePasswordResetLink = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before requesting a reset link.');
    await assertAdmin(request.auth.uid);
    const email = request.data?.email;
    if (typeof email !== 'string' || !email.includes('@'))
        throw new https_1.HttpsError('invalid-argument', 'A student email address is required.');
    const link = await (0, auth_1.getAuth)().generatePasswordResetLink(email);
    return { link };
});
