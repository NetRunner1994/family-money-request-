import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, firebaseEnabled } from "../firebaseConfig";

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

function ensureApp() {
  if (!firebaseEnabled) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
  }
  return app;
}

export function getDb(): Firestore | null {
  ensureApp();
  return dbInstance;
}

let signInPromise: Promise<void> | null = null;

/** Sign in anonymously once; safe to call repeatedly. */
export function ensureSignedIn(): Promise<void> {
  if (!firebaseEnabled) return Promise.resolve();
  ensureApp();
  if (!authInstance) return Promise.resolve();
  if (authInstance.currentUser) return Promise.resolve();
  if (!signInPromise) {
    signInPromise = signInAnonymously(authInstance)
      .then(() => undefined)
      .catch((err) => {
        signInPromise = null;
        throw err;
      });
  }
  return signInPromise;
}

export { firebaseEnabled };
