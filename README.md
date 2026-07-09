# Family Tab 🪙

A playful money-request tracker for families — kids ask for money with a reason, parents approve or decline, and everyone can see what's owed. Built as an installable PWA so it works like a native app on your phone's home screen, including offline.

## Features

- **Kid mode** — pick your avatar, punch in an amount on a keypad, pick a category, explain why, and send the request.
- **Parent mode** — PIN-protected inbox to approve/decline requests with an optional note, a running "tab" of what's owed, and history.
- **Installable app** — add to your home screen on iOS/Android/desktop; runs standalone, works offline, and persists data on-device via `localStorage`.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL on your phone (same network) or desktop to try it.

## Build

```bash
npm run build
npm run preview
```

`npm run build` also generates the PWA service worker and manifest via `vite-plugin-pwa`.

## Installing on your phone

- **Android/Chrome**: open the site, tap the in-app "Install" banner (or the browser menu → "Add to Home screen").
- **iOS/Safari**: open the site, tap the Share icon, then "Add to Home Screen".

Once installed, the app opens full-screen with no browser chrome, respects the device's safe areas (notches/home indicator), and keeps working offline.
