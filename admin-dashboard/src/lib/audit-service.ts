import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";

import { getFirebaseClient } from "./firebase";

export type AdminAuditEvent = {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  source: "admin-web";
  createdAt?: string;
};

export type AuditEventDraft = Pick<AdminAuditEvent, "action" | "targetType" | "targetId" | "summary">;

export async function recordAdminAuditEvent(draft: AuditEventDraft) {
  const { auth, db } = getFirebaseClient();
  const actorId = auth.currentUser?.uid;
  if (!actorId) throw new Error("Sign in as an administrator before recording activity.");

  await addDoc(collection(db, "adminAuditEvents"), {
    actorId,
    action: draft.action.trim().slice(0, 80),
    targetType: draft.targetType.trim().slice(0, 80),
    targetId: draft.targetId.trim().slice(0, 160),
    summary: draft.summary.trim().slice(0, 240),
    source: "admin-web",
    createdAt: serverTimestamp(),
  });
}

export async function loadAdminAuditEvents(): Promise<AdminAuditEvent[]> {
  const { db } = getFirebaseClient();
  const snapshot = await getDocs(query(collection(db, "adminAuditEvents"), orderBy("createdAt", "desc"), limit(100)));
  return snapshot.docs.map(item => {
    const data = item.data() as Record<string, unknown>;
    const createdAt = data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt && typeof data.createdAt.toDate === "function"
      ? data.createdAt.toDate().toISOString()
      : undefined;
    return {
      id: item.id,
      actorId: String(data.actorId ?? ""),
      action: String(data.action ?? "Activity"),
      targetType: String(data.targetType ?? "Record"),
      targetId: String(data.targetId ?? ""),
      summary: String(data.summary ?? ""),
      source: "admin-web",
      createdAt,
    };
  });
}
