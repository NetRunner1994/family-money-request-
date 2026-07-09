import { useEffect, useState } from "react";
import { firebaseEnabled } from "../lib/firebase";
import { completeRedirectSignIn, watchAuth, type User } from "../lib/auth";

export interface AuthState {
  /** A real (non-anonymous) signed-in grown-up, or null. */
  user: User | null;
  ready: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) return;
    // Finish a redirect-based sign-in if we came back from one.
    void completeRedirectSignIn();
    const unsub = watchAuth((u) => {
      // Treat anonymous sessions (used for kids / not-signed-in) as "no user".
      setUser(u && !u.isAnonymous ? u : null);
      setReady(true);
    });
    return unsub;
  }, []);

  return { user, ready };
}
