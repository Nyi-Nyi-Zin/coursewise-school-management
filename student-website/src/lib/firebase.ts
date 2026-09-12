import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config";

// Prevent an incomplete or inherited environment from leaving client queries waiting on an unavailable Firebase project.
// Set NEXT_PUBLIC_ENABLE_FIREBASE=true only after the complete production web configuration is provided.
export { isFirebaseConfigured } from "./firebase-config";
export const firebaseApp = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;
