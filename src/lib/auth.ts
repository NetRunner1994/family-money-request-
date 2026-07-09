import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getAuthObj } from "./firebase";

export type { User };

export function signOutUser() {
  const auth = getAuthObj();
  if (auth) return fbSignOut(auth);
  return Promise.resolve();
}

// Email/password never leaves the page or opens a popup — no other domain
// is ever visible, unlike federated (Google/Apple) sign-in.
export function signUpWithEmail(email: string, password: string) {
  const auth = getAuthObj();
  if (!auth) throw new Error("auth unavailable");
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInWithEmail(email: string, password: string) {
  const auth = getAuthObj();
  if (!auth) throw new Error("auth unavailable");
  return signInWithEmailAndPassword(auth, email, password);
}

export function resetPassword(email: string) {
  const auth = getAuthObj();
  if (!auth) throw new Error("auth unavailable");
  return sendPasswordResetEmail(auth, email);
}

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("email-already-in-use")) return "That email already has an account — try signing in instead.";
  if (code.includes("weak-password")) return "Password needs to be at least 6 characters.";
  if (code.includes("invalid-email")) return "That doesn't look like a valid email.";
  if (code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "Email or password didn't match. Try again, or reset your password.";
  }
  if (code.includes("too-many-requests")) return "Too many tries — wait a bit and try again.";
  return "Something went wrong. Try again.";
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  const auth = getAuthObj();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}
