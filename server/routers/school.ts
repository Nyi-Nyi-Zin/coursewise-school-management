import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  announcements,
  attendance,
  lessons,
  quizAttempts,
  quizQuestions,
  quizzes,
  users,
} from "../../drizzle/schema";
import {
  getQuizQuestions,
  getStudentAttendance,
  getStudentAttempts,
  listAnnouncements,
  listLessons,
  listQuizzes,
  listStudents,
  requireDb,
} from "../db";
import { storagePut } from "../storage";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const nullableUrl = z
  .string()
  .max(2_000)
  .refine(value => value.startsWith("/manus-storage/") || z.string().url().safeParse(value).success, "Enter a valid URL or storage path.")
  .optional()
  .nullable();
const attendanceStatus = z.enum(["Present", "Absent", "Late", "Excused"]);

const studentProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "student" || !ctx.user.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This student account is not active." });
  }
  return next({ ctx });
});

function parseOptions(optionsJson: string) {
  try {
    const options = JSON.parse(optionsJson);
    return Array.isArray(options) ? options.map(String) : [];
  } catch {
    return [];
  }
}

function toQuestionView(question: typeof quizQuestions.$inferSelect, includeAnswer = false) {
  return {
    id: question.id,
    quizId: question.quizId,
    question: question.question,
    options: parseOptions(question.optionsJson),
    ...(includeAnswer ? { correctAnswerIndex: question.correctAnswerIndex } : {}),
    marks: question.marks,
    sortOrder: question.sortOrder,
  };
}

export function attendanceSummary(rows: Array<typeof attendance.$inferSelect>) {
  const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
  rows.forEach(row => counts[row.status]++);
  const recorded = rows.length;
  const attendanceRate = recorded === 0 ? 0 : Math.round(((counts.Present + counts.Late) / recorded) * 100);
  return { ...counts, recorded, attendanceRate };
}

export function calculateQuizOutcome(
  questions: Array<Pick<typeof quizQuestions.$inferSelect, "id" | "marks" | "correctAnswerIndex">>,
  answers: Array<{ questionId: number; selectedAnswerIndex: number }>,
) {
  const answerByQuestion = new Map(answers.map(answer => [answer.questionId, answer.selectedAnswerIndex]));
  const score = questions.reduce(
    (total, question) => total + (answerByQuestion.get(question.id) === question.correctAnswerIndex ? question.marks : 0),
    0,
  );
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const percentage = totalMarks === 0 ? 0 : Math.round((score / totalMarks) * 100);
  return { score, totalMarks, percentage };
}

async function syncQuizTotalMarks(quizId: number) {
  const db = await requireDb();
  const questions = await getQuizQuestions(quizId);
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  await db.update(quizzes).set({ totalMarks }).where(eq(quizzes.id, quizId));
  return totalMarks;
}

