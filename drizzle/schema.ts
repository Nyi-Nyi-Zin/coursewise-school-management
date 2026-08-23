import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Identity records created through Manus OAuth. The project owner is promoted
 * to admin by the auth bootstrap; all other users begin as students.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["student", "admin"]).default("student").notNull(),
  studentId: varchar("studentId", { length: 64 }).unique(),
  profilePhotoUrl: text("profilePhotoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const announcements = mysqlTable(
  "announcements",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    bannerUrl: text("bannerUrl"),
    linkUrl: text("linkUrl"),
    isPublished: boolean("isPublished").default(false).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("announcements_published_sort_idx").on(table.isPublished, table.sortOrder)],
);

export const lessons = mysqlTable(
  "lessons",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnailUrl"),
    telegramUrl: text("telegramUrl"),
    videoUrl: text("videoUrl"),
    pdfUrl: text("pdfUrl"),
    isPublished: boolean("isPublished").default(false).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("lessons_published_sort_idx").on(table.isPublished, table.sortOrder)],
);

export const quizzes = mysqlTable(
  "quizzes",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    durationMinutes: int("durationMinutes"),
    totalMarks: int("totalMarks").default(0).notNull(),
    isPublished: boolean("isPublished").default(false).notNull(),
    opensAt: timestamp("opensAt"),
    closesAt: timestamp("closesAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("quizzes_published_idx").on(table.isPublished)],
);

export const quizQuestions = mysqlTable(
  "quizQuestions",
  {
    id: int("id").autoincrement().primaryKey(),
    quizId: int("quizId")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    optionsJson: text("optionsJson").notNull(),
    correctAnswerIndex: int("correctAnswerIndex").notNull(),
    marks: int("marks").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
  },
  table => [index("questions_quiz_sort_idx").on(table.quizId, table.sortOrder)],
);

export const quizAttempts = mysqlTable(
  "quizAttempts",
  {
    id: int("id").autoincrement().primaryKey(),
    quizId: int("quizId")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    studentUserId: int("studentUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answersJson: text("answersJson").notNull(),
    score: int("score").notNull(),
    totalMarks: int("totalMarks").notNull(),
    percentage: int("percentage").notNull(),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  },
  table => [
    index("attempts_student_idx").on(table.studentUserId, table.submittedAt),
    index("attempts_quiz_idx").on(table.quizId, table.submittedAt),
  ],
);

export const attendance = mysqlTable(
  "attendance",
  {
    id: int("id").autoincrement().primaryKey(),
    studentUserId: int("studentUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    status: mysqlEnum("status", ["Present", "Absent", "Late", "Excused"]).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("attendance_student_date_unique").on(table.studentUserId, table.date),
    index("attendance_student_date_idx").on(table.studentUserId, table.date),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
