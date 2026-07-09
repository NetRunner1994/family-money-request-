import { useEffect, useRef, useState } from "react";
import { InstallPrompt } from "./components/InstallPrompt";
import { KidView } from "./components/KidView";
import { Onboarding } from "./components/Onboarding";
import { ParentView } from "./components/ParentView";
import { PinGate } from "./components/PinGate";
import { loadData, saveData } from "./lib/storage";
import type { AppData } from "./types";

type Mode = "kid" | "parent";

function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [mode, setMode] = useState<Mode>("kid");
  const [pinGate, setPinGate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const update = (fn: (d: AppData) => AppData) => {
    setData((prev) => fn(structuredClone(prev)));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const tryParentMode = () => {
    if (data.pin) setPinGate(true);
    else setMode("parent");
  };

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
        <div className="fr-mode">
          <button className={"fr-mode-btn" + (mode === "kid" ? " on" : "")} onClick={() => setMode("kid")}>
            Kids
          </button>
          <button className={"fr-mode-btn" + (mode === "parent" ? " on" : "")} onClick={tryParentMode}>
            Parents
          </button>
        </div>
      </header>

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
        <ParentView data={data} update={update} showToast={showToast} />
      )}

      {pinGate && (
        <PinGate
          pin={data.pin}
          onSuccess={() => {
            setPinGate(false);
            setMode("parent");
          }}
          onCancel={() => setPinGate(false)}
        />
      )}

      {toast && <div className="fr-toast">{toast}</div>}
    </div>
  );
}

export default App;
