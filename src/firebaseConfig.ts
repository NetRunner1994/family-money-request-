// -----------------------------------------------------------------------------
// Firebase configuration
// -----------------------------------------------------------------------------
// These values are SAFE to commit — a Firebase web config is public by design;
// your data is protected by the Firestore security rules, not by hiding these.
//
// Until you paste your own project's values here, the app runs in LOCAL-ONLY
// mode: everything works, but data stays on the single device (no cross-phone
// sync). Fill these in to turn on family sync across phones.
//
// Where to get them: Firebase console → Project settings → "Your apps" → the
// web app → "SDK setup and configuration" → Config.
// -----------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// The app treats sync as "available" only once a real apiKey + projectId exist.
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
