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
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  showToast: (msg: string) => void;
  sync: SyncInfo;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [pinInput, setPinInput] = useState("");

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
        Family members
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
    </div>
  );
}
