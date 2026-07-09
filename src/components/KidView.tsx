import { useState } from "react";
import { CATEGORIES, QUICK_AMOUNTS, fmt, haptic, uid } from "../lib/format";
import type { AppData } from "../types";
import { RequestCard } from "./RequestCard";

type Step = "amount" | "reason" | "done";

export function KidView({
  data,
  update,
  lockedKidId,
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  /** When set, the view is locked to this one kid (no picker) — used once a
   *  kid has identified themselves. */
  lockedKidId?: string;
}) {
  const [kidId, setKidId] = useState(lockedKidId ?? data.kids[0]?.id);
  const [step, setStep] = useState<Step>("amount");
  const [amountStr, setAmountStr] = useState("0");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const kid = data.kids.find((k) => k.id === (lockedKidId ?? kidId)) || data.kids[0];
  const amount = parseFloat(amountStr) || 0;

  const myRequests = data.requests
    .filter((r) => r.kidId === kid.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const owed = myRequests
    .filter((r) => r.status === "approved")
    .reduce((s, r) => s + r.amount, 0);

  const press = (key: string) => {
    haptic(8);
    setAmountStr((cur) => {
      if (key === "back") {
        const next = cur.slice(0, -1);
        return next === "" ? "0" : next;
      }
      if (key === ".") {
        if (cur.includes(".")) return cur;
        return cur + ".";
      }
      if (cur.includes(".")) {
        const dec = cur.split(".")[1];
        if (dec.length >= 2) return cur;
      }
      if (cur === "0") return key;
      if (cur.replace(".", "").length >= 5) return cur;
      return cur + key;
    });
  };

  const submit = () => {
    update((d) => {
      d.requests.push({
        id: uid(),
        kidId: kid.id,
        amount,
        reason: reason.trim(),
        category,
        status: "pending",
        createdAt: Date.now(),
        parentNote: null,
      });
      return d;
    });
    haptic([20, 30, 20]);
    setStep("done");
  };

  const reset = () => {
    setAmountStr("0");
    setReason("");
    setCategory(null);
    setStep("amount");
  };

  return (
    <main className="fr-main">
      {lockedKidId ? (
        <div className="fr-kid-row">
          <div className="fr-kid-chip on" style={{ cursor: "default" }}>
            <span className="fr-kid-emoji">{kid.avatar}</span>
            {kid.name}
          </div>
        </div>
      ) : (
        <div className="fr-kid-row">
          {data.kids.map((k) => (
            <button
              key={k.id}
              className={"fr-kid-chip" + (k.id === kid.id ? " on" : "")}
              onClick={() => {
                setKidId(k.id);
                reset();
              }}
            >
              <span className="fr-kid-emoji">{k.avatar}</span>
              {k.name}
            </button>
          ))}
        </div>
      )}

      {owed > 0 && (
        <div className="fr-owed">
          💰 Mom &amp; Dad owe you <strong>{fmt(owed)}</strong>
        </div>
      )}

      {step === "amount" && (
        <div className="fr-card fr-pad">
          <div className="fr-amount-display">
            <span className="fr-amount-dollar">$</span>
            <span className="fr-amount-num">{amountStr}</span>
          </div>
          <div className="fr-quick">
            {QUICK_AMOUNTS.map((q) => (
              <button key={q} className="fr-quick-btn" onClick={() => setAmountStr(String(q))}>
                ${q}
              </button>
            ))}
          </div>
          <div className="fr-keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"].map((k) => (
              <button key={k} className="fr-key" onClick={() => press(k)}>
                {k === "back" ? "⌫" : k}
              </button>
            ))}
          </div>
          <button className="fr-primary-btn" disabled={amount <= 0} onClick={() => setStep("reason")}>
            Request {amount > 0 ? fmt(amount) : "money"}
          </button>
        </div>
      )}

      {step === "reason" && (
        <div className="fr-card fr-pad">
          <button className="fr-back" onClick={() => setStep("amount")}>
            ← change amount
          </button>
          <h2 className="fr-h2">Okay, {fmt(amount)}. What&apos;s it for?</h2>
          <p className="fr-muted">Real talk: a good reason gets approved way faster.</p>
          <div className="fr-cats">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={"fr-cat" + (category === c.id ? " on" : "")}
                onClick={() => setCategory(c.id)}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
          <textarea
            className="fr-textarea"
            placeholder="Explain your case... e.g. 'Book fair is Friday and there's a dinosaur encyclopedia with my name on it'"
            value={reason}
            maxLength={280}
            rows={4}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="fr-char">{reason.length}/280</div>
          <button className="fr-primary-btn" disabled={!reason.trim() || !category} onClick={submit}>
            Send request 🚀
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="fr-card fr-pad fr-done">
          <div className="fr-done-emoji">📨</div>
          <h2 className="fr-h2">Request sent!</h2>
          <p className="fr-muted">{fmt(amount)} is waiting on a parent&apos;s yes. Cross your fingers.</p>
          <button className="fr-primary-btn" onClick={reset}>
            Ask for more 😎
          </button>
        </div>
      )}

      {myRequests.length > 0 && (
        <section className="fr-section">
          <h3 className="fr-h3">Your activity</h3>
          {myRequests.map((r) => (
            <RequestCard key={r.id} req={r} kid={kid} />
          ))}
        </section>
      )}
    </main>
  );
}
