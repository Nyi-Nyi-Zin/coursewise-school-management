import { collection, getDocs } from "firebase/firestore";
import { getFirebaseClient } from "./firebase";

export type AnalyticsSnapshot = {
  students: number;
  courses: number;
  batches: number;
  grades: number;
  attendance: number;
  certificates: number;
  notifications: number;
  submissions: number;
  quizAttempts: number;
};

const collections = ["users", "courses", "batches", "gradeRecords", "attendance", "certificates", "notifications", "assignmentSubmissions", "quizAttempts"] as const;

export async function loadAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const { db } = getFirebaseClient();
  const snapshots = await Promise.all(collections.map(name => getDocs(collection(db, name))));
  const count = (name: (typeof collections)[number]) => snapshots[collections.indexOf(name)].size;
  return { students: count("users"), courses: count("courses"), batches: count("batches"), grades: count("gradeRecords"), attendance: count("attendance"), certificates: count("certificates"), notifications: count("notifications"), submissions: count("assignmentSubmissions"), quizAttempts: count("quizAttempts") };
}
