# AI Mobile Kit (`ragmob`)

A reusable **Expo + React Native** starter for AI apps. It ships with streaming
LLM chat wired to a Python **FastAPI RAG backend**, **Clerk** authentication with
secure token storage, and a themed (light/dark) reusable UI kit.

> Built on **Expo SDK 54** / **Expo Router v6**. Runs on iOS and Android via
> **Expo Go** (no native build required for the email/password auth flow).

---

## Features

- **Streaming chat** — token-by-token responses from the backend via `expo/fetch`,
  with loading, streaming (blinking cursor), empty, error, and offline states.
- **Persistent history** — conversations are saved to `AsyncStorage` and survive
  app restarts (debounced writes, bounded storage, auto-migration from older data).
- **Multiple conversations** — a history bottom sheet to switch, start a "New chat",
  rename (long-press), and delete past sessions.
- **Message actions** — long-press any message to **copy** (`expo-clipboard`),
  **share** (native share sheet), or **regenerate** the latest assistant reply.
- **Markdown rendering** — completed assistant replies render rich Markdown
  (headings, lists, code blocks, inline code, blockquotes, links); streaming text
  stays plain until complete.
- **Skeleton loading** — animated placeholder bubbles while chat history hydrates.
- **Authentication** — Clerk email/password sign-in & sign-up with email
  verification and a confirm-password field. Tokens are persisted in
  `expo-secure-store`; logged-in state survives restarts.
- **Profile editing** — update display name, change avatar (`expo-image-picker`),
  and change password via Clerk from a dedicated profile screen.
- **Protected routing** — `Stack.Protected` guards swap between the `(auth)` and
  `(tabs)` groups based on Clerk's `isSignedIn`.
- **Theming** — System / Light / Dark with persistence (`AsyncStorage`) and
  centralized design tokens (`Colors`, `Spacing`, `Radius`, `Typography`).
- **Reusable UI kit** — `Screen`, `Button`, `Card`, `TextField`, `Banner`,
  `ListItem`, `Divider`, `Spinner`, `EmptyState`, `IconButton`, `Skeleton`.
- **Backend health** — live status indicator in Settings via the `/health` endpoint,
  with auto-retry while offline and re-check on app foreground.

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| Navigation | Expo Router v6 (file-based, typed routes) |
| Auth | `@clerk/clerk-expo` v2 (Expo Go compatible) |
| Secure storage | `expo-secure-store` |
| Local persistence | `@react-native-async-storage/async-storage` |
| Streaming | `expo/fetch` (`ReadableStream`) |
| Markdown | `react-native-markdown-display` |
| Media / clipboard | `expo-image-picker`, `expo-clipboard` |
| State | React hooks + `useReducer` |
| Backend | External Python FastAPI RAG service |

---

## Prerequisites

