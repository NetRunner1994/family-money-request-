import { useEffect, useState } from "react";
import { CATEGORIES, fmt, haptic, timeAgo } from "../lib/format";
import type { AppData, Kid, MoneyRequest, RequestStatus } from "../types";
import type { User } from "../lib/auth";
import { FriendsView } from "./FriendsView";
import { RequestCard } from "./RequestCard";
import { Settings, type SyncInfo } from "./Settings";

type Tab = "inbox" | "friends" | "history" | "settings";

export function ParentView({
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
  const [tab, setTab] = useState<Tab>("inbox");
  const pending = data.requests.filter((r) => r.status === "pending").sort((a, b) => a.createdAt - b.createdAt);
  const history = data.requests.filter((r) => r.status !== "pending").sort((a, b) => b.createdAt - a.createdAt);

  const peerPending = data.peerRequests.filter((p) => p.status === "pending").length;

  const kidById = (id: string) => data.kids.find((k) => k.id === id);

  // A family created before this feature has no admin yet — whichever
  // grown-up opens Settings first quietly becomes it, so nobody gets locked
  // out of a family they already run.
  useEffect(() => {
    if (sync.mode === "synced" && !data.adminUid && user) {
      update((d) => {
        if (!d.adminUid) d.adminUid = user.uid;
        return d;
      });
    }
  }, [sync.mode, data.adminUid, user, update]);

  const isAdmin = sync.mode !== "synced" || !data.adminUid || data.adminUid === user?.uid;
  const adminMember = data.members.find((m) => m.id === data.memberAuth[data.adminUid ?? ""]);
  const adminName = adminMember?.name ?? "the family admin";

  const decide = (id: string, status: RequestStatus, note: string) => {
    update((d) => {
      const r = d.requests.find((x) => x.id === id);
      if (r) {
        r.status = status;
        r.parentNote = note?.trim() || null;
        r.decidedAt = Date.now();
      }
      return d;
    });
    haptic(status === "approved" ? [15, 30, 15] : 15);
    showToast(status === "approved" ? "Approved ✅" : "Declined. Stay strong.");
  };

  return (
    <main className="fr-main">
      <div className="fr-tabs">
        <button className={"fr-tab" + (tab === "inbox" ? " on" : "")} onClick={() => setTab("inbox")}>
          Kids {pending.length > 0 && <span className="fr-badge">{pending.length}</span>}
        </button>
        <button className={"fr-tab" + (tab === "friends" ? " on" : "")} onClick={() => setTab("friends")}>
          Grown-ups {peerPending > 0 && <span className="fr-badge">{peerPending}</span>}
        </button>
        <button className={"fr-tab" + (tab === "history" ? " on" : "")} onClick={() => setTab("history")}>
          History
        </button>
        <button className={"fr-tab" + (tab === "settings" ? " on" : "")} onClick={() => setTab("settings")}>
          Settings
        </button>
      </div>

      {tab === "inbox" && (
        <>
          <OwedBoard data={data} update={update} showToast={showToast} />
          {pending.length === 0 ? (
            <div className="fr-card fr-pad fr-empty">
              <div className="fr-done-emoji">🧘</div>
              <p className="fr-muted">Nothing pending. Enjoy the silence, it won&apos;t last.</p>
            </div>
          ) : (
            pending.map((r) => <PendingCard key={r.id} req={r} kid={kidById(r.kidId)} onDecide={decide} />)
          )}
        </>
      )}

      {tab === "friends" && (
        <FriendsView data={data} update={update} showToast={showToast} user={user} />
      )}

      {tab === "history" && (
        <section className="fr-section">
          {history.length === 0 ? (
            <div className="fr-card fr-pad fr-empty">
              <p className="fr-muted">No decisions yet. History shows up here.</p>
            </div>
          ) : (
            history.map((r) => <RequestCard key={r.id} req={r} kid={kidById(r.kidId)} showKid />)
          )}
        </section>
      )}

      {tab === "settings" && (
        <Settings
          data={data}
          update={update}
          showToast={showToast}
          sync={sync}
          isAdmin={isAdmin}
          adminName={adminName}
        />
      )}
    </main>
  );
}

function OwedBoard({
  data,
  update,
  showToast,
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  showToast: (msg: string) => void;
}) {
  const rows = data.kids
    .map((k) => {
      const owed = data.requests
        .filter((r) => r.kidId === k.id && r.status === "approved")
        .reduce((s, r) => s + r.amount, 0);
      return { kid: k, owed };
    })
    .filter((r) => r.owed > 0);

  if (rows.length === 0) return null;

  const markPaid = (kidId: string) => {
    update((d) => {
      d.requests.forEach((r) => {
        if (r.kidId === kidId && r.status === "approved") {
          r.status = "paid";
          r.paidAt = Date.now();
        }
      });
      return d;
    });
    showToast("Marked paid 🤝");
  };

  return (
    <div className="fr-card fr-pad fr-owedboard">
      <h3 className="fr-h3" style={{ marginTop: 0 }}>
        The tab
      </h3>
      {rows.map(({ kid, owed }) => (
        <div key={kid.id} className="fr-owed-row">
          <span className="fr-kid-emoji">{kid.avatar}</span>
          <span className="fr-owed-name">{kid.name}</span>
          <span className="fr-owed-amt">{fmt(owed)}</span>
          <button className="fr-mini-btn" onClick={() => markPaid(kid.id)}>
            Mark paid
          </button>
        </div>
      ))}
    </div>
  );
}

function PendingCard({
  req,
  kid,
  onDecide,
}: {
  req: MoneyRequest;
  kid: Kid | undefined;
  onDecide: (id: string, status: RequestStatus, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const cat = CATEGORIES.find((c) => c.id === req.category);
  return (
    <div className="fr-card fr-receipt">
      <div className="fr-receipt-top">
        <span className="fr-kid-emoji big">{kid?.avatar}</span>
        <div className="fr-receipt-meta">
          <div className="fr-receipt-who">
            <strong>{kid?.name}</strong> is asking for
          </div>
          <div className="fr-receipt-amt">{fmt(req.amount)}</div>
        </div>
        <span className="fr-cat-pill">
          {cat?.emoji} {cat?.label}
        </span>
      </div>
      <div className="fr-receipt-divider" />
      <p className="fr-receipt-reason">&quot;{req.reason}&quot;</p>
      <div className="fr-receipt-time">{timeAgo(req.createdAt)}</div>
      <input
        className="fr-input"
        placeholder="Optional note back (e.g. 'yes but you're doing dishes')"
        value={note}
        maxLength={140}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="fr-decide">
        <button className="fr-decline-btn" onClick={() => onDecide(req.id, "declined", note)}>
          Decline
        </button>
        <button className="fr-approve-btn" onClick={() => onDecide(req.id, "approved", note)}>
          Approve {fmt(req.amount)}
        </button>
      </div>
    </div>
  );
}
