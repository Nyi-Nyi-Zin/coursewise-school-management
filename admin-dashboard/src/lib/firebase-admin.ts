import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "student-management-syste-e8dbb";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Server Firebase credentials are not configured.");
  let serviceAccount: { project_id?: string; private_key?: string; client_email?: string };
  try { serviceAccount = JSON.parse(raw); } catch { throw new Error("Server Firebase credentials are invalid."); }
  if (serviceAccount.project_id !== PROJECT_ID || !serviceAccount.private_key || !serviceAccount.client_email) throw new Error("Server Firebase credentials are invalid.");
  return { projectId: serviceAccount.project_id, privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"), clientEmail: serviceAccount.client_email };
}

export function getFirebaseAdmin() {
  const app = getApps()[0] ?? initializeApp({ credential: cert(getServiceAccount()) });
  return { auth: getAuth(app), db: getFirestore(app) };
}