- Node.js 18+
- npm
- [Expo Go](https://expo.dev/go) on a physical device, or an Android/iOS emulator
- A running **FastAPI RAG backend** (provides `/health`, `/query/stream`, etc.)
- A **Clerk** application (publishable key)

---

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy the example and fill in your values:

   ```bash
   cp .env.example .env
   ```

   ```bash
   # FastAPI RAG backend (must include the /api prefix)
   EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:8000/api

   # Clerk publishable key
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

   > Use your machine's **LAN IP** (e.g. `192.168.1.42`), not `localhost`, so a
   > physical phone can reach the backend. Only `EXPO_PUBLIC_*` vars are bundled
   > into the app.

3. **Start the dev server**

   ```bash
   npx expo start
   ```

   Scan the QR code with Expo Go. If your phone and PC are on the same Wi‑Fi,
   skip `--tunnel`. Use `npx expo start --clear` if changes aren't reflecting.

---

## Building & sharing (EAS)

The repo ships an `eas.json` with three profiles: **development** (dev client),
**preview** (shareable Android APK / internal iOS), and **production** (store builds).

### Expo Go (no build)

Fastest path for the email/password flow:

```bash
npx expo start          # add --tunnel to share off your LAN
```

Scan the QR with Expo Go.

> Google SSO and other native flows need a dev/preview build — not Expo Go.

### One-time setup

```bash
npm install -g eas-cli
eas login
eas init                # fills extra.eas.projectId + owner in app.json
```

Set the public env vars the build will inline (don't commit secrets):

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://your-api.example.com/api
eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_test_...
```

> A shared build can't reach `http://YOUR_PC_LAN_IP:8000`. For demos, point
> `EXPO_PUBLIC_API_URL` at a publicly reachable backend (deployed, or an
> ngrok/Cloudflare tunnel). Prefer `https://` — Android release builds block
> cleartext HTTP by default.

### Android APK (shareable demo)

```bash
eas build --profile preview --platform android
```

EAS returns a URL hosting an installable **.apk**. Share it; testers enable
"Install unknown apps" and tap to install.

### iOS (TestFlight)

```bash
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

Requires a paid Apple Developer account. After processing in App Store Connect,
add testers under **TestFlight**. For ad-hoc device installs without TestFlight,
use `--profile preview` with registered UDIDs (`eas device:create`).

### Production (Play Store)

```bash
eas build --profile production --platform android
eas submit --profile production --platform android
```

---

## Environment variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | App | FastAPI base URL, **including `/api`**. No trailing slash. |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | App | Clerk publishable key (`pk_test_…` / `pk_live_…`). |

The following are read by the **Python backend** (not the app) to verify Clerk JWTs:

| Variable | Description |
|----------|-------------|
| `AUTH_DISABLED` | `false` to enforce JWT verification. |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint, e.g. `https://<your>.clerk.accounts.dev/.well-known/jwks.json`. |
| `CLERK_ISSUER` | Clerk issuer, e.g. `https://<your>.clerk.accounts.dev`. |

---


---

## Project structure

```
app/
  _layout.tsx          # Root: ClerkProvider, theme, protected navigator
  profile.tsx          # Profile editor (name, avatar, password)
  (auth)/              # Sign-in / sign-up (shown when signed out)
  (tabs)/              # Chat + Settings (shown when signed in)
components/
  auth/                # AuthHeader
  chat/                # ChatWindow, MessageBubble, ChatInput, ConversationSheet,
                       #   MessageActionSheet, MarkdownMessage
  ui/                  # Reusable kit (Button, Card, Banner, TextField, Skeleton, …)
constants/theme.ts     # Design tokens (Colors, Spacing, Radius, Typography)
hooks/                 # use-chat, use-health, use-theme, use-register-auth-token
lib/
  api/                 # client, rag (streamQuery), types
  auth/                # Clerk token bridge
  storage/             # Persisted chat conversations
  env.ts               # Public env access
types/chat.ts          # Chat message/citation/conversation types
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo dev server. |
| `npm run android` | Build & run on Android (dev build). |
| `npm run ios` | Build & run on iOS (dev build). |
| `npm run web` | Run in the browser. |
| `npm run lint` | Run ESLint (`expo lint`). |
| `npx tsc --noEmit` | Type-check the project. |
| `eas build --profile preview --platform android` | Build a shareable APK. |
| `eas build --profile production --platform ios` | Build for TestFlight / App Store. |

---

## Troubleshooting

- **"Backend is offline" in chat** — the `/health` call failed. Verify the backend
  is running, `EXPO_PUBLIC_API_URL` points to your current LAN IP (with `/api`),
  and your phone is on the same network. Test with
  `curl http://YOUR_PC_LAN_IP:8000/api/health`.
- **UI changes not reflecting** — restart Metro with `npx expo start --clear`,
  then reload the app (press `r`, or shake → Reload).
- **`ngrok tunnel took too long`** — skip `--tunnel` and use LAN, or retry after
  disabling VPN/proxy.
- **"Password found in a data breach" on sign-up** — Clerk blocks compromised
  passwords; choose a stronger unique one (toggle the setting in the Clerk
  Dashboard for local testing only).
- **Clerk "development keys" warning** — expected with `pk_test_…`; use a
  `pk_live_…` key for production.

---

## Notes

- Auth uses `@clerk/clerk-expo` **v2** for Expo Go compatibility (JS-only flows).
  Social logins (e.g. Google) need a browser-based SSO flow or a development build.
- Per `AGENTS.md`, always check the versioned Expo docs
  (<https://docs.expo.dev/versions/v54.0.0/>) before adding native code.
