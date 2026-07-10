import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "./firebase";

// Remembers which family a signed-in account belongs to, so signing in on any
// device (or after clearing data) restores their family automatically.

export async function getUserFamily(uid: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? ((snap.data().familyCode as string) ?? null) : null;
  } catch (e) {
    console.error("getUserFamily failed", e);
    return null;
  }
}

export async function setUserFamily(uid: string, code: string) {
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, "users", uid), { familyCode: code }, { merge: true });
  } catch (e) {
    console.error("setUserFamily failed", e);
  }
}

/** Forget the family remembered on this account — called when leaving, so a
 *  later sign-in doesn't automatically rejoin the family just left. */
export async function clearUserFamily(uid: string) {
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, "users", uid), { familyCode: null }, { merge: true });
  } catch (e) {
    console.error("clearUserFamily failed", e);
  }
}
