import { useState } from "react";
import { AVATARS, uid } from "../lib/format";
import type { AppData } from "../types";
import type { SyncMode } from "../hooks/useAppData";

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
  isAdmin,
  adminName,
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  showToast: (msg: string) => void;
  sync: SyncInfo;
  isAdmin: boolean;
  adminName: string;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [newKidPin, setNewKidPin] = useState("");
  const [pinInput, setPinInput] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberAvatar, setMemberAvatar] = useState(AVATARS[3]);

  const addKid = () => {
    if (!name.trim()) return;
    if (sync.mode === "synced" && !/^\d{4}$/.test(newKidPin)) {
      showToast("Give this kid a 4-digit PIN so only they can sign in as themselves");
      return;
    }
    update((d) => {
      d.kids.push({ id: uid(), name: name.trim(), avatar, pin: newKidPin || null });
      return d;
    });
    setName("");
    setNewKidPin("");
    showToast("Kid added");
  };

  const removeKid = (id: string) => {
    update((d) => {
      d.kids = d.kids.filter((k) => k.id !== id);
      d.requests = d.requests.filter((r) => r.kidId !== id);
      return d;
    });
  };

  const setKidPin = (id: string, pin: string) => {
    update((d) => {
      const k = d.kids.find((x) => x.id === id);
      if (k) k.pin = pin || null;
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

  // Native confirm()/alert() dialogs are unreliable inside installed PWAs on
  // some mobile browsers (silently suppressed, so nothing visibly happens) —
  // these use plain in-app confirm steps instead so the action can't
  // silently no-op.
  const [confirmingAdminUid, setConfirmingAdminUid] = useState<string | null>(null);

  const makeAdmin = (newUid: string, name: string) => {
    update((d) => {
      d.adminUid = newUid;
      return d;
    });
    setConfirmingAdminUid(null);
    showToast(`${name} is now the family admin 👑`);
  };

  // Only grown-ups who've actually signed in and linked themselves to a
  // member can be handed admin — never someone who's just listed as a
  // member but hasn't proven who they are.
  const otherLinkedGrownups = Object.entries(data.memberAuth)
    .filter(([signInUid]) => signInUid !== data.adminUid)
    .map(([signInUid, memberId]) => ({
      signInUid,
      member: data.members.find((m) => m.id === memberId),
    }))
    .filter((x): x is { signInUid: string; member: NonNullable<typeof x.member> } => !!x.member);

  const [confirmingLeave, setConfirmingLeave] = useState(false);

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
      {sync.mode === "synced" && (
        <div className={"fr-admin-badge" + (isAdmin ? "" : " not-admin")}>
          {isAdmin ? "👑 You're the family admin" : `👑 ${adminName} is the family admin`}
        </div>
      )}

      {sync.mode === "synced" && isAdmin && (
        <>
          <h3 className="fr-h3" style={{ marginTop: 0 }}>
            Make someone else admin
          </h3>
          {otherLinkedGrownups.length === 0 ? (
            <p className="fr-muted">
              No one else has signed in and identified themselves yet. Once they
              sign in and pick who they are, you can make them admin here.
            </p>
          ) : (
            <>
              <p className="fr-muted">
                Only grown-ups who&apos;ve signed in can become admin.
              </p>
              {otherLinkedGrownups.map(({ signInUid, member }) =>
                confirmingAdminUid === signInUid ? (
                  <div key={signInUid} className="fr-confirm-row">
                    <span className="fr-muted" style={{ margin: 0 }}>
                      Make {member.name} admin? You&apos;ll lose admin unless they hand it back.
                    </span>
                    <div className="fr-add-row">
                      <button className="fr-mini-btn" onClick={() => setConfirmingAdminUid(null)}>
                        Cancel
                      </button>
                      <button className="fr-mini-btn danger" onClick={() => makeAdmin(signInUid, member.name)}>
                        Yes, make admin
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={signInUid} className="fr-owed-row">
                    <span className="fr-kid-emoji">{member.avatar}</span>
                    <span className="fr-owed-name">{member.name}</span>
                    <button className="fr-mini-btn" onClick={() => setConfirmingAdminUid(signInUid)}>
                      Make admin
                    </button>
                  </div>
                )
              )}
            </>
          )}
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
          {confirmingLeave ? (
            <div className="fr-confirm-row">
              <span className="fr-muted" style={{ margin: 0 }}>
                Leave this family on this phone? You can rejoin with the code above.
              </span>
              <div className="fr-add-row">
                <button className="fr-mini-btn" onClick={() => setConfirmingLeave(false)}>
                  Cancel
                </button>
                <button className="fr-mini-btn danger" onClick={() => sync.leaveFamily()}>
                  Yes, leave
                </button>
              </div>
            </div>
          ) : (
            <div className="fr-add-row">
              <button className="fr-mini-btn" onClick={copyCode}>
                {copied ? "Copied ✓" : "Copy code"}
              </button>
              <button className="fr-mini-btn danger" onClick={() => setConfirmingLeave(true)}>
                Leave family
              </button>
            </div>
          )}
        </>
      )}

      <h3 className="fr-h3" style={sync.mode === "synced" ? undefined : { marginTop: 0 }}>
        Kids
      </h3>
      {sync.mode === "synced" && isAdmin && (
        <p className="fr-muted">
          Give each kid a 4-digit PIN so only they can use the app as themselves
          on their own phone.
        </p>
      )}
      {!isAdmin && (
        <p className="fr-muted">Only {adminName} can add, remove, or change kids.</p>
      )}
      {data.kids.map((k) => (
        <div key={k.id} className="fr-owed-row">
          <span className="fr-kid-emoji">{k.avatar}</span>
          <span className="fr-owed-name">
            {k.name}
            {sync.mode === "synced" && !k.pin && (
              <span className="fr-no-pin-warning"> ⚠️ no PIN set</span>
            )}
          </span>
          {sync.mode === "synced" && isAdmin && (
            <input
              className={"fr-input fr-kid-pin" + (k.pin ? "" : " warn")}
              placeholder="PIN"
              value={k.pin ?? ""}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setKidPin(k.id, e.target.value.replace(/\D/g, ""))}
            />
          )}
          {isAdmin && (
            <button className="fr-mini-btn danger" onClick={() => removeKid(k.id)}>
              Remove
            </button>
          )}
        </div>
      ))}
      {isAdmin && (
        <>
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
            {sync.mode === "synced" && (
              <input
                className="fr-input fr-kid-pin"
                placeholder="PIN"
                value={newKidPin}
                inputMode="numeric"
                maxLength={4}
                onChange={(e) => setNewKidPin(e.target.value.replace(/\D/g, ""))}
              />
            )}
            <button className="fr-mini-btn" onClick={addKid}>
              Add
            </button>
          </div>
        </>
      )}

      <h3 className="fr-h3">Grown-ups &amp; friends</h3>
      <p className="fr-muted">
        People who can request money from each other in the “Grown-ups” tab.
        {!isAdmin && ` Only ${adminName} can add or remove people here.`}
      </p>
      {data.members.map((m) => (
        <div key={m.id} className="fr-owed-row">
          <span className="fr-kid-emoji">{m.avatar}</span>
          <span className="fr-owed-name">{m.name}</span>
          {isAdmin && (
            <button className="fr-mini-btn danger" onClick={() => removeMember(m.id)}>
              Remove
            </button>
          )}
        </div>
      ))}
      {isAdmin && (
        <>
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
        </>
      )}

      {sync.mode !== "synced" && (
        <>
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
        </>
      )}

      <p className="fr-muted" style={{ marginTop: 20, marginBottom: 0, fontSize: 12 }}>
        To save space, paid and declined requests are cleared automatically after
        3 months. Pending requests and unpaid balances are always kept.
      </p>
    </div>
  );
}
