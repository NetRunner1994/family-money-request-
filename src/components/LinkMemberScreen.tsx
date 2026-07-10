import { AVATARS, uid } from "../lib/format";
import type { User } from "../lib/auth";
import type { AppData } from "../types";

// Shown right after a grown-up signs in/up, before they can use the app —
// signing in only proves who someone is; it doesn't by itself add them to
// the family's member list. Without this forced step, people could create
// an account and land in the full parent view while staying invisible to
// everyone else (no name in Settings, not pickable in the Grown-ups tab).
export function LinkMemberScreen({
  data,
  update,
  user,
  showToast,
}: {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  user: User;
  showToast: (msg: string) => void;
}) {
  const linkMe = (memberId: string) => {
    update((d) => {
      d.memberAuth[user.uid] = memberId;
      return d;
    });
    showToast("That's you now 👋");
  };

  const createMe = () => {
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

  return (
    <main className="fr-main">
      <div className="fr-card fr-pad">
        <div className="fr-gate-emoji">🙋</div>
        <h2 className="fr-h2">Which group member are you?</h2>
        <p className="fr-muted">
          One more thing — this makes sure your name (not just your login)
          shows up for the rest of the family.
        </p>
        {data.members.length > 0 && (
          <div className="fr-cats">
            {data.members.map((m) => (
              <button key={m.id} className="fr-cat" onClick={() => linkMe(m.id)}>
                <span>{m.avatar}</span> {m.name}
              </button>
            ))}
          </div>
        )}
        <button className="fr-primary-btn" onClick={createMe}>
          + I&apos;m not in the list — add me
        </button>
      </div>
    </main>
  );
}
