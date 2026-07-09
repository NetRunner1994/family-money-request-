import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "family-requests-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || isStandalone() || (!deferred && !isIos())) return null;

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setDeferred(null);
      dismiss();
    } else {
      setShowIosHint(true);
    }
  };

  return (
    <div className="fr-card fr-install">
      <span className="fr-install-emoji">📱</span>
      <div className="fr-install-text">
        <strong>Put this on your home screen</strong>
        {showIosHint
          ? "Tap the Share icon, then “Add to Home Screen.”"
          : "Install Family Tab as an app for one-tap access."}
      </div>
      {!showIosHint && (
        <button className="fr-install-btn" onClick={install}>
          Install
        </button>
      )}
      <button className="fr-install-close" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
