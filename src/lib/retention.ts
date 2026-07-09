import type { AppData, MoneyRequest, PeerRequest } from "../types";

// How long settled (paid/declined) requests are kept before auto-cleanup.
export const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

// When a kid request became "settled" — used to decide if it's old enough to clear.
function settledAt(r: MoneyRequest): number {
  if (r.status === "paid") return r.paidAt ?? r.decidedAt ?? r.createdAt;
  if (r.status === "declined") return r.decidedAt ?? r.createdAt;
  return r.createdAt;
}

/**
 * Remove settled history older than the retention window, keeping the data
 * record small. Unresolved money is always preserved:
 *  - kid requests that are "pending" (waiting) or "approved" (owed)
 *  - peer requests that are "pending" (still waiting to be paid)
 * Only "paid" and "declined" items older than RETENTION_DAYS are cleared.
 */
export function pruneOldRequests(
  data: AppData,
  now: number = Date.now()
): { data: AppData; changed: boolean } {
  const cutoff = now - RETENTION_MS;

  const keptRequests = data.requests.filter((r) => {
    if (r.status === "pending" || r.status === "approved") return true;
    return settledAt(r) >= cutoff;
  });

  const keptPeer = (data.peerRequests ?? []).filter((p: PeerRequest) => {
    if (p.status === "pending") return true;
    return (p.decidedAt ?? p.createdAt) >= cutoff;
  });

  const changed =
    keptRequests.length !== data.requests.length ||
    keptPeer.length !== (data.peerRequests ?? []).length;
  if (!changed) return { data, changed: false };
  return {
    data: { ...data, requests: keptRequests, peerRequests: keptPeer },
    changed: true,
  };
}
