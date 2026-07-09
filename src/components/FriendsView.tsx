import { useState } from "react";
import { fmt, haptic, timeAgo, uid } from "../lib/format";
import type { AppData, Member, PeerRequest } from "../types";

const QUICK = [5, 10, 20, 50];

export function FriendsView({
  data,
  update,
  showToast,
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  showToast: (msg: string) => void;
}) {
  const members = data.members;
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");

  const memberById = (id: string) => members.find((m) => m.id === id);
  const amount = parseFloat(amountStr) || 0;
  const canSend = fromId && toId && fromId !== toId && amount > 0;

  const send = () => {
    if (!canSend) return;
    update((d) => {
      d.peerRequests.push({
        id: uid(),
        fromId: fromId!,
        toId: toId!,
        amount,
        note: note.trim(),
        status: "pending",
        createdAt: Date.now(),
      });
      return d;
    });
    haptic([20, 30, 20]);
    showToast(`Requested ${fmt(amount)} from ${memberById(toId!)?.name} 💸`);
    setAmountStr("");
    setNote("");
    setToId(null);
  };

  const settle = (id: string, status: "paid" | "declined") => {
    update((d) => {
      const p = d.peerRequests.find((x) => x.id === id);
      if (p) {
        p.status = status;
        p.decidedAt = Date.now();
      }
      return d;
    });
    haptic(status === "paid" ? [15, 30, 15] : 15);
    showToast(status === "paid" ? "Marked paid 🤝" : "Declined.");
  };

  const requests = [...data.peerRequests].sort((a, b) => b.createdAt - a.createdAt);

  if (members.length < 2) {
    return (
      <div className="fr-card fr-pad fr-empty">
        <div className="fr-done-emoji">🧑‍🤝‍🧑</div>
        <p className="fr-muted">
          Add at least two grown-ups or friends in <strong>Settings</strong> to
          start requesting money between each other.
        </p>
      </div>
    );
  }

  return (
    <section className="fr-section">
      <div className="fr-card fr-pad">
        <h3 className="fr-h3" style={{ marginTop: 0 }}>
          Request money
        </h3>
        <p className="fr-muted">Ask someone in the group to pay you back.</p>

        <label className="fr-field-label">Who&apos;s asking?</label>
        <div className="fr-cats">
          {members.map((m) => (
            <MemberChip
              key={m.id}
              m={m}
              on={fromId === m.id}
              onClick={() => {
                setFromId(m.id);
                if (toId === m.id) setToId(null);
              }}
            />
          ))}
        </div>

        <label className="fr-field-label">Request from</label>
        <div className="fr-cats">
          {members
            .filter((m) => m.id !== fromId)
            .map((m) => (
              <MemberChip key={m.id} m={m} on={toId === m.id} onClick={() => setToId(m.id)} />
            ))}
        </div>

        <label className="fr-field-label">Amount</label>
        <div className="fr-quick">
          {QUICK.map((q) => (
            <button key={q} className="fr-quick-btn" onClick={() => setAmountStr(String(q))}>
              ${q}
            </button>
          ))}
        </div>
        <input
          className="fr-input"
          inputMode="decimal"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, ""))}
        />

        <input
          className="fr-input"
          style={{ marginTop: 10 }}
          placeholder="What for? (e.g. 'lunch', 'concert tickets')"
          value={note}
          maxLength={140}
          onChange={(e) => setNote(e.target.value)}
        />

        <button className="fr-primary-btn" style={{ marginTop: 14 }} disabled={!canSend} onClick={send}>
          Request {amount > 0 ? fmt(amount) : "money"}
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="fr-card fr-pad fr-empty">
          <p className="fr-muted">No money requests yet.</p>
        </div>
      ) : (
        requests.map((p) => (
          <PeerCard
            key={p.id}
            req={p}
            from={memberById(p.fromId)}
            to={memberById(p.toId)}
            onSettle={settle}
          />
        ))
      )}
    </section>
  );
}

function MemberChip({ m, on, onClick }: { m: Member; on: boolean; onClick: () => void }) {
  return (
    <button className={"fr-cat" + (on ? " on" : "")} onClick={onClick}>
      <span>{m.avatar}</span> {m.name}
    </button>
  );
}

const PEER_STAMP = {
  pending: { text: "OWES", cls: "wait" },
  paid: { text: "PAID", cls: "paid" },
  declined: { text: "DECLINED", cls: "no" },
};

function PeerCard({
  req,
  from,
  to,
  onSettle,
}: {
  req: PeerRequest;
  from: Member | undefined;
  to: Member | undefined;
  onSettle: (id: string, status: "paid" | "declined") => void;
}) {
  const stamp = PEER_STAMP[req.status];
  return (
    <div className="fr-card fr-receipt small">
      <div className={"fr-stamp " + stamp.cls}>{stamp.text}</div>
      <div className="fr-receipt-top">
        <span className="fr-kid-emoji">{to?.avatar}</span>
        <div className="fr-receipt-meta">
          <div className="fr-receipt-who">
            <strong>{from?.name}</strong> requested from <strong>{to?.name}</strong>
          </div>
          <div className="fr-receipt-amt sm">{fmt(req.amount)}</div>
        </div>
      </div>
      {req.note && <p className="fr-receipt-reason sm">&quot;{req.note}&quot;</p>}
      <div className="fr-receipt-time">{timeAgo(req.createdAt)}</div>
      {req.status === "pending" && (
        <div className="fr-decide">
          <button className="fr-decline-btn" onClick={() => onSettle(req.id, "declined")}>
            Decline
          </button>
          <button className="fr-approve-btn" onClick={() => onSettle(req.id, "paid")}>
            Mark paid
          </button>
        </div>
      )}
    </div>
  );
}
