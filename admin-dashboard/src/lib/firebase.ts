import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Functions, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const hasFirebaseConfiguration = process.env.NEXT_PUBLIC_ENABLE_FIREBASE === "true" && Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

let app: FirebaseApp | undefined;

export function getFirebaseClient() {
  if (!hasFirebaseConfiguration) {
    throw new Error("Firebase is not configured. Add the required NEXT_PUBLIC_FIREBASE_* variables.");
  }
  app ??= getApps().at(0) ?? initializeApp(firebaseConfig);
  return { app, auth: getAuth(app) as Auth, db: getFirestore(app) as Firestore, functions: getFunctions(app) as Functions };
}
