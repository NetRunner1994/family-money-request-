import { useState } from "react";
import { AVATARS, uid } from "../lib/format";
import type { AppData } from "../types";
import type { SyncMode } from "../hooks/useAppData";
import { signInWithApple, signInWithGoogle, signOutUser, type User } from "../lib/auth";
import { firebaseEnabled } from "../lib/firebase";

export interface SyncInfo {
  mode: SyncMode;
  familyCode: string | null;
  leaveFamily: () => void;
}

export function Settings({
  data,
  update,
  showToast,
  sync,
  user,
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  showToast: (msg: string) => void;
  sync: SyncInfo;
  user: User | null;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [pinInput, setPinInput] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberAvatar, setMemberAvatar] = useState(AVATARS[3]);

  const addKid = () => {
    if (!name.trim()) return;
    update((d) => {
      d.kids.push({ id: uid(), name: name.trim(), avatar });
      return d;
    });
    setName("");
    showToast("Kid added");
  };

  const removeKid = (id: string) => {
    update((d) => {
      d.kids = d.kids.filter((k) => k.id !== id);
      d.requests = d.requests.filter((r) => r.kidId !== id);
      return d;
    });
  };

  const addMember = () => {
    if (!memberName.trim()) return;
    update((d) => {
      d.members.push({ id: uid(), name: memberName.trim(), avatar: memberAvatar });
      return d;
    });
    setMemberName("");
    showToast("Added to the group");
  };

  const removeMember = (id: string) => {
    update((d) => {
      d.members = d.members.filter((m) => m.id !== id);
      // Drop peer requests involving this person.
      d.peerRequests = d.peerRequests.filter((p) => p.fromId !== id && p.toId !== id);
      return d;
    });
  };

  const savePin = () => {
    if (pinInput && !/^\d{4}$/.test(pinInput)) {
      showToast("PIN needs to be 4 digits");
      return;
    }
    update((d) => {
      d.pin = pinInput || null;
      return d;
    });
    setPinInput("");
    showToast(pinInput ? "Parent PIN set 🔒" : "PIN removed");
  };

  const linkedMemberId = user ? data.memberAuth[user.uid] : undefined;
  const linkedMember = data.members.find((m) => m.id === linkedMemberId);

  const doSignIn = async (provider: "google" | "apple") => {
    try {
      await (provider === "google" ? signInWithGoogle() : signInWithApple());
    } catch (e) {
      console.error(e);
      showToast("Sign-in didn't work. Try again.");
    }
  };

  const linkMe = (memberId: string) => {
    if (!user) return;
    update((d) => {
      d.memberAuth[user.uid] = memberId;
      return d;
    });
    showToast("That's you now 👋");
  };

  const createMe = () => {
    if (!user) return;
    const newId = uid();
    update((d) => {
      d.members.push({
        id: newId,
        name: user.displayName || user.email?.split("@")[0] || "Me",
        avatar: AVATARS[d.members.length % AVATARS.length],
      });
      d.memberAuth[user.uid] = newId;
      return d;
    });
    showToast("Added you to the group 👋");
  };

  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    if (!sync.familyCode) return;
    try {
      await navigator.clipboard.writeText(sync.familyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the code is on screen to read */
    }
  };

  return (
    <div className="fr-card fr-pad">
      {firebaseEnabled && (
        <>
          <h3 className="fr-h3" style={{ marginTop: 0 }}>
            Your account
          </h3>
          {!user ? (
            <>
              <p className="fr-muted">
                Sign in so the app knows it&apos;s you — no more picking your name,
                and no one else can send requests as you.
              </p>
              <button className="fr-primary-btn" onClick={() => doSignIn("google")}>
                Continue with Google
              </button>
              <button
                className="fr-ghost-btn"
                onClick={() => doSignIn("apple")}
                style={{ marginBottom: 0 }}
              >
                Continue with Apple
              </button>
            </>
          ) : (
            <>
              <p className="fr-muted">
                Signed in as <strong>{user.displayName || user.email}</strong>.
              </p>
              {linkedMember ? (
                <div className="fr-owed-row">
                  <span className="fr-kid-emoji">{linkedMember.avatar}</span>
                  <span className="fr-owed-name">You are {linkedMember.name}</span>
                </div>
              ) : (
                <>
                  <p className="fr-muted">Which group member are you?</p>
                  <div className="fr-cats">
                    {data.members.map((m) => (
                      <button key={m.id} className="fr-cat" onClick={() => linkMe(m.id)}>
                        <span>{m.avatar}</span> {m.name}
                      </button>
                    ))}
                  </div>
                  <button className="fr-ghost-btn" onClick={createMe}>
                    + I&apos;m not in the list — add me
                  </button>
                </>
              )}
              <button
                className="fr-mini-btn danger"
                onClick={() => signOutUser()}
                style={{ marginTop: 4 }}
              >
                Sign out
              </button>
            </>
          )}
          <div style={{ height: 8 }} />
        </>
      )}

      {sync.mode === "synced" && sync.familyCode && (
        <>
          <h3 className="fr-h3" style={{ marginTop: 0 }}>
            Family sync
          </h3>
          <p className="fr-muted">
            This family is synced across phones. Share the code so others can join.
          </p>
          <div className="fr-code-box small">{sync.familyCode}</div>
          <div className="fr-add-row">
            <button className="fr-mini-btn" onClick={copyCode}>
              {copied ? "Copied ✓" : "Copy code"}
            </button>
            <button
              className="fr-mini-btn danger"
              onClick={() => {
                if (window.confirm("Leave this family on this phone? You can rejoin with the code.")) {
                  sync.leaveFamily();
                }
              }}
            >
              Leave family
            </button>
          </div>
        </>
      )}

      <h3 className="fr-h3" style={sync.mode === "synced" ? undefined : { marginTop: 0 }}>
        Kids
      </h3>
      {data.kids.map((k) => (
        <div key={k.id} className="fr-owed-row">
          <span className="fr-kid-emoji">{k.avatar}</span>
          <span className="fr-owed-name">{k.name}</span>
          <button className="fr-mini-btn danger" onClick={() => removeKid(k.id)}>
            Remove
          </button>
        </div>
      ))}
      <div className="fr-avatar-picker" style={{ marginTop: 12 }}>
        {AVATARS.map((a) => (
          <button key={a} className={"fr-avatar-opt" + (avatar === a ? " picked" : "")} onClick={() => setAvatar(a)}>
            {a}
          </button>
        ))}
      </div>
      <div className="fr-add-row">
        <input
          className="fr-input"
          placeholder="New kid's name"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="fr-mini-btn" onClick={addKid}>
          Add
        </button>
      </div>

      <h3 className="fr-h3">Grown-ups &amp; friends</h3>
      <p className="fr-muted">
        People who can request money from each other in the “Grown-ups” tab.
      </p>
      {data.members.map((m) => (
        <div key={m.id} className="fr-owed-row">
          <span className="fr-kid-emoji">{m.avatar}</span>
          <span className="fr-owed-name">{m.name}</span>
          <button className="fr-mini-btn danger" onClick={() => removeMember(m.id)}>
            Remove
          </button>
        </div>
      ))}
      <div className="fr-avatar-picker" style={{ marginTop: 12 }}>
        {AVATARS.map((a) => (
          <button
            key={a}
            className={"fr-avatar-opt" + (memberAvatar === a ? " picked" : "")}
            onClick={() => setMemberAvatar(a)}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="fr-add-row">
        <input
          className="fr-input"
          placeholder="Grown-up or friend's name"
          value={memberName}
          maxLength={20}
          onChange={(e) => setMemberName(e.target.value)}
        />
        <button className="fr-mini-btn" onClick={addMember}>
          Add
        </button>
      </div>

      <h3 className="fr-h3">Parent PIN</h3>
      <p className="fr-muted">
        {data.pin
          ? "A PIN is set. Kids can't sneak into parent mode."
          : "No PIN yet. Any kid can tap into parent mode and approve their own requests. You've been warned."}
      </p>
      <div className="fr-add-row">
        <input
          className="fr-input"
          placeholder={data.pin ? "New 4-digit PIN (blank to remove)" : "4-digit PIN"}
          value={pinInput}
          inputMode="numeric"
          maxLength={4}
          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
        />
        <button className="fr-mini-btn" onClick={savePin}>
          Save
        </button>
      </div>

      <p className="fr-muted" style={{ marginTop: 20, marginBottom: 0, fontSize: 12 }}>
        To save space, paid and declined requests are cleared automatically after
        3 months. Pending requests and unpaid balances are always kept.
      </p>
    </div>
  );
}
