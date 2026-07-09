import { useCallback, useEffect, useRef, useState } from "react";
import {
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { ensureSignedIn, firebaseEnabled, getDb } from "../lib/firebase";
import { pruneOldRequests } from "../lib/retention";
import {
  loadData,
  loadFamilyCode,
  saveData,
  saveFamilyCode,
} from "../lib/storage";
import { emptyData, type AppData } from "../types";

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
  createFamily: (code: string) => Promise<void>;
  joinFamily: (code: string) => void;
  leaveFamily: () => void;
}

const familyDoc = (code: string) => {
  const db = getDb();
  return db ? doc(db, "families", code) : null;
};

export function useAppData(): UseAppData {
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

  // Subscribe to the family document in synced mode.
  useEffect(() => {
    if (!firebaseEnabled || !familyCode) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    setConnecting(true);

    (async () => {
      try {
        await ensureSignedIn();
      } catch (e) {
        console.error("anonymous sign-in failed", e);
      }
      if (cancelled) return;
      const ref = familyDoc(familyCode);
      if (!ref) return;
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            setData(snap.data() as AppData);
          } else {
            // Family doc doesn't exist yet — create an empty one.
            void setDoc(ref, { ...emptyData });
            setData({ ...emptyData });
          }
          setConnecting(false);
        },
        (err) => {
          console.error("sync listener error", err);
          setConnecting(false);
        }
      );
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [familyCode]);

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
            ? (snap.data() as AppData)
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

  const createFamily = useCallback(async (code: string) => {
    const ref = familyDoc(code);
    if (!ref) return;
    try {
      await ensureSignedIn();
      // Seed the new family with whatever this device already had locally.
      await setDoc(ref, structuredClone(seedRef.current));
    } catch (e) {
      console.error("create family failed", e);
    }
    saveFamilyCode(code);
    setData(null);
    setConnecting(true);
    setFamilyCode(code);
  }, []);

  const joinFamily = useCallback((code: string) => {
    saveFamilyCode(code);
    setData(null);
    setConnecting(true);
    setFamilyCode(code);
  }, []);

  const leaveFamily = useCallback(() => {
    saveFamilyCode(null);
    setFamilyCode(null);
    setConnecting(false);
    setData(loadData());
  }, []);

  return {
    data,
    update,
    mode: synced ? "synced" : "local",
    familyCode,
    syncAvailable: firebaseEnabled,
    connecting,
    createFamily,
    joinFamily,
    leaveFamily,
  };
}
