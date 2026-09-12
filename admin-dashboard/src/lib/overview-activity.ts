import { collection, getDocs } from "firebase/firestore";

import { getFirebaseClient } from "./firebase";
import type { OverviewQuizSummary } from "./overview-dashboard";

export async function loadOverviewQuizSummaries(): Promise<OverviewQuizSummary[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(collection(db, "quizSummaries"));

  return snapshot.docs.map(document => {
    const data = document.data();
    return {
      studentId: String(data.studentId ?? ""),
      bestScore: numberValue(data.bestScore),
      bestTotalMarks: numberValue(data.bestTotalMarks),
      bestPercentage: numberValue(data.bestPercentage),
      attemptCount: numberValue(data.attemptCount),
      latestSubmittedAtMillis: nullableNumber(data.latestSubmittedAtMillis),
    };
  });
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : null;
  }
  return null;
}
