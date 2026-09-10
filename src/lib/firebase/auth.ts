import { signInAnonymously, onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./config";

/**
 * Firebase Auth helpers: anonymous auth for MVP, with a path to
 * linking an email/Google provider later without changing the data
 * model — `uid` stays the same across the link (Architecture
 * Proposal section 1.4). Development Phase #26.
 */

let currentUserPromise: Promise<User | null> | null = null;

/**
 * Ensures an anonymous user session exists, returning the User once
 * signed in. Memoized — safe to call from multiple places without
 * triggering duplicate sign-in attempts. Returns null if Firebase
 * isn't configured (offline-only mode).
 */
export function ensureAnonymousAuth(): Promise<User | null> {
  if (!isFirebaseConfigured()) {
    return Promise.resolve(null);
  }
  if (!currentUserPromise) {
    const auth = getFirebaseAuth();
    currentUserPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          try {
            const credential = await signInAnonymously(auth);
            resolve(credential.user);
          } catch (err) {
            console.error("Anonymous sign-in failed:", err);
            resolve(null);
          }
        }
      });
    });
  }
  return currentUserPromise;
}

/**
 * Returns the current uid, or null if not signed in / not
 * configured. SyncEngine and FirestoreTaskRepository partition all
 * reads/writes under users/{uid}/... using this value.
 */
export async function getCurrentUid(): Promise<string | null> {
  const user = await ensureAnonymousAuth();
  return user?.uid ?? null;
}
