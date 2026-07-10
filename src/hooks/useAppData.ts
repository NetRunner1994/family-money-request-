import { useCallback, useEffect, useRef, useState } from "react";
import {
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import type { User } from "../lib/auth";
import { ensureSignedIn, firebaseEnabled, getDb } from "../lib/firebase";
import { pruneOldRequests } from "../lib/retention";
import { clearUserFamily, getUserFamily, setUserFamily } from "../lib/userFamily";
import {
  loadData,
  loadFamilyCode,
  saveData,
  saveFamilyCode,
} from "../lib/storage";
import { emptyData, normalizeData, type AppData } from "../types";

export type SyncMode = "local" | "synced";

export interface UseAppData {
  data: AppData | null;
  update: (fn: (d: AppData) => AppData) => void;
  mode: SyncMode;
  familyCode: string | null;
  /** Firebase configured for this build? */
  syncAvailable: boolean;
  /** Waiting on the first cloud snapshot. */
  connecting: boolean;
  /** Set if connecting to the family failed — connecting will be false but
   *  data will still be null, so callers must check this separately to avoid
   *  showing an infinite "Connecting…" spinner on a real failure. */
  connectError: string | null;
  retryConnect: () => void;
  createFamily: (code: string, adminUid: string | null) => Promise<void>;
  joinFamily: (code: string) => void;
  leaveFamily: () => void;
}

function describeConnectError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("permission-denied")) {
    return "Access denied by the database rules. (permission-denied)";
  }
  if (code.includes("unavailable") || code.includes("network")) {
    return "Couldn't reach the server — check your internet connection. (unavailable)";
  }
  if (code) return `Connection failed (${code}).`;
  return "Connection failed. Please try again.";
}

const familyDoc = (code: string) => {
  const db = getDb();
  return db ? doc(db, "families", code) : null;
};

