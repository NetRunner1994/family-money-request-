import { useState } from "react";
import { signOutUser, type User } from "../lib/auth";
import type { AppData } from "../types";
import { AvatarPicker } from "./AvatarPicker";
import { EmailAuthForm } from "./EmailAuthForm";

export function AccountSheet({
  data,
  update,
  user,
  kidId,
  kidName,
  canSwitch,
  onSwitchUser,
  showToast,
  onClose,
}: {
  data: AppData | null;
  update: (fn: (d: AppData) => AppData) => void;
  user: User | null;
  kidId?: string | null;
  kidName?: string | null;
  canSwitch?: boolean;
  onSwitchUser?: () => void;
  showToast: (msg: string) => void;
  onClose: () => void;
}) {
  const [editingAvatar, setEditingAvatar] = useState(false);
  const linkedMemberId = user && data ? data.memberAuth[user.uid] : undefined;
  const linkedMember = data?.members.find((m) => m.id === linkedMemberId);
  const kid = kidId && data ? data.kids.find((k) => k.id === kidId) : undefined;

  const changeKidAvatar = (a: string) => {
    if (!kid) return;
    update((d) => {
      const k = d.kids.find((x) => x.id === kid.id);
      if (k) k.avatar = a;
      return d;
    });
    setEditingAvatar(false);
    showToast("Emoji updated 🎨");
  };

  const changeMemberAvatar = (a: string) => {
    if (!linkedMember) return;
    update((d) => {
      const m = d.members.find((x) => x.id === linkedMember.id);
      if (m) m.avatar = a;
      return d;
    });
    setEditingAvatar(false);
    showToast("Emoji updated 🎨");
  };

  return (
    <div className="fr-overlay" onClick={onClose}>
      <div className="fr-card fr-pad fr-account" onClick={(e) => e.stopPropagation()}>
        <h3 className="fr-h3" style={{ marginTop: 0 }}>
          Your account
        </h3>

        {kidName ? (
          <>
            <div className="fr-owed-row">
              {kid && (
                <button
                  className="fr-kid-emoji fr-avatar-edit-btn"
                  onClick={() => setEditingAvatar((v) => !v)}
                  title="Change emoji"
                >
                  {kid.avatar}
                </button>
              )}
              <span className="fr-owed-name">
                You&apos;re using this phone as <strong>{kidName}</strong>.
              </span>
            </div>
            {editingAvatar && kid && <AvatarPicker value={kid.avatar} onChange={changeKidAvatar} />}
            {onSwitchUser && canSwitch && (
              <button className="fr-mini-btn danger" onClick={onSwitchUser} style={{ marginTop: 8 }}>
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
              <>
                <div className="fr-owed-row">
                  <button
                    className="fr-kid-emoji fr-avatar-edit-btn"
                    onClick={() => setEditingAvatar((v) => !v)}
                    title="Change emoji"
                  >
                    {linkedMember.avatar}
                  </button>
                  <span className="fr-owed-name">You are {linkedMember.name}</span>
                </div>
                {editingAvatar && (
                  <AvatarPicker value={linkedMember.avatar} onChange={changeMemberAvatar} />
                )}
              </>
            ) : (
              <p className="fr-muted">
                Close this — you&apos;ll be asked which group member you are.
              </p>
            )}

            <button className="fr-mini-btn danger" onClick={() => signOutUser()} style={{ marginTop: 8 }}>
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
