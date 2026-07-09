import { useState } from "react";
import { AVATARS, uid } from "../lib/format";
import type { AppData } from "../types";

export function Onboarding({ update }: { update: (fn: (d: AppData) => AppData) => void }) {
  const [kids, setKids] = useState([{ name: "", avatar: AVATARS[0] }]);

  const setKid = (i: number, patch: Partial<{ name: string; avatar: string }>) =>
    setKids((k) => k.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const ready = kids.some((k) => k.name.trim());

  const finish = () => {
    const cleaned = kids
      .filter((k) => k.name.trim())
      .map((k) => ({ id: uid(), name: k.name.trim(), avatar: k.avatar }));
    update((d) => {
      d.kids = cleaned;
      return d;
    });
  };

  return (
    <main className="fr-main">
      <div className="fr-card fr-onboard">
        <h2 className="fr-h2">Who&apos;s asking for money around here?</h2>
        <p className="fr-muted">Add the kids. Parents get their own view for approving stuff.</p>
        {kids.map((k, i) => (
          <div key={i} className="fr-onboard-row">
            <div className="fr-avatar-picker">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  className={"fr-avatar-opt" + (k.avatar === a ? " picked" : "")}
                  onClick={() => setKid(i, { avatar: a })}
                >
                  {a}
                </button>
              ))}
            </div>
            <input
              className="fr-input"
              placeholder="Kid's name"
              value={k.name}
              maxLength={20}
              onChange={(e) => setKid(i, { name: e.target.value })}
            />
          </div>
        ))}
        <button
          className="fr-ghost-btn"
          onClick={() => setKids((k) => [...k, { name: "", avatar: AVATARS[k.length % AVATARS.length] }])}
        >
          + Add another kid
        </button>
        <button className="fr-primary-btn" disabled={!ready} onClick={finish}>
          Open the family tab
        </button>
      </div>
    </main>
  );
}
