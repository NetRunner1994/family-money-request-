import { useState } from "react";
import { haptic } from "../lib/format";

export function PinGate({
  pin,
  onSuccess,
  onCancel,
}: {
  pin: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [entry, setEntry] = useState("");
  const [shake, setShake] = useState(false);

  const tap = (d: string) => {
    haptic(8);
    const next = entry + d;
    setEntry(next);
    if (next.length === 4) {
      if (next === pin) onSuccess();
      else {
        haptic([40, 40, 40]);
        setShake(true);
        setTimeout(() => {
          setEntry("");
          setShake(false);
        }, 450);
      }
    }
  };

  return (
    <div className="fr-overlay" onClick={onCancel}>
      <div
        className={"fr-card fr-pad fr-pin" + (shake ? " shake" : "")}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="fr-h3" style={{ marginTop: 0, textAlign: "center" }}>
          Parents only 🔒
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
        <button className="fr-ghost-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
