#!/usr/bin/env node

const PROJECT_ID = "student-management-syste-e8dbb";
const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:\n  FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"${PROJECT_ID}",...}' pnpm --dir functions run bootstrap:first-admin -- admin@example.com --confirm\n\nThis trusted local utility promotes an existing Firebase Authentication account to role=admin. It never creates accounts, never weakens Firestore Rules, and requires the explicit --confirm flag.`);
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

const email = args.find(argument => !argument.startsWith("-"))?.trim().toLowerCase();
if (!email || !email.includes("@") || !args.includes("--confirm")) {
  usage();
  process.exitCode = 1;
} else {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required. Use a Firebase service-account JSON value only in this local command; never add it to Vercel or a browser variable.");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON.");
  }
  if (serviceAccount.project_id !== PROJECT_ID) {
    throw new Error(`Service account project_id must be ${PROJECT_ID}.`);
  }

  const [{ cert, getApps, initializeApp }, { getAuth }, { FieldValue, getFirestore }] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/auth"),
    import("firebase-admin/firestore"),
  ]);
  const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const user = await auth.getUserByEmail(email);
  const profileRef = db.collection("users").doc(user.uid);
  const profile = await profileRef.get();

  await profileRef.set({
    email: user.email ?? email,
    name: profile.data()?.name ?? user.displayName ?? "Administrator",
    role: "admin",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`Promoted ${user.email ?? email} (${user.uid}) to role=admin in ${PROJECT_ID}.`);
}
