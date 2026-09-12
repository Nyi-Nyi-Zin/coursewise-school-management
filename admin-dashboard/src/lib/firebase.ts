import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { firebaseConfig, hasFirebaseConfiguration } from "./firebase-config";

export { hasFirebaseConfiguration } from "./firebase-config";

let app: FirebaseApp | undefined;

export function getFirebaseClient() {
  if (!hasFirebaseConfiguration) {
    throw new Error("Firebase is not configured. Add the required NEXT_PUBLIC_FIREBASE_* variables.");
  }
  app ??= getApps().at(0) ?? initializeApp(firebaseConfig);
  return { app, auth: getAuth(app) as Auth, db: getFirestore(app) as Firestore };
}
