import { CATEGORIES, fmt, timeAgo } from "../lib/format";
import type { Kid, MoneyRequest, RequestStatus } from "../types";

const STAMP: Record<RequestStatus, { text: string; cls: string }> = {
  pending: { text: "WAITING", cls: "wait" },
  approved: { text: "APPROVED", cls: "yes" },
  declined: { text: "DECLINED", cls: "no" },
  paid: { text: "PAID", cls: "paid" },
};

export function RequestCard({
  req,
  kid,
  showKid,
}: {
  req: MoneyRequest;
  kid: Kid | undefined;
  showKid?: boolean;
}) {
  const cat = CATEGORIES.find((c) => c.id === req.category);
  const stamp = STAMP[req.status];
  return (
    <div className="fr-card fr-receipt small">
      <div className={"fr-stamp " + stamp.cls}>{stamp.text}</div>
      <div className="fr-receipt-top">
        {showKid && <span className="fr-kid-emoji">{kid?.avatar}</span>}
        <div className="fr-receipt-meta">
          <div className="fr-receipt-who">
            {showKid ? <strong>{kid?.name}</strong> : "You"} asked for
          </div>
          <div className="fr-receipt-amt sm">{fmt(req.amount)}</div>
        </div>
        <span className="fr-cat-pill">{cat?.emoji}</span>
      </div>
      <p className="fr-receipt-reason sm">&quot;{req.reason}&quot;</p>
      {req.parentNote && <div className="fr-parent-note">👨‍👩‍👧 {req.parentNote}</div>}
      <div className="fr-receipt-time">{timeAgo(req.createdAt)}</div>
    </div>
  );
}
