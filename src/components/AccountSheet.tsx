import { signOutUser, type User } from "../lib/auth";
import type { AppData } from "../types";
import { EmailAuthForm } from "./EmailAuthForm";

export function AccountSheet({
  data,
  user,
  kidName,
  canSwitch,
  onSwitchUser,
  showToast,
  onClose,
}: {
  data: AppData | null;
  update: (fn: (d: AppData) => AppData) => void;
  user: User | null;
  kidName?: string | null;
  canSwitch?: boolean;
  onSwitchUser?: () => void;
  showToast: (msg: string) => void;
  onClose: () => void;
}) {
  const linkedMemberId = user && data ? data.memberAuth[user.uid] : undefined;
  const linkedMember = data?.members.find((m) => m.id === linkedMemberId);

  return (
    <div className="fr-overlay" onClick={onClose}>
      <div className="fr-card fr-pad fr-account" onClick={(e) => e.stopPropagation()}>
        <h3 className="fr-h3" style={{ marginTop: 0 }}>
          Your account
        </h3>

        {kidName ? (
          <>
            <p className="fr-muted">
              You&apos;re using this phone as <strong>{kidName}</strong>.
            </p>
            {onSwitchUser && canSwitch && (
              <button className="fr-mini-btn danger" onClick={onSwitchUser}>
                Switch user
              </button>
            )}
          </>
        ) : !user ? (
          <>
            <p className="fr-muted">
              Sign in so the app knows it&apos;s you — no more picking your name,
              and no one else can send requests as you.
            </p>
            <EmailAuthForm showToast={showToast} />
          </>
        ) : (
          <>
            <p className="fr-muted">
              Signed in as <strong>{user.displayName || user.email}</strong>.
            </p>

            {!data ? (
              <p className="fr-muted">Join or start a family to finish setting up who you are.</p>
            ) : linkedMember ? (
              <div className="fr-owed-row">
                <span className="fr-kid-emoji">{linkedMember.avatar}</span>
                <span className="fr-owed-name">You are {linkedMember.name}</span>
              </div>
            ) : (
              <p className="fr-muted">
                Close this — you&apos;ll be asked which group member you are.
              </p>
            )}

            <button className="fr-mini-btn danger" onClick={() => signOutUser()} style={{ marginTop: 4 }}>
              Sign out
            </button>
          </>
        )}

        <button className="fr-ghost-btn" onClick={onClose} style={{ marginBottom: 0 }}>
          Close
        </button>
      </div>
    </div>
  );
}
