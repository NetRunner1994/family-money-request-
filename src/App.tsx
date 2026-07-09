import { useEffect, useRef, useState } from "react";
import { FamilyGate } from "./components/FamilyGate";
import { InstallPrompt } from "./components/InstallPrompt";
import { KidView } from "./components/KidView";
import { Onboarding } from "./components/Onboarding";
import { ParentView } from "./components/ParentView";
import { PinGate } from "./components/PinGate";
import { AccountSheet } from "./components/AccountSheet";
import { WhoScreen } from "./components/WhoScreen";
import { useAppData } from "./hooks/useAppData";
import { useAuth } from "./hooks/useAuth";
import { signOutUser } from "./lib/auth";
import { firebaseEnabled } from "./lib/firebase";
import { loadKidIdentity, saveKidIdentity } from "./lib/storage";

type Mode = "kid" | "parent";

function App() {
  const { user, ready: authReady } = useAuth();
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
  } = useAppData(user, authReady);

  // Local-only mode (no login) keeps the old kid/parent toggle.
  const [mode, setMode] = useState<Mode>("kid");
  const [pinGate, setPinGate] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Which kid this device is signed in as (login mode only).
  const [kidId, setKidIdState] = useState<string | null>(() =>
    firebaseEnabled ? loadKidIdentity() : null
  );
  const pickKid = (id: string) => {
    saveKidIdentity(id);
    setKidIdState(id);
  };
  const switchUser = () => {
    saveKidIdentity(null);
    setKidIdState(null);
    if (user) void signOutUser();
    setAccountOpen(false);
  };

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

  const needsFamily = syncAvailable && !familyCode;

  // Identity (login mode): a signed-in Google user is always a grown-up; a
  // device with a stored kid id (and no grown-up session) is that kid.
  const grownup = firebaseEnabled && !!user;
  const kidIdentity =
    firebaseEnabled && !user && kidId && data?.kids.some((k) => k.id === kidId) ? kidId : null;

  const myMember =
    user && data ? data.members.find((m) => m.id === data.memberAuth[user.uid]) : undefined;
  const myKid = kidIdentity && data ? data.kids.find((k) => k.id === kidIdentity) : undefined;
  const accountIcon = myMember?.avatar ?? myKid?.avatar ?? (user ? "✅" : "👤");

  // In login mode, once you're in a family and loaded, you must be identified.
  const needsIdentity =
    firebaseEnabled && !needsFamily && !connecting && !!data && !grownup && !kidIdentity;

  const renderMain = () => {
    if (needsFamily) return <FamilyGate onCreate={createFamily} onJoin={joinFamily} />;
    if (connecting || !data)
      return (
        <main className="fr-main">
          <div className="fr-card fr-pad fr-empty">
            <div className="fr-done-emoji">🔄</div>
            <p className="fr-muted">Connecting to your family…</p>
          </div>
        </main>
      );

    // ---- Login mode: identity decides the whole experience ----
    if (firebaseEnabled) {
      if (needsIdentity) return <WhoScreen data={data} onPickKid={pickKid} showToast={showToast} />;
      if (kidIdentity)
        return (
          <>
            <div className="fr-main">
              <InstallPrompt />
            </div>
            <KidView data={data} update={update} lockedKidId={kidIdentity} />
          </>
        );
      // grown-up
      return (
        <>
          <div className="fr-main">
            <InstallPrompt />
          </div>
          <ParentView
            data={data}
            update={update}
            showToast={showToast}
            sync={{ mode: syncMode, familyCode, leaveFamily }}
            user={user}
          />
        </>
      );
    }

    // ---- Local mode (no login): original kid/parent toggle ----
    return (
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
    );
  };

  const showToggle = !firebaseEnabled && !needsFamily;

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
          {showToggle && (
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
              {accountIcon}
            </button>
          )}
        </div>
      </header>

      {renderMain()}

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
          kidName={myKid?.name ?? null}
          canSwitch={grownup || !!kidIdentity}
          onSwitchUser={switchUser}
          showToast={showToast}
          onClose={() => setAccountOpen(false)}
        />
      )}

      {toast && <div className="fr-toast">{toast}</div>}
    </div>
  );
}

export default App;
