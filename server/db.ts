import { and, asc, desc, eq, gt, isNull, like, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  announcements,
  attendance,
  InsertUser,
  lessons,
  quizAttempts,
  quizQuestions,
  quizzes,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await requireDb();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listStudents(search?: string) {
  const db = await requireDb();
  const query = search?.trim();
  const where = query
    ? and(
        eq(users.role, "student"),
        or(
          like(users.name, `%${query}%`),
          like(users.email, `%${query}%`),
          like(users.studentId, `%${query}%`),
        ),
      )
    : eq(users.role, "student");
  return db.select().from(users).where(where).orderBy(asc(users.name));
}

export async function listAnnouncements(publishedOnly = false) {
  const db = await requireDb();
  const query = db.select().from(announcements);
  return publishedOnly
    ? query.where(eq(announcements.isPublished, true)).orderBy(asc(announcements.sortOrder), desc(announcements.createdAt))
    : query.orderBy(asc(announcements.sortOrder), desc(announcements.createdAt));
}

export async function listLessons(publishedOnly = false) {
  const db = await requireDb();
  const query = db.select().from(lessons);
  return publishedOnly
    ? query.where(eq(lessons.isPublished, true)).orderBy(asc(lessons.sortOrder), desc(lessons.createdAt))
    : query.orderBy(asc(lessons.sortOrder), desc(lessons.createdAt));
}

export async function listQuizzes(publishedOnly = false) {
  const db = await requireDb();
  const query = db.select().from(quizzes);
  return publishedOnly
    ? query.where(and(eq(quizzes.isPublished, true), or(isNull(quizzes.opensAt), lte(quizzes.opensAt, new Date())), or(isNull(quizzes.closesAt), gt(quizzes.closesAt, new Date())))).orderBy(desc(quizzes.createdAt))
    : query.orderBy(desc(quizzes.createdAt));
}

export async function getQuizQuestions(quizId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.sortOrder));
}

export async function getStudentAttendance(studentUserId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(attendance)
    .where(eq(attendance.studentUserId, studentUserId))
    .orderBy(desc(attendance.date));
}

export async function getStudentAttempts(studentUserId: number) {
  const db = await requireDb();
  return db
    .select({ attempt: quizAttempts, quiz: quizzes })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .where(eq(quizAttempts.studentUserId, studentUserId))
    .orderBy(desc(quizAttempts.submittedAt));
}
