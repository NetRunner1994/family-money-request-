import { useState } from "react";
import { fmt, haptic, uid } from "../lib/format";
import { computeStatements, type StatementPeriod } from "../lib/statement";
import type { User } from "../lib/auth";
import type { AppData, Member } from "../types";
import { MemberChip } from "./FriendsView";

const QUICK = [5, 10, 20, 50];

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function OweView({
  data,
  update,
  showToast,
  user,
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  showToast: (msg: string) => void;
  user: User | null;
}) {
  const members = data.members;
  // If the signed-in grown-up is linked to a member, that's who's logging
  // the debt. Otherwise (local mode, no login) let them pick themselves.
  const myMemberId = user ? data.memberAuth[user.uid] ?? null : null;
  const [selfIdManual, setSelfIdManual] = useState<string | null>(null);
  const selfId = myMemberId ?? selfIdManual;
  const memberById = (id: string) => members.find((m) => m.id === id);

  const [toId, setToId] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");
  const amount = parseFloat(amountStr) || 0;
  const canLog = !!selfId && !!toId && amount > 0;

  const log = () => {
    if (!canLog || !selfId || !toId) return;
    update((d) => {
      d.peerRequests.push({
        id: uid(),
        fromId: toId,
        toId: selfId,
        amount,
        note: note.trim(),
        status: "pending",
        createdAt: Date.now(),
      });
      return d;
    });
    haptic([20, 30, 20]);
    showToast(`Logged: you owe ${memberById(toId)?.name} ${fmt(amount)} 💸`);
    setAmountStr("");
    setNote("");
    setToId(null);
  };

  if (members.length < 2) {
    return (
      <div className="fr-card fr-pad fr-empty">
        <div className="fr-done-emoji">🧾</div>
        <p className="fr-muted">
          Add at least two adults or friends in <strong>Settings</strong> to
          start logging who owes who.
        </p>
      </div>
    );
  }

  const periods = selfId ? computeStatements(data.peerRequests, selfId) : [];

  return (
    <section className="fr-section">
      <div className="fr-card fr-pad">
        <h3 className="fr-h3" style={{ marginTop: 0 }}>
          I owe someone
        </h3>
        <p className="fr-muted">
          They paid for something for you? Log it here instead of them having
          to request it back.
        </p>

        <label className="fr-field-label">Who&apos;s logging this?</label>
        {myMemberId ? (
          <p className="fr-muted" style={{ marginBottom: 4 }}>
            {memberById(myMemberId)?.avatar} You ({memberById(myMemberId)?.name})
          </p>
        ) : (
          <div className="fr-cats">
            {members.map((m) => (
              <MemberChip
                key={m.id}
                m={m}
                on={selfId === m.id}
                onClick={() => {
                  setSelfIdManual(m.id);
                  if (toId === m.id) setToId(null);
                }}
              />
            ))}
          </div>
        )}

        <label className="fr-field-label">Who do you owe?</label>
        <div className="fr-cats">
          {members
            .filter((m) => m.id !== selfId)
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
          placeholder="What for? (e.g. 'gas money', 'movie tickets')"
          value={note}
          maxLength={140}
          onChange={(e) => setNote(e.target.value)}
        />

        <button className="fr-primary-btn" style={{ marginTop: 14 }} disabled={!canLog} onClick={log}>
          Log it {amount > 0 ? fmt(amount) : ""}
        </button>
        {!canLog && (
          <p className="fr-muted" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
            {!selfId
              ? "Pick who's logging this above."
              : !toId
                ? "Pick who you owe above."
                : "Enter an amount above $0."}
          </p>
        )}
      </div>

      <h3 className="fr-h3">Your statement</h3>
      <p className="fr-muted" style={{ marginTop: -8, fontSize: 12 }}>
        Rolls up every 30 days. Anything still unpaid just carries into the
        next period — nothing is ever deleted or forced.
      </p>

      {periods.length === 0 ? (
        <div className="fr-card fr-pad fr-empty">
          <p className="fr-muted">No activity yet.</p>
        </div>
      ) : (
        periods.map((p, i) => (
          <StatementCard key={p.start} period={p} isCurrent={i === 0} memberById={memberById} />
        ))
      )}
    </section>
  );
}

function StatementCard({
  period,
  isCurrent,
  memberById,
}: {
  period: StatementPeriod;
  isCurrent: boolean;
  memberById: (id: string) => Member | undefined;
}) {
  const { carriedYouOwe, carriedOwedToYou, activity, closingYouOwe, closingOwedToYou } = period;
  const settled = closingYouOwe === 0 && closingOwedToYou === 0;

  return (
    <div className="fr-card fr-pad fr-receipt small">
      <div className="fr-receipt-top" style={{ marginBottom: 4 }}>
        <div className="fr-receipt-meta">
          <div className="fr-receipt-who">
            <strong>
              {fmtDate(period.start)} – {fmtDate(period.end)}
            </strong>
            {isCurrent && (
              <span className="fr-cat-pill" style={{ marginLeft: 8 }}>
                Current
              </span>
            )}
          </div>
        </div>
      </div>

      {(carriedYouOwe > 0 || carriedOwedToYou > 0) && (
        <p className="fr-muted" style={{ fontSize: 12 }}>
          Carried over:{" "}
          {carriedYouOwe > 0 && `you owed ${fmt(carriedYouOwe)}`}
          {carriedYouOwe > 0 && carriedOwedToYou > 0 && " · "}
          {carriedOwedToYou > 0 && `owed to you ${fmt(carriedOwedToYou)}`}
        </p>
      )}

      {activity.map((a) => {
        const cp = memberById(a.counterpartyId);
        return (
          <div key={a.id} className="fr-owed-row">
            <span className="fr-kid-emoji">{cp?.avatar}</span>
            <span className="fr-owed-name">
              {a.direction === "you-owe" ? `You owe ${cp?.name}` : `${cp?.name} owes you`}
              {a.status !== "pending" && (
                <span className="fr-muted" style={{ fontSize: 11 }}>
                  {" "}
                  ({a.status})
                </span>
              )}
            </span>
            <span className="fr-owed-amt">{fmt(a.amount)}</span>
          </div>
        );
      })}

      <div className="fr-receipt-divider" />
      <p className="fr-muted" style={{ margin: 0, fontSize: 12 }}>
        {settled ? (
          "All settled ✅"
        ) : (
          <>
            Balance:{" "}
            {closingYouOwe > 0 && `you owe ${fmt(closingYouOwe)}`}
            {closingYouOwe > 0 && closingOwedToYou > 0 && " · "}
            {closingOwedToYou > 0 && `owed to you ${fmt(closingOwedToYou)}`}
          </>
        )}
      </p>
    </div>
  );
}
