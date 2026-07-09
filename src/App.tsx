import { useEffect, useRef, useState } from "react";
import { FamilyGate } from "./components/FamilyGate";
import { InstallPrompt } from "./components/InstallPrompt";
import { KidView } from "./components/KidView";
import { Onboarding } from "./components/Onboarding";
import { ParentView } from "./components/ParentView";
import { PinGate } from "./components/PinGate";
import { AccountSheet } from "./components/AccountSheet";
import { useAppData } from "./hooks/useAppData";
import { useAuth } from "./hooks/useAuth";
import { firebaseEnabled } from "./lib/firebase";

type Mode = "kid" | "parent";

function App() {
  const {
    data,
    update,
    mode: syncMode,
    familyCode,
    syncAvailable,
    connecting,
    createFamily,
    joinFamily,
    leaveFamily,
  } = useAppData();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>("kid");
  const [pinGate, setPinGate] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const tryParentMode = () => {
    if (data?.pin) setPinGate(true);
    else setMode("parent");
  };

  // Sync is on, but this device hasn't joined a family yet → show the gate.
  const needsFamily = syncAvailable && !familyCode;

  const myMember =
    user && data ? data.members.find((m) => m.id === data.memberAuth[user.uid]) : undefined;

  return (
    <div className="fr-app">
      <header className="fr-header">
        <div className="fr-logo">
          <span className="fr-logo-coin">🪙</span>
          <div>
            <div className="fr-logo-name">Family Tab</div>
            <div className="fr-logo-sub">ask, explain, get a yes (maybe)</div>
          </div>
        </div>
        <div className="fr-header-right">
          {!needsFamily && (
            <div className="fr-mode">
              <button className={"fr-mode-btn" + (mode === "kid" ? " on" : "")} onClick={() => setMode("kid")}>
                Kids
              </button>
              <button className={"fr-mode-btn" + (mode === "parent" ? " on" : "")} onClick={tryParentMode}>
                Parents
              </button>
            </div>
          )}
          {firebaseEnabled && (
            <button
              className="fr-account-btn"
              onClick={() => setAccountOpen(true)}
              aria-label="Your account"
              title="Your account"
            >
              {myMember ? myMember.avatar : user ? "✅" : "👤"}
            </button>
          )}
        </div>
      </header>

      {needsFamily ? (
        <FamilyGate onCreate={createFamily} onJoin={joinFamily} />
      ) : connecting || !data ? (
        <main className="fr-main">
          <div className="fr-card fr-pad fr-empty">
            <div className="fr-done-emoji">🔄</div>
            <p className="fr-muted">Connecting to your family…</p>
          </div>
        </main>
      ) : (
        <>
          {data.kids.length > 0 && (
            <div className="fr-main">
              <InstallPrompt />
            </div>
          )}

          {data.kids.length === 0 ? (
            <Onboarding update={update} />
          ) : mode === "kid" ? (
            <KidView data={data} update={update} />
          ) : (
            <ParentView
              data={data}
              update={update}
              showToast={showToast}
              sync={{ mode: syncMode, familyCode, leaveFamily }}
              user={user}
            />
          )}
        </>
      )}

      {pinGate && data && (
        <PinGate
          pin={data.pin}
          onSuccess={() => {
            setPinGate(false);
            setMode("parent");
          }}
          onCancel={() => setPinGate(false)}
        />
      )}

      {accountOpen && (
        <AccountSheet
          data={data}
          update={update}
          user={user}
          showToast={showToast}
          onClose={() => setAccountOpen(false)}
        />
      )}

      {toast && <div className="fr-toast">{toast}</div>}
    </div>
  );
}

export default App;