export function useAppData(user: User | null, authReady: boolean): UseAppData {
  const [familyCode, setFamilyCode] = useState<string | null>(() =>
    firebaseEnabled ? loadFamilyCode() : null
  );

  // In local mode we have data immediately; in synced mode we wait for the
  // first snapshot before rendering the app.
  const synced = firebaseEnabled && !!familyCode;
  const [data, setData] = useState<AppData | null>(() => {
    if (synced) return null;
    // Local mode: clear old settled history on load.
    const { data: pruned, changed } = pruneOldRequests(loadData());
    if (changed) saveData(pruned);
    return pruned;
  });
  const [connecting, setConnecting] = useState(synced);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const retryConnect = useCallback(() => setRetryToken((n) => n + 1), []);

  // Hold the latest seed data (local device data) so "create family" can carry
  // existing kids/requests into the new shared family instead of losing them.
  const seedRef = useRef<AppData>(loadData());
  // Ensures the once-per-family cleanup of old settled requests runs a single
  // time after connecting, not on every incoming snapshot.
  const prunedRef = useRef(false);
  useEffect(() => {
    prunedRef.current = false;
  }, [familyCode]);
  useEffect(() => {
    if (!synced && data) seedRef.current = data;
  }, [synced, data]);

  // Subscribe to the family document in synced mode. Waits for authReady so
  // it never fires before Firebase has finished restoring a saved sign-in —
  // otherwise this could kick off an anonymous session (for kid devices)
  // that wins the race and overwrites a real Google session on every reload.
  useEffect(() => {
    if (!firebaseEnabled || !familyCode || !authReady) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    setConnecting(true);
    setConnectError(null);

    (async () => {
      // Only fall back to an anonymous session if there's truly no signed-in
      // grown-up — a real sign-in already satisfies the Firestore rules.
      if (!user) {
        try {
          await ensureSignedIn();
        } catch (e) {
          console.error("anonymous sign-in failed", e);
          if (!cancelled) {
            setConnectError(describeConnectError(e));
            setConnecting(false);
          }
          return;
        }
      }
      if (cancelled) return;
      const ref = familyDoc(familyCode);
      if (!ref) return;
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            setData(normalizeData(snap.data() as Partial<AppData>));
          } else {
            // Family doc doesn't exist yet — create an empty one.
            void setDoc(ref, { ...emptyData }).catch((e) => {
              console.error("create family doc failed", e);
              setConnectError(describeConnectError(e));
            });
            setData({ ...emptyData });
          }
          setConnecting(false);
        },
        (err) => {
          console.error("sync listener error", err);
          setConnectError(describeConnectError(err));
          setConnecting(false);
        }
      );
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [familyCode, authReady, user, retryToken]);

  const update = useCallback(
    (fn: (d: AppData) => AppData) => {
      if (firebaseEnabled && familyCode) {
        const ref = familyDoc(familyCode);
        if (!ref) return;
        // Optimistic local update for snappy UI; the snapshot is authoritative.
        setData((prev) => (prev ? fn(structuredClone(prev)) : prev));
        runTransaction(getDb()!, async (tx) => {
          const snap = await tx.get(ref);
          const current = snap.exists()
            ? normalizeData(snap.data() as Partial<AppData>)
            : { ...emptyData };
          const next = fn(structuredClone(current));
          tx.set(ref, next);
        }).catch((err) => console.error("sync write failed", err));
      } else {
        setData((prev) => {
          const base = prev ?? loadData();
          const next = fn(structuredClone(base));
          saveData(next);
          return next;
        });
      }
    },
    [familyCode]
  );

  // Synced mode: once we have data for a family, clear old settled history a
  // single time. The write goes through the same transaction path as any edit.
  useEffect(() => {
    if (!synced || !data || prunedRef.current) return;
    prunedRef.current = true;
    if (pruneOldRequests(data).changed) {
      update((d) => pruneOldRequests(d).data);
    }
  }, [synced, data, update]);

  const createFamily = useCallback(async (code: string, adminUid: string | null) => {
    const ref = familyDoc(code);
    if (!ref) return;
    try {
      await ensureSignedIn();
      // Seed the new family with whatever this device already had locally,
      // and mark whoever created it as the admin.
      const seed = { ...structuredClone(seedRef.current), adminUid };
      await setDoc(ref, seed);
    } catch (e) {
      console.error("create family failed", e);
    }
    saveFamilyCode(code);
    setData(null);
    setConnecting(true);
    setConnectError(null);
    setFamilyCode(code);
  }, []);

  const joinFamily = useCallback((code: string) => {
    saveFamilyCode(code);
    setData(null);
    setConnecting(true);
    setConnectError(null);
    setFamilyCode(code);
  }, []);

  // Set right before an explicit leave so the auto-rejoin effect below
  // doesn't immediately pull the just-left family back in.
  const skipAutoRejoinRef = useRef(false);

  const leaveFamily = useCallback(() => {
    skipAutoRejoinRef.current = true;
    setConnectError(null);
    saveFamilyCode(null);
    setFamilyCode(null);
    setConnecting(false);
    setData(loadData());
    // Forget it on the account too, or signing back in would restore it.
    if (user) void clearUserFamily(user.uid);
  }, [user]);

  // Tie the family to the signed-in account so it "follows" the person:
  //  - if they're in a family, remember it on their account;
  //  - if they're signed in but this device has no family, restore the one
  //    their account remembers (unless they just explicitly left one).
  useEffect(() => {
    if (!firebaseEnabled || !authReady || !user) return;
    if (familyCode) {
      void setUserFamily(user.uid, familyCode);
      return;
    }
    if (skipAutoRejoinRef.current) {
      skipAutoRejoinRef.current = false;
      return;
    }
    let cancelled = false;
    getUserFamily(user.uid).then((code) => {
      if (!cancelled && code) joinFamily(code);
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, user, familyCode, joinFamily]);

  return {
    data,
    update,
    mode: synced ? "synced" : "local",
    familyCode,
    syncAvailable: firebaseEnabled,
    connecting,
    connectError,
    retryConnect,
    createFamily,
    joinFamily,
    leaveFamily,
  };
}
