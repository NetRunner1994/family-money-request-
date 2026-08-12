import { useEffect, useRef, useState } from "react";
import logoMark from "./assets/logo-mark.svg";
import { FamilyGate } from "./components/FamilyGate";
import { InstallPrompt } from "./components/InstallPrompt";
import { KidView } from "./components/KidView";
import { Onboarding } from "./components/Onboarding";
import { ParentView } from "./components/ParentView";
import { PinGate } from "./components/PinGate";
import { AccountSheet } from "./components/AccountSheet";
import { LinkMemberScreen } from "./components/LinkMemberScreen";
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
    connectError,
    retryConnect,
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

  // Identity (login mode): a signed-in user is always a grown-up; a
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
  // Being signed in only proves who you are — it doesn't add you to the
  // family's member list by itself. Force that step before letting a
  // signed-in grown-up into the app, so nobody can end up invisible to
  // everyone else (signed in, but no name anywhere the family can see).
  const needsMemberLink = firebaseEnabled && !needsFamily && !connecting && !!data && grownup && !myMember;

  const renderMain = () => {
    if (needsFamily)
      return (
        <FamilyGate
          user={user}
          onCreate={(code) => createFamily(code, user?.uid ?? null)}
          onJoin={joinFamily}
          showToast={showToast}
        />
      );
    if (connectError)
      return (
        <main className="fr-main">
          <div className="fr-card fr-pad fr-empty">
            <div className="fr-done-emoji">⚠️</div>
            <h2 className="fr-h2">Couldn&apos;t connect</h2>
            <p className="fr-muted">{connectError}</p>
            <button className="fr-primary-btn" onClick={retryConnect}>
              Try again
            </button>
            <button className="fr-ghost-btn" onClick={leaveFamily}>
              Use a different code
            </button>
          </div>
        </main>
      );
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
      if (needsMemberLink && user)
        return <LinkMemberScreen data={data} update={update} user={user} showToast={showToast} />;
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
          <img className="fr-logo-mark" src={logoMark} alt="" width={200} height={200} />
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
          kidId={kidIdentity}
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
