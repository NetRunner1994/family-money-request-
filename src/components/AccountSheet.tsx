import { AVATARS, uid } from "../lib/format";
import { signInWithApple, signInWithGoogle, signOutUser, type User } from "../lib/auth";
import type { AppData } from "../types";

export function AccountSheet({
  data,
  update,
  user,
  showToast,
  onClose,
}: {
  data: AppData | null;
  update: (fn: (d: AppData) => AppData) => void;
  user: User | null;
  showToast: (msg: string) => void;
  onClose: () => void;
}) {
  const members = data?.members ?? [];
  const linkedMemberId = user && data ? data.memberAuth[user.uid] : undefined;
  const linkedMember = members.find((m) => m.id === linkedMemberId);

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

  return (
    <div className="fr-overlay" onClick={onClose}>
      <div className="fr-card fr-pad fr-account" onClick={(e) => e.stopPropagation()}>
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
            <button className="fr-ghost-btn" onClick={() => doSignIn("apple")}>
              Continue with Apple
            </button>
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
              <>
                <p className="fr-muted">Which group member are you?</p>
                {members.length > 0 && (
                  <div className="fr-cats">
                    {members.map((m) => (
                      <button key={m.id} className="fr-cat" onClick={() => linkMe(m.id)}>
                        <span>{m.avatar}</span> {m.name}
                      </button>
                    ))}
                  </div>
                )}
                <button className="fr-ghost-btn" onClick={createMe}>
                  + I&apos;m not in the list — add me
                </button>
              </>
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
