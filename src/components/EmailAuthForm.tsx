import { useState } from "react";
import { authErrorMessage, resetPassword, signInWithEmail, signUpWithEmail } from "../lib/auth";

type Mode = "signin" | "signup";

export function EmailAuthForm({ showToast }: { showToast: (msg: string) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      showToast("Enter your email and password.");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      showToast("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(trimmedEmail, password);
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
    } catch (e) {
      showToast(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast("Type your email above first, then tap this again.");
      return;
    }
    try {
      await resetPassword(trimmedEmail);
      showToast("Check your email for a password reset link.");
    } catch (e) {
      showToast(authErrorMessage(e));
    }
  };

  return (
    <div>
      <input
        className="fr-input"
        placeholder="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="fr-input"
        style={{ marginTop: 8 }}
        placeholder="Password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {mode === "signup" && (
        <input
          className="fr-input"
          style={{ marginTop: 8 }}
          placeholder="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      )}
      <button className="fr-primary-btn" style={{ marginTop: 12 }} disabled={busy} onClick={submit}>
        {mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <div className="fr-auth-links">
        <button
          className="fr-link-btn"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
        {mode === "signin" && (
          <button className="fr-link-btn" onClick={forgotPassword}>
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
