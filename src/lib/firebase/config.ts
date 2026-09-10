import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase app initialization (Development Phase #26).
 *
 * Env-based configuration — never hardcoded credentials in source
 * (Master Instruction section 19: "Secrets never shipped to
 * client"). All NEXT_PUBLIC_FIREBASE_* values are safe to expose to
 * the browser bundle by design — Firebase's client config is not a
 * secret; access control is enforced by firestore.rules, not by
 * hiding this config. See firestore.rules and .env.example.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

/**
 * True once every required NEXT_PUBLIC_FIREBASE_* env var is set.
 * SyncEngine checks this before attempting any Firestore operation
 * — if false, the app runs in Architecture A-equivalent mode
 * (IndexedDB only, no sync) rather than throwing.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars — see .env.example."
    );
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestoreDB(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }
  return firestoreInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}
