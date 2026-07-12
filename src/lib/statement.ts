import type { PeerRequest } from "../types";

// A "statement" groups peer-to-peer money into rolling 30-day periods, like a
// credit card statement: whatever's still unpaid when a period ends simply
// carries forward as the opening balance on the next one. Nothing is deleted
// or force-settled — this is a read-only view computed from the existing
// peerRequests, not stored separately.
export const STATEMENT_PERIOD_DAYS = 30;
const PERIOD_MS = STATEMENT_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export interface StatementActivity {
  id: string;
  amount: number;
  counterpartyId: string;
  direction: "you-owe" | "owed-to-you";
  status: PeerRequest["status"];
  createdAt: number;
  decidedAt?: number;
  note: string;
}

export interface StatementPeriod {
  start: number;
  end: number;
  carriedYouOwe: number;
  carriedOwedToYou: number;
  activity: StatementActivity[];
  closingYouOwe: number;
  closingOwedToYou: number;
}

// Was this request still an open (unsettled) balance at time t?
function openAt(p: PeerRequest, t: number): boolean {
  if (p.createdAt > t) return false;
  if (p.status === "pending") return true;
  return (p.decidedAt ?? p.createdAt) > t;
}

/** Build the signed-in member's statement history: one entry per 30-day
 *  period that had activity or a carried balance, most recent first. */
export function computeStatements(
  peerRequests: PeerRequest[],
  myMemberId: string,
  now: number = Date.now()
): StatementPeriod[] {
  const mine = peerRequests.filter((p) => p.fromId === myMemberId || p.toId === myMemberId);
  if (mine.length === 0) return [];

  const earliest = Math.min(...mine.map((p) => p.createdAt));
  const periods: StatementPeriod[] = [];

  let periodStart = earliest - (earliest % PERIOD_MS);
  let carriedYouOwe = 0;
  let carriedOwedToYou = 0;

  while (periodStart <= now) {
    const periodEnd = periodStart + PERIOD_MS;
    const cutoff = Math.min(periodEnd, now);

    const activity: StatementActivity[] = mine
      .filter((p) => p.createdAt >= periodStart && p.createdAt < periodEnd)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        counterpartyId: p.toId === myMemberId ? p.fromId : p.toId,
        direction: (p.toId === myMemberId ? "you-owe" : "owed-to-you") as "you-owe" | "owed-to-you",
        status: p.status,
        createdAt: p.createdAt,
        decidedAt: p.decidedAt,
        note: p.note,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);

    // New this period, still open as of the cutoff.
    let newYouOwe = 0;
    let newOwedToYou = 0;
    for (const a of activity) {
      if (!openAt(mine.find((p) => p.id === a.id)!, cutoff)) continue;
      if (a.direction === "you-owe") newYouOwe += a.amount;
      else newOwedToYou += a.amount;
    }

    // Balances carried in from earlier periods that got settled this period.
    let settledCarriedYouOwe = 0;
    let settledCarriedOwedToYou = 0;
    for (const p of mine) {
      if (p.createdAt >= periodStart || p.status === "pending") continue;
      const decidedAt = p.decidedAt ?? p.createdAt;
      if (decidedAt >= periodStart && decidedAt < periodEnd) {
        if (p.toId === myMemberId) settledCarriedYouOwe += p.amount;
        else settledCarriedOwedToYou += p.amount;
      }
    }

    const closingYouOwe = carriedYouOwe - settledCarriedYouOwe + newYouOwe;
    const closingOwedToYou = carriedOwedToYou - settledCarriedOwedToYou + newOwedToYou;

    if (activity.length > 0 || carriedYouOwe > 0 || carriedOwedToYou > 0) {
      periods.push({
        start: periodStart,
        end: periodEnd,
        carriedYouOwe,
        carriedOwedToYou,
        activity,
        closingYouOwe,
        closingOwedToYou,
      });
    }

    carriedYouOwe = closingYouOwe;
    carriedOwedToYou = closingOwedToYou;
    periodStart = periodEnd;
  }

  return periods.reverse();
}