export const schoolRouter = router({
  upload: adminProcedure
    .input(
      z.object({
        folder: z.enum(["profiles", "announcements", "lessons", "pdfs"]),
        fileName: z.string().min(1).max(160),
        contentType: z.string().min(3).max(100),
        base64: z.string().min(4).max(9_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isImage = input.contentType.startsWith("image/");
      const isPdf = input.contentType === "application/pdf";
      const needsPdf = input.folder === "pdfs";
      if ((!needsPdf && !isImage) || (needsPdf && !isPdf)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please select a supported image or PDF file." });
      }
      const extension = input.fileName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "file";
      const buffer = Buffer.from(input.base64, "base64");
      const { key, url } = await storagePut(
        `school-management/${input.folder}/${ctx.user.id}-${Date.now()}.${extension}`,
        buffer,
        input.contentType,
      );
      return { key, url };
    }),

  admin: router({
    dashboard: adminProcedure.query(async () => {
      const db = await requireDb();
      const [studentRows, announcementRows, lessonRows, quizRows, attemptRows] = await Promise.all([
        db.select().from(users).where(eq(users.role, "student")),
        db.select().from(announcements),
        db.select().from(lessons),
        db.select().from(quizzes),
        db.select().from(quizAttempts),
      ]);
      return {
        studentCount: studentRows.length,
        activeStudentCount: studentRows.filter(student => student.isActive).length,
        publishedAnnouncements: announcementRows.filter(item => item.isPublished).length,
        publishedLessons: lessonRows.filter(item => item.isPublished).length,
        publishedQuizzes: quizRows.filter(item => item.isPublished).length,
        attemptCount: attemptRows.length,
      };
    }),

    students: router({
      list: adminProcedure.input(z.object({ search: z.string().max(100).optional() })).query(({ input }) => listStudents(input.search)),
      create: adminProcedure
        .input(
          z.object({
            openId: z.string().min(3).max(64),
            name: z.string().min(2).max(180),
            email: z.string().email().max(320),
            studentId: z.string().min(2).max(64),
            profilePhotoUrl: nullableUrl,
            isActive: z.boolean().default(true),
          }),
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          await db.insert(users).values({ ...input, role: "student", loginMethod: "manus" });
          return { success: true };
        }),
      update: adminProcedure
        .input(
          z.object({
            id: z.number().int().positive(),
            name: z.string().min(2).max(180),
            email: z.string().email().max(320),
            studentId: z.string().min(2).max(64),
            profilePhotoUrl: nullableUrl,
            isActive: z.boolean(),
          }),
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...values } = input;
          await db.update(users).set(values).where(and(eq(users.id, id), eq(users.role, "student")));
          return { success: true };
        }),
    }),

    announcements: router({
      list: adminProcedure.query(() => listAnnouncements()),
      create: adminProcedure
        .input(z.object({ title: z.string().min(2).max(180), description: z.string().max(2_500).optional().nullable(), bannerUrl: nullableUrl, linkUrl: nullableUrl, isPublished: z.boolean(), sortOrder: z.number().int().min(0) }))
        .mutation(async ({ input }) => {
          const db = await requireDb();
          await db.insert(announcements).values(input);
          return { success: true };
        }),
      update: adminProcedure
        .input(z.object({ id: z.number().int().positive(), title: z.string().min(2).max(180), description: z.string().max(2_500).optional().nullable(), bannerUrl: nullableUrl, linkUrl: nullableUrl, isPublished: z.boolean(), sortOrder: z.number().int().min(0) }))
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...values } = input;
          await db.update(announcements).set(values).where(eq(announcements.id, id));
          return { success: true };
        }),
      remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await requireDb();
        await db.delete(announcements).where(eq(announcements.id, input.id));
        return { success: true };
      }),
    }),

    lessons: router({
      list: adminProcedure.query(() => listLessons()),
      create: adminProcedure
        .input(z.object({ title: z.string().min(2).max(180), description: z.string().max(2_500).optional().nullable(), thumbnailUrl: nullableUrl, telegramUrl: nullableUrl, videoUrl: nullableUrl, pdfUrl: nullableUrl, isPublished: z.boolean(), sortOrder: z.number().int().min(0) }))
        .mutation(async ({ input }) => {
          const db = await requireDb();
          await db.insert(lessons).values(input);
          return { success: true };
        }),
      update: adminProcedure
        .input(z.object({ id: z.number().int().positive(), title: z.string().min(2).max(180), description: z.string().max(2_500).optional().nullable(), thumbnailUrl: nullableUrl, telegramUrl: nullableUrl, videoUrl: nullableUrl, pdfUrl: nullableUrl, isPublished: z.boolean(), sortOrder: z.number().int().min(0) }))
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...values } = input;
          await db.update(lessons).set(values).where(eq(lessons.id, id));
          return { success: true };
        }),
      remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await requireDb();
        await db.delete(lessons).where(eq(lessons.id, input.id));
        return { success: true };
      }),
    }),

    quizzes: router({
      list: adminProcedure.query(() => listQuizzes()),
      details: adminProcedure.input(z.object({ quizId: z.number().int().positive() })).query(async ({ input }) => {
        const db = await requireDb();
        const quiz = (await db.select().from(quizzes).where(eq(quizzes.id, input.quizId)).limit(1))[0];
        if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found." });
        return { quiz, questions: (await getQuizQuestions(quiz.id)).map(question => toQuestionView(question, true)) };
      }),
      create: adminProcedure
        .input(z.object({ title: z.string().min(2).max(180), description: z.string().max(2_500).optional().nullable(), durationMinutes: z.number().int().min(1).max(480).optional().nullable(), isPublished: z.boolean() }))
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const result = await db.insert(quizzes).values(input);
          return { id: Number(result[0].insertId) };
        }),
      update: adminProcedure
        .input(z.object({ id: z.number().int().positive(), title: z.string().min(2).max(180), description: z.string().max(2_500).optional().nullable(), durationMinutes: z.number().int().min(1).max(480).optional().nullable(), isPublished: z.boolean() }))
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...values } = input;
          await db.update(quizzes).set(values).where(eq(quizzes.id, id));
          return { success: true };
        }),
      remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        const db = await requireDb();
        await db.delete(quizzes).where(eq(quizzes.id, input.id));
        return { success: true };
      }),
      questions: router({
        create: adminProcedure
          .input(z.object({ quizId: z.number().int().positive(), question: z.string().min(3).max(3_000), options: z.array(z.string().min(1).max(500)).min(2).max(6), correctAnswerIndex: z.number().int().min(0), marks: z.number().int().min(1).max(100), sortOrder: z.number().int().min(0) }))
          .mutation(async ({ input }) => {
            if (input.correctAnswerIndex >= input.options.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a valid correct answer." });
            const db = await requireDb();
            await db.insert(quizQuestions).values({ ...input, optionsJson: JSON.stringify(input.options) });
            await syncQuizTotalMarks(input.quizId);
            return { success: true };
          }),
        update: adminProcedure
          .input(z.object({ id: z.number().int().positive(), quizId: z.number().int().positive(), question: z.string().min(3).max(3_000), options: z.array(z.string().min(1).max(500)).min(2).max(6), correctAnswerIndex: z.number().int().min(0), marks: z.number().int().min(1).max(100), sortOrder: z.number().int().min(0) }))
          .mutation(async ({ input }) => {
            if (input.correctAnswerIndex >= input.options.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a valid correct answer." });
            const db = await requireDb();
            const { id, quizId, options, ...values } = input;
            await db.update(quizQuestions).set({ ...values, optionsJson: JSON.stringify(options) }).where(and(eq(quizQuestions.id, id), eq(quizQuestions.quizId, quizId)));
            await syncQuizTotalMarks(quizId);
            return { success: true };
          }),
        remove: adminProcedure.input(z.object({ id: z.number().int().positive(), quizId: z.number().int().positive() })).mutation(async ({ input }) => {
          const db = await requireDb();
          await db.delete(quizQuestions).where(and(eq(quizQuestions.id, input.id), eq(quizQuestions.quizId, input.quizId)));
          await syncQuizTotalMarks(input.quizId);
          return { success: true };
        }),
      }),
      results: adminProcedure
        .input(z.object({ quizId: z.number().int().positive().optional(), studentUserId: z.number().int().positive().optional() }).optional())
        .query(async ({ input }) => {
          const db = await requireDb();
          const filters = [];
          if (input?.quizId) filters.push(eq(quizAttempts.quizId, input.quizId));
          if (input?.studentUserId) filters.push(eq(quizAttempts.studentUserId, input.studentUserId));
          const where = filters.length ? and(...filters) : undefined;
          const query = db.select({ attempt: quizAttempts, quiz: quizzes, student: users }).from(quizAttempts).innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id)).innerJoin(users, eq(quizAttempts.studentUserId, users.id));
          return where ? query.where(where).orderBy(desc(quizAttempts.submittedAt)) : query.orderBy(desc(quizAttempts.submittedAt));
        }),
    }),

    attendance: router({
      list: adminProcedure.query(async () => {
        const db = await requireDb();
        return db.select({ record: attendance, student: users }).from(attendance).innerJoin(users, eq(attendance.studentUserId, users.id)).orderBy(desc(attendance.date));
      }),
      upsert: adminProcedure
        .input(z.object({ studentUserId: z.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), status: attendanceStatus, note: z.string().max(1_000).optional().nullable() }))
        .mutation(async ({ input }) => {
          const db = await requireDb();
          await db.insert(attendance).values(input).onDuplicateKeyUpdate({ set: { status: input.status, note: input.note, updatedAt: new Date() } });
          return { success: true };
        }),
    }),
  }),

  student: router({
    home: studentProcedure.query(async ({ ctx }) => {
      const [publishedAnnouncements, profileAttendance] = await Promise.all([listAnnouncements(true), getStudentAttendance(ctx.user.id)]);
      return { profile: ctx.user, announcements: publishedAnnouncements, attendance: attendanceSummary(profileAttendance) };
    }),
    lessons: studentProcedure.query(() => listLessons(true)),
    quizzes: router({
      list: studentProcedure.query(() => listQuizzes(true)),
      take: studentProcedure.input(z.object({ quizId: z.number().int().positive() })).query(async ({ input }) => {
        const db = await requireDb();
        const quiz = (await db.select().from(quizzes).where(and(eq(quizzes.id, input.quizId), eq(quizzes.isPublished, true))).limit(1))[0];
        if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "This quiz is not available." });
        return { quiz, questions: (await getQuizQuestions(quiz.id)).map(question => toQuestionView(question)) };
      }),
      submit: studentProcedure
        .input(z.object({ quizId: z.number().int().positive(), answers: z.array(z.object({ questionId: z.number().int().positive(), selectedAnswerIndex: z.number().int().min(0) })) }))
        .mutation(async ({ ctx, input }) => {
          const db = await requireDb();
          const quiz = (await db.select().from(quizzes).where(and(eq(quizzes.id, input.quizId), eq(quizzes.isPublished, true))).limit(1))[0];
          if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "This quiz is not available." });
          const questions = await getQuizQuestions(input.quizId);
          if (!questions.length) throw new TRPCError({ code: "BAD_REQUEST", message: "This quiz does not have questions yet." });
          const { score, totalMarks, percentage } = calculateQuizOutcome(questions, input.answers);
          const answerByQuestion = new Map(input.answers.map(answer => [answer.questionId, answer.selectedAnswerIndex]));
          const answers = questions.map(question => ({ questionId: question.id, selectedAnswerIndex: answerByQuestion.get(question.id) ?? null }));
          const result = await db.insert(quizAttempts).values({ quizId: input.quizId, studentUserId: ctx.user.id, answersJson: JSON.stringify(answers), score, totalMarks, percentage });
          return { id: Number(result[0].insertId), score, totalMarks, percentage };
        }),
      attempts: studentProcedure.query(async ({ ctx }) => getStudentAttempts(ctx.user.id)),
    }),
    attendance: studentProcedure.query(async ({ ctx }) => {
      const records = await getStudentAttendance(ctx.user.id);
      return { records, summary: attendanceSummary(records) };
    }),
    profile: studentProcedure.query(async ({ ctx }) => {
      const records = await getStudentAttendance(ctx.user.id);
      return { profile: ctx.user, attendance: attendanceSummary(records) };
    }),
  }),
});
