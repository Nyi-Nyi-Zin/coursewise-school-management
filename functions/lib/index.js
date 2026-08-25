"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCreatePasswordResetLink = exports.adminListStudents = exports.registerStudentAccount = exports.adminCreateStudentAccount = exports.adminListStudentResults = exports.getMyBatchQuizzes = exports.getMyQuizResults = exports.submitQuizAttempt = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const grading_core_js_1 = require("./grading-core.js");
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
function parseSubmittedAnswers(raw) {
    if (!Array.isArray(raw))
        throw new https_1.HttpsError('invalid-argument', 'An answer list is required.');
    return raw.map(answer => {
        if (typeof answer !== 'object' || answer === null || typeof answer.questionId !== 'string') {
            throw new https_1.HttpsError('invalid-argument', 'Every answer needs a question ID.');
        }
        const parsed = answer;
        const selectedIndices = Array.isArray(parsed.selectedIndices)
            ? parsed.selectedIndices.map(index => Math.trunc(Number(index))).filter(index => Number.isInteger(index))
            : undefined;
        const selectedAnswerIndex = Number.isFinite(Number(parsed.selectedAnswerIndex)) ? Math.trunc(Number(parsed.selectedAnswerIndex)) : -1;
        return { questionId: parsed.questionId, selectedAnswerIndex, ...(selectedIndices?.length ? { selectedIndices } : {}) };
    });
}
function epochMillis(value) {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
        const millis = Number(value.toMillis());
        return Number.isFinite(millis) ? millis : null;
    }
    const parsed = typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : NaN;
    return Number.isFinite(parsed) ? parsed : null;
}
function callableDateString(value) {
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
    }
    return null;
}
function buildReview(questionIds, answerKeys, answers, graded) {
    const marksByQuestion = new Map(graded.map(entry => [entry.questionId, entry.marksEarned]));
    const answersByQuestion = new Map(answers.map(answer => [answer.questionId, answer]));
    return questionIds.map(questionId => {
        const key = answerKeys.get(questionId);
        const answer = answersByQuestion.get(questionId);
        return {
            questionId,
            selectedIndex: typeof answer?.selectedAnswerIndex === 'number' && answer.selectedAnswerIndex >= 0 ? answer.selectedAnswerIndex : null,
            selectedIndices: answer?.selectedIndices ?? [],
            correctAnswerIndex: key?.correctAnswerIndex ?? -1,
            correctAnswerIndices: key?.correctAnswerIndices ?? [],
            marksEarned: marksByQuestion.get(questionId) ?? 0,
        };
    });
}
async function loadAssessmentContext(quizId) {
    const db = (0, firestore_1.getFirestore)();
    const quiz = await db.collection('quizzes').doc(quizId).get();
    if (!quiz.exists || quiz.data()?.isPublished !== true) {
        throw new https_1.HttpsError('not-found', 'This assessment is not available.');
    }
    const data = quiz.data() ?? {};
    const courseId = String(data.courseId ?? '');
    const batchId = String(data.batchId ?? '');
    if (!courseId || !batchId)
        throw new https_1.HttpsError('failed-precondition', 'This assessment is missing course or batch information.');
    const questionSnapshot = await quiz.ref.collection('questions').orderBy('sortOrder').get();
    const questionIds = questionSnapshot.docs.map(document => document.id);
    if (!questionIds.length)
        throw new https_1.HttpsError('failed-precondition', 'This assessment has no questions yet.');
    const answerKeySnapshot = await quiz.ref.collection('answerKeys').get();
    const answerKeys = new Map(answerKeySnapshot.docs.map(keyDocument => [
        keyDocument.id,
        {
            correctAnswerIndex: Math.trunc(Number(keyDocument.data().correctAnswerIndex ?? -1)),
            ...(Array.isArray(keyDocument.data().correctAnswerIndices) ? { correctAnswerIndices: keyDocument.data().correctAnswerIndices } : {}),
        },
    ]));
    const questions = questionSnapshot.docs.map(document => ({
        id: document.id,
        correctAnswerIndex: answerKeys.get(document.id)?.correctAnswerIndex ?? -1,
        ...(answerKeys.get(document.id)?.correctAnswerIndices ? { correctAnswerIndices: answerKeys.get(document.id)?.correctAnswerIndices } : {}),
        marks: Math.max(1, Math.trunc(Number(document.data().marks ?? 1))),
    }));
    const kind = data.kind === 'final_exam' ? 'final_exam' : 'chapter_quiz';
    return {
        db,
        quizRef: quiz.ref,
        courseId,
        batchId,
        questionIds,
        questions,
        answerKeys,
        kind,
        passingPercent: Number.isFinite(Number(data.passingPercent)) ? Math.min(100, Math.max(0, Number(data.passingPercent))) : null,
        maxRetakes: Number.isFinite(Number(data.maxRetakes)) ? Math.trunc(Number(data.maxRetakes)) : -1,
        durationSeconds: Math.max(0, Math.trunc(Number(data.durationMinutes ?? 0))) * 60,
        opensAt: epochMillis(data.opensAt),
        closesAt: epochMillis(data.closesAt),
        title: String(data.title ?? 'Assessment'),
        chapter: String(data.chapter ?? ''),
    };
}
exports.submitQuizAttempt = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before submitting an assessment.');
    const studentId = request.auth.uid;
    const quizId = request.data?.quizId;
    if (typeof quizId !== 'string' || !quizId)
        throw new https_1.HttpsError('invalid-argument', 'A quiz ID is required.');
    const answers = parseSubmittedAnswers(request.data?.answers);
    const startedAtRaw = Number(request.data?.startedAt);
    const startedAt = Number.isFinite(startedAtRaw) && startedAtRaw > 0 ? startedAtRaw : null;
    const context = await loadAssessmentContext(quizId);
    await assertBatchEnrollment(studentId, context.courseId, context.batchId);
    const now = Date.now();
    const grading = (0, scoring_js_1.calculateTrustedQuizScore)(context.questions, answers);
    const summaryReference = context.db.doc(`quizSummaries/${quizId}_${studentId}`);
    const counterReference = context.db.doc(`quizAttemptCounters/${quizId}_${studentId}`);
    let committed;
    try {
        committed = await context.db.runTransaction(async (transaction) => {
            // Read both records in one transaction operation. Concurrent transaction
            // reads can be rejected by Firestore as an internal RPC error, which was
            // exposed to students as "internal [0]" during submission.
            const [summarySnapshot, counterSnapshot] = await transaction.getAll(summaryReference, counterReference);
            const previousSummary = summarySnapshot.exists ? summarySnapshot.data() : undefined;
            const recordedAttempts = counterSnapshot.exists ? Math.trunc(Number(counterSnapshot.data()?.count ?? 0)) : previousSummary?.attemptCount ?? 0;
            const eligibility = (0, grading_core_js_1.evaluateAttemptEligibility)({
                kind: context.kind,
                now,
                opensAt: context.opensAt,
                closesAt: context.closesAt,
                durationSeconds: context.durationSeconds,
                startedAt,
                previousAttempts: recordedAttempts,
                alreadyPassed: previousSummary?.passed === true,
                maxRetakes: context.maxRetakes,
            });
            if (!eligibility.ok)
                throw new https_1.HttpsError('failed-precondition', eligibility.message);
            const attemptReference = context.db.collection('quizAttempts').doc();
            const attemptNumber = recordedAttempts + 1;
            const passingThreshold = context.passingPercent ?? 50;
            const passed = grading.percentage >= passingThreshold;
            const outcome = {
                attemptId: attemptReference.id,
                attemptNumber,
                score: grading.score,
                totalMarks: grading.totalMarks,
                percentage: grading.percentage,
                passed,
                timeSpentSeconds: eligibility.elapsedSeconds,
                submittedAtMillis: now,
            };
            transaction.set(attemptReference, {
                quizId,
                kind: context.kind,
                studentId,
                courseId: context.courseId,
                batchId: context.batchId,
                attemptNumber,
                answers,
                score: grading.score,
                totalMarks: grading.totalMarks,
                percentage: grading.percentage,
                passed,
                timeSpentSeconds: eligibility.elapsedSeconds,
                submittedAt: firestore_1.FieldValue.serverTimestamp(),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
            transaction.set(counterReference, { quizId, studentId, count: attemptNumber, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
            transaction.set(summaryReference, (0, grading_core_js_1.mergeQuizSummary)(previousSummary, outcome, context.kind, quizId, studentId), { merge: true });
            return { outcome, attemptNumber };
        });
    }
    catch (error) {
        // Expected assessment errors carry a safe, specific message for the student.
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error('Quiz attempt transaction failed', { quizId, studentId, error });
        throw new https_1.HttpsError('internal', 'Your answers could not be saved. Please try again.');
    }
    return {
        id: committed.outcome.attemptId,
        kind: context.kind,
        score: grading.score,
        totalMarks: grading.totalMarks,
        percentage: grading.percentage,
        passed: committed.outcome.passed,
        attemptNumber: committed.outcome.attemptNumber,
        attemptCount: committed.outcome.attemptNumber,
        remainingAttempts: (0, grading_core_js_1.remainingAttempts)(context.maxRetakes, committed.outcome.attemptNumber),
        timeSpentSeconds: committed.outcome.timeSpentSeconds,
        ...(context.kind === 'chapter_quiz'
            ? { review: buildReview(context.questionIds, context.answerKeys, answers, grading.gradedQuestions) }
            : {}),
    };
});
exports.getMyQuizResults = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before viewing your results.');
    const studentId = request.auth.uid;
    const quizId = request.data?.quizId;
    if (typeof quizId !== 'string' || !quizId)
        throw new https_1.HttpsError('invalid-argument', 'A quiz ID is required.');
    const context = await loadAssessmentContext(quizId);
    await assertBatchEnrollment(studentId, context.courseId, context.batchId);
    const summarySnapshot = await context.db.doc(`quizSummaries/${quizId}_${studentId}`).get();
    const summary = summarySnapshot.exists ? summarySnapshot.data() : undefined;
    let review;
    if (context.kind === 'chapter_quiz' && summary?.latestAttemptId) {
        const latestAttempt = await context.db.doc(`quizAttempts/${summary.latestAttemptId}`).get();
        if (latestAttempt.exists) {
            const storedAnswers = Array.isArray(latestAttempt.data()?.answers) ? latestAttempt.data().answers : [];
            const latestGrading = (0, scoring_js_1.calculateTrustedQuizScore)(context.questions, storedAnswers);
            review = buildReview(context.questionIds, context.answerKeys, storedAnswers, latestGrading.gradedQuestions);
        }
    }
    return {
        quizId,
        kind: context.kind,
        title: context.title,
        chapter: context.chapter,
        passingPercent: context.passingPercent ?? 50,
        attemptCount: summary?.attemptCount ?? 0,
        remainingAttempts: (0, grading_core_js_1.remainingAttempts)(context.maxRetakes, summary?.attemptCount ?? 0),
        bestPercentage: summary?.bestPercentage ?? 0,
        passed: summary?.passed ?? false,
        latest: summary ? {
            score: summary.latestScore,
            totalMarks: summary.latestTotalMarks,
            percentage: summary.latestPercentage,
            passed: summary.latestPassed,
            timeSpentSeconds: summary.latestTimeSpentSeconds,
            submittedAtMillis: summary.latestSubmittedAtMillis,
        } : null,
        ...(review ? { review } : {}),
    };
});
exports.getMyBatchQuizzes = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before viewing quizzes.');
    const courseId = typeof request.data?.courseId === 'string' ? request.data.courseId.trim() : '';
    const batchId = typeof request.data?.batchId === 'string' ? request.data.batchId.trim() : '';
    if (!courseId || !batchId)
        throw new https_1.HttpsError('invalid-argument', 'A course and batch are required.');
    await assertBatchEnrollment(request.auth.uid, courseId, batchId);
    const snapshot = await (0, firestore_1.getFirestore)()
        .collection('quizzes')
        .where('courseId', '==', courseId)
        .where('batchId', '==', batchId)
        .where('isPublished', '==', true)
        .get();
    return {
        quizzes: snapshot.docs.map(document => {
            const data = document.data();
            return {
                id: document.id,
                title: String(data.title ?? 'Quiz'),
                description: String(data.description ?? ''),
                durationMinutes: Number(data.durationMinutes ?? 0),
                totalMarks: Number(data.totalMarks ?? 0),
                kind: data.kind === 'final_exam' ? 'final_exam' : 'chapter_quiz',
                chapter: String(data.chapter ?? ''),
                passingPercent: Number(data.passingPercent ?? 50),
                maxRetakes: Number(data.maxRetakes ?? -1),
                opensAt: callableDateString(data.opensAt),
                closesAt: callableDateString(data.closesAt),
            };
        }),
    };
});
exports.adminListStudentResults = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before viewing results.');
    await assertAdmin(request.auth.uid);
    const studentId = request.data?.studentId;
    if (typeof studentId !== 'string' || !studentId)
        throw new https_1.HttpsError('invalid-argument', 'A student ID is required.');
    const summarySnapshot = await (0, firestore_1.getFirestore)().collection('quizSummaries').where('studentId', '==', studentId).get();
    const results = await Promise.all(summarySnapshot.docs.map(async (summaryDocument) => {
        const summary = summaryDocument.data();
        const quiz = summary.quizId ? await (0, firestore_1.getFirestore)().collection('quizzes').doc(summary.quizId).get() : null;
        return {
            quizId: summary.quizId,
            quizTitle: String(quiz?.data()?.title ?? 'Assessment'),
            chapter: String(quiz?.data()?.chapter ?? ''),
            kind: summary.kind,
            attemptCount: summary.attemptCount,
            bestScore: summary.bestScore,
            bestTotalMarks: summary.bestTotalMarks,
            bestPercentage: summary.bestPercentage,
            latestPercentage: summary.latestPercentage,
            latestPassed: summary.latestPassed,
            passed: summary.passed,
            submittedAtMillis: summary.latestSubmittedAtMillis,
            timeSpentSeconds: summary.latestTimeSpentSeconds,
        };
    }));
    return { results };
});
exports.adminCreateStudentAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Sign in before creating a student account.');
    await assertAdmin(request.auth.uid);
    const name = String(request.data?.name ?? '').trim();
    const email = String(request.data?.email ?? '').trim().toLowerCase();
    const photoUrl = typeof request.data?.photoUrl === 'string' ? request.data.photoUrl.trim() : '';
    const isActive = request.data?.isActive !== false;
    if (!name || !email.includes('@')) {
        throw new https_1.HttpsError('invalid-argument', 'A student name and email address are required.');
    }
    const auth = (0, auth_1.getAuth)();
    try {
        const user = await auth.createUser({ email, password: (0, node_crypto_1.randomBytes)(18).toString('base64url'), displayName: name });
        const studentId = await createNumberedStudentProfile(user.uid, { name, email, isActive, photoUrl });
        const resetLink = await auth.generatePasswordResetLink(email);
        return { uid: user.uid, studentId, resetLink };
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
async function createNumberedStudentProfile(userId, input) {
    const db = (0, firestore_1.getFirestore)();
    return db.runTransaction(async (transaction) => {
        const counterRef = db.collection('system').doc('studentCounter');
        const counter = await transaction.get(counterRef);
        // On first use, continue from any existing numeric IDs instead of reusing one.
        let lastIssued = Number(counter.data()?.lastIssued ?? 0);
        if (!counter.exists) {
            const existingStudents = await transaction.get(db.collection('users').where('role', '==', 'student'));
            lastIssued = existingStudents.docs.reduce((highest, student) => {
                const value = Number(student.data().studentId);
                return Number.isSafeInteger(value) && value >= 0 ? Math.max(highest, value) : highest;
            }, 0);
        }
        const nextNumber = Number.isSafeInteger(lastIssued) && lastIssued >= 0 ? lastIssued + 1 : 1;
        const studentId = String(nextNumber);
        transaction.set(counterRef, { lastIssued: nextNumber, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(db.collection('users').doc(userId), {
            name: input.name,
            email: input.email,
            role: 'student',
            studentId,
            isActive: input.isActive !== false,
            ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return studentId;
    });
}
exports.registerStudentAccount = (0, https_1.onCall)(async (request) => {
    const name = String(request.data?.name ?? '').trim();
    const email = String(request.data?.email ?? '').trim().toLowerCase();
    const password = String(request.data?.password ?? '');
    if (!name || !email.includes('@') || password.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'A name, valid email address, and password of at least 6 characters are required.');
    }
    const auth = (0, auth_1.getAuth)();
    try {
        const user = await auth.createUser({ email, password, displayName: name });
        const studentId = await createNumberedStudentProfile(user.uid, { name, email });
        return { uid: user.uid, studentId };
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
