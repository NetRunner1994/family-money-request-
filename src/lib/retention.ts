import type { AppData, MoneyRequest } from "../types";

// How long settled (paid/declined) requests are kept before auto-cleanup.
export const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

// When a request became "settled" — used to decide if it's old enough to clear.
function settledAt(r: MoneyRequest): number {
  if (r.status === "paid") return r.paidAt ?? r.decidedAt ?? r.createdAt;
  if (r.status === "declined") return r.decidedAt ?? r.createdAt;
  return r.createdAt;
}

/**
 * Remove settled history older than the retention window, keeping the data
 * record small. Unresolved money is always preserved:
 *  - "pending"  (still waiting on a decision)
 *  - "approved" (approved but not yet paid — money still owed)
 * Only "paid" and "declined" requests are eligible for cleanup, and only once
 * they're older than RETENTION_DAYS.
 */
export function pruneOldRequests(
  data: AppData,
  now: number = Date.now()
): { data: AppData; changed: boolean } {
  const cutoff = now - RETENTION_MS;
  const kept = data.requests.filter((r) => {
    if (r.status === "pending" || r.status === "approved") return true;
    return settledAt(r) >= cutoff;
  });
  if (kept.length === data.requests.length) return { data, changed: false };
  return { data: { ...data, requests: kept }, changed: true };
}
