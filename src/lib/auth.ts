import {
  GoogleAuthProvider,
  OAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getAuthObj } from "./firebase";

export type { User };

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

// Popups are the most reliable on desktop; some mobile browsers block them, so
// fall back to a full-page redirect.
async function signInWith(provider: GoogleAuthProvider | OAuthProvider) {
  const auth = getAuthObj();
  if (!auth) throw new Error("auth unavailable");
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    if (
      code.includes("popup-blocked") ||
      code.includes("popup-closed-by-user") ||
      code.includes("cancelled-popup-request") ||
      code.includes("operation-not-supported")
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export const signInWithGoogle = () => signInWith(googleProvider);
export const signInWithApple = () => signInWith(appleProvider);

export function signOutUser() {
  const auth = getAuthObj();
  if (auth) return fbSignOut(auth);
  return Promise.resolve();
}

/** Complete any pending redirect sign-in (no-op if none). */
export function completeRedirectSignIn() {
  const auth = getAuthObj();
  if (!auth) return Promise.resolve(null);
  return getRedirectResult(auth).catch((e) => {
    console.error("redirect sign-in failed", e);
    return null;
  });
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  const auth = getAuthObj();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}
