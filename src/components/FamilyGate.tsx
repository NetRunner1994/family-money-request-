import { useState } from "react";
import {
  generateFamilyCode,
  isValidFamilyCode,
  normalizeFamilyCode,
} from "../lib/familyCode";
import type { User } from "../lib/auth";
import { EmailAuthForm } from "./EmailAuthForm";

export function FamilyGate({
  user,
  onCreate,
  onJoin,
  showToast,
}: {
  user: User | null;
  onCreate: (code: string) => void;
  onJoin: (code: string) => void;
  showToast: (msg: string) => void;
}) {
  const [view, setView] = useState<"choose" | "create" | "join">("choose");
  const [newCode] = useState(() => generateFamilyCode());
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the code is on screen to type manually */
    }
  };

  const joinNormalized = normalizeFamilyCode(joinInput);

  return (
    <main className="fr-main">
      <div className="fr-card fr-pad">
        {view === "choose" && (
          <>
            <div className="fr-gate-emoji">👨‍👩‍👧‍👦</div>
            <h2 className="fr-h2">Set up your family</h2>
            <p className="fr-muted">
              Everyone in the family shares one code. Start a new family, or join
              one someone already made — then requests sync across all your phones.
            </p>
            <button className="fr-primary-btn" onClick={() => setView("create")}>
              Start a new family
            </button>
            <button className="fr-ghost-btn" onClick={() => setView("join")}>
              Join with a code
            </button>
          </>
        )}

        {view === "create" && !user && (
          <>
            <button className="fr-back" onClick={() => setView("choose")}>
              ← back
            </button>
            <h2 className="fr-h2">Sign in to start your family</h2>
            <p className="fr-muted">
              Whoever creates the family becomes its admin — the only one who can
              add or remove kids and grown-ups later. Sign in so that&apos;s really you.
            </p>
            <EmailAuthForm showToast={showToast} />
          </>
        )}

        {view === "create" && user && (
          <>
            <button className="fr-back" onClick={() => setView("choose")}>
              ← back
            </button>
            <h2 className="fr-h2">Your family code</h2>
            <p className="fr-muted">
              Share this with the family. Each person taps “Join with a code” on
              their own phone and enters it. Keep it private — anyone with the code
              can see your family’s requests. You&apos;ll be the family admin.
            </p>
            <div className="fr-code-box">{newCode}</div>
            <button className="fr-quick-btn fr-copy-btn" onClick={copy}>
              {copied ? "Copied ✓" : "Copy code"}
            </button>
            <button className="fr-primary-btn" onClick={() => onCreate(newCode)}>
              Continue →
            </button>
          </>
        )}

        {view === "join" && (
          <>
            <button className="fr-back" onClick={() => setView("choose")}>
              ← back
            </button>
            <h2 className="fr-h2">Enter your family code</h2>
            <p className="fr-muted">
              Type the code the family shared with you.
            </p>
            <input
              className="fr-input fr-code-input"
              placeholder="XXXX-XXXX-XXXX"
              value={joinInput}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setJoinInput(e.target.value)}
            />
            <button
              className="fr-primary-btn"
              disabled={!isValidFamilyCode(joinNormalized)}
              onClick={() => onJoin(joinNormalized)}
            >
              Join family
            </button>
          </>
        )}
      </div>
    </main>
  );
}
