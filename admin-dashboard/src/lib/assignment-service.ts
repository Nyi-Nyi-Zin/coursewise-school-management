import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseClient } from "./firebase";

export type AssignmentRecord = {
  id: string;
  title: string;
  description: string;
  courseId: string;
  batchId: string;
  resourceUrl: string;
  submissionInstructions: string;
  dueAt: string;
  isPublished: boolean;
};

export type AssignmentSubmissionRecord = {
  id: string;
  assignmentId: string;
  studentId: string;
  courseId: string;
  batchId: string;
  submissionText: string;
  submissionUrl: string;
  feedback: string;
  score: number | null;
  submittedAt: string;
};

const toString = (value: unknown): string => (typeof value === "string" ? value : "") ?? "";
const toDateString = (value: unknown): string =>
  typeof value === "string"
    ? value
    : value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
      ? value.toDate().toISOString()
      : "";

const toAssignment = (item: { id: string; data: () => Record<string, unknown> }): AssignmentRecord => {
  const data = item.data();
  return {
    id: item.id,
    title: toString(data.title) || "Untitled assignment",
    description: toString(data.description),
    courseId: toString(data.courseId),
    batchId: toString(data.batchId),
    resourceUrl: toString(data.resourceUrl),
    submissionInstructions: toString(data.submissionInstructions),
    dueAt: toDateString(data.dueAt),
    isPublished: data.isPublished !== false,
  };
};

export async function loadAssignments(): Promise<AssignmentRecord[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "assignments"));
  return snapshot.docs.map(toAssignment).sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || ""));
}

export async function saveAssignment(assignment: AssignmentRecord) {
  const { db } = getFirebaseClient();
  await setDoc(
    doc(db, "assignments", assignment.id),
    {
      title: assignment.title,
      description: assignment.description,
      courseId: assignment.courseId,
      batchId: assignment.batchId,
      resourceUrl: assignment.resourceUrl,
      submissionInstructions: assignment.submissionInstructions,
      dueAt: assignment.dueAt || null,
      isPublished: assignment.isPublished,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteAssignment(assignmentId: string) {
  const { db } = getFirebaseClient();
  await deleteDoc(doc(db, "assignments", assignmentId));
}

export async function loadAssignmentSubmissions(): Promise<AssignmentSubmissionRecord[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "assignmentSubmissions"));
  return snapshot.docs
    .map((item) => {
      const data = item.data() ?? {};
      return {
        id: item.id,
        assignmentId: toString(data.assignmentId),
        studentId: toString(data.studentId),
        courseId: toString(data.courseId),
        batchId: toString(data.batchId),
        submissionText: toString(data.submissionText),
        submissionUrl: toString(data.submissionUrl),
        feedback: toString(data.feedback),
        score: typeof data.score === "number" ? data.score : null,
        submittedAt: toDateString(data.submittedAt),
      };
    })
    .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
}