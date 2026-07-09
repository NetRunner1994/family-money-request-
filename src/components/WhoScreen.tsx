import { useState } from "react";
import { haptic } from "../lib/format";
import type { AppData, Kid } from "../types";
import { EmailAuthForm } from "./EmailAuthForm";

export function WhoScreen({
  data,
  onPickKid,
  showToast,
}: {
  data: AppData;
  onPickKid: (kidId: string) => void;
  showToast: (msg: string) => void;
}) {
  const [pinKid, setPinKid] = useState<Kid | null>(null);
  const [entry, setEntry] = useState("");
  const [shake, setShake] = useState(false);

  const pickKid = (kid: Kid) => {
    if (kid.pin) {
      setPinKid(kid);
      setEntry("");
    } else {
      // No PIN set = no way to prove it's really them, so no entry.
      showToast(`${kid.name} doesn't have a PIN yet. Ask an admin to set one in Settings.`);
    }
  };

  const tap = (d: string) => {
    if (!pinKid) return;
    haptic(8);
    const next = entry + d;
    setEntry(next);
    if (next.length === 4) {
      if (next === pinKid.pin) {
        onPickKid(pinKid.id);
      } else {
        haptic([40, 40, 40]);
        setShake(true);
        setTimeout(() => {
          setEntry("");
          setShake(false);
        }, 450);
      }
    }
  };

  if (pinKid) {
    return (
      <main className="fr-main">
        <div className={"fr-card fr-pad fr-pin" + (shake ? " shake" : "")} style={{ maxWidth: 360, margin: "10px auto" }}>
          <button className="fr-back" onClick={() => setPinKid(null)}>
            ← back
          </button>
          <h3 className="fr-h3" style={{ marginTop: 0, textAlign: "center" }}>
            {pinKid.avatar} {pinKid.name}&apos;s PIN
          </h3>
          <div className="fr-pin-dots">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={"fr-pin-dot" + (entry.length > i ? " full" : "")} />
            ))}
          </div>
          <div className="fr-keypad pin">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "x"].map((k, i) =>
              k === "" ? (
                <span key={i} />
              ) : k === "x" ? (
                <button key={i} className="fr-key" onClick={() => setEntry((e) => e.slice(0, -1))}>
                  ⌫
                </button>
              ) : (
                <button key={i} className="fr-key" onClick={() => tap(k)}>
                  {k}
                </button>
              )
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fr-main">
      <div className="fr-card fr-pad">
        <div className="fr-gate-emoji">👋</div>
        <h2 className="fr-h2">Who&apos;s using this phone?</h2>
        <p className="fr-muted">Pick yourself so the app only lets you act as you.</p>

        <label className="fr-field-label">Grown-up</label>
        <EmailAuthForm showToast={showToast} />

        {data.kids.length > 0 && (
          <>
            <label className="fr-field-label">Kids</label>
            <div className="fr-cats">
              {data.kids.map((k) => (
                <button
                  key={k.id}
                  className={"fr-cat" + (k.pin ? "" : " no-pin")}
                  onClick={() => pickKid(k)}
                >
                  <span>{k.avatar}</span> {k.name} {k.pin ? "🔒" : "⚠️"}
                </button>
              ))}
            </div>
            {data.kids.some((k) => !k.pin) && (
              <p className="fr-muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                ⚠️ Kids without a PIN can&apos;t sign in yet — an admin needs to set
                one in Settings first.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
