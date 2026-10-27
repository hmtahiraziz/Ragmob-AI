# Ragmob

Mobile AI chat app built with **Expo + React Native**. Streaming replies come from a Python **FastAPI** backend, with **Clerk** auth, synced conversation history, personas, and store-ready privacy flows.

> **Expo SDK 58** / **Expo Router**. Runs on iOS and Android via **Expo Go** for email/password auth. Google sign-in needs a development or preview build.

---

## Features

### Chat
- **Streaming replies** — token-by-token responses via `expo/fetch`, with send, stop, loading, streaming cursor, empty, error, and offline states.
- **Image understanding** — attach from the photo library or camera, preview/remove before send; upload via `POST /chat/images`, then stream with `imageId` on `POST /chat/stream`; follow-ups reuse server image context for the same conversation.
- **Voice input** — mic button dictates into the composer (`expo-speech-recognition`); edit the transcript before sending (never auto-sends). Requires a **development / preview build** (not Expo Go).
- **Personas** — General, Coder, Writer, and Coach modes (matched to backend prompts); pick on Home or switch in the chat strip.
- **Markdown** — completed assistant messages render headings, lists, code blocks, quotes, and links; streaming text stays plain until done.
- **Message actions** — long-press to **copy**, **share**, or **regenerate** the latest assistant reply.
- **Quick starts** — Home prompt tiles (summarize, debug, draft email, plan) that open Chat with a prefilled draft.
- **Backend awareness** — health checks surface offline state in chat; connection alerts can notify when the API returns.

### History & sync
- **Local + remote history** — conversations hydrate from `AsyncStorage` and merge with server history when available.
- **History tab** — search by title, persona, or message text; open, rename, or delete sessions; start a new chat.
- **Home recents** — latest conversations at a glance, with jump into Chat.

### Auth & account
- **Clerk email/password** — sign-in, sign-up, email verification, password strength hints, and forgot-password reset.
- **Google SSO** — browser-based OAuth (dev/preview builds; not Expo Go).
- **Secure sessions** — tokens in `expo-secure-store`; signed-in state survives restarts; 401s force sign-out.
- **Protected routing** — `Stack.Protected` swaps `(auth)` and `(tabs)` from Clerk `isSignedIn`.
- **Profile** — edit name, avatar (`expo-image-picker`), and password (including Google accounts that set a password later).
- **Account deletion** — in-app double-confirm wipe (server data + Clerk user + local chat/consent), plus hosted deletion instructions for store listings.

### Privacy & consent
- **Consent gate** — first launch after sign-in requires accepting Terms and Privacy (versioned locally).
- **In-app legal** — Terms of Service and Privacy Policy screens; HTML drafts live under `legal/` for hosting.
- **Delete all chats** — clears device history and requests server deletion.

### UX & quality
- **Four tabs** — Home, Chat, History, Settings.
- **Design system** — light theme with shared tokens (`Colors`, `Spacing`, `Radius`, `Typography`) and a reusable UI kit.
- **Feedback UI** — toasts and dialogs for confirmations and status; error boundary for unexpected crashes.
- **CI** — GitHub Actions runs lint, typecheck, and Expo doctor on push/PR.

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Expo SDK 58, React Native 0.88, React 19 |
| Navigation | Expo Router (file-based, typed routes) |
| Auth | `@clerk/expo` (+ `expo-auth-session` / `expo-web-browser` for Google) |
| Secure storage | `expo-secure-store` |
| Local persistence | `@react-native-async-storage/async-storage` |
| Streaming | `expo/fetch` (`ReadableStream`) → `POST /chat/stream` |
| Markdown | `react-native-markdown-display` |
| Media / clipboard | `expo-image-picker` (avatar + chat images / camera), `expo-image-manipulator`, `expo-clipboard` |
| Speech-to-text | `expo-speech-recognition` (native mic → draft text; dev/preview build) |
| State | React hooks + `useReducer` (`ChatProvider`) |
| Backend | External Python FastAPI service (JWT via Clerk) |

---

## Prerequisites

- Node.js 18+ (CI uses 22)
- npm
- [Expo Go](https://expo.dev/go) or an Android/iOS emulator for day-to-day work
- A running **FastAPI** backend (`/health`, `/chat/stream`, chat-history, account, feedback endpoints)
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
   # FastAPI backend (must include the /api prefix)
   EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:8000/api

   # Clerk publishable key
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

   > Use your machine's **LAN IP** (e.g. `192.168.1.42`), not `localhost`, so a
   > physical phone can reach the backend. Only `EXPO_PUBLIC_*` vars are bundled
   > into the app.

3. **Start the dev server**

   ```bash
   npm start
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

> Google SSO needs a dev/preview build — not Expo Go.

### One-time setup

```bash
npm install -g eas-cli
eas login
eas init                # fills extra.eas.projectId + owner in app.json
```

Set the public env vars the build will inline (don't commit secrets).
**Production / Play builds require HTTPS + `pk_live_`** (enforced in `lib/env.ts`):

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://your-api.example.com/api --environment production
eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_... --environment production
eas env:create --name EXPO_PUBLIC_PRIVACY_POLICY_URL --value https://your.site/privacy --environment production
eas env:create --name EXPO_PUBLIC_TERMS_OF_SERVICE_URL --value https://your.site/terms --environment production
eas env:create --name EXPO_PUBLIC_ACCOUNT_DELETION_URL --value https://your.site/account-deletion --environment production
```

Host the HTML drafts in `legal/` (privacy, terms, account deletion) on HTTPS and paste those
URLs into Play Console / App Store Connect. Android package / iOS bundle ID: **`com.ragmob.app`**.

> A shared build can't reach `http://YOUR_PC_LAN_IP:8000`. For demos, point
> `EXPO_PUBLIC_API_URL` at a publicly reachable backend (deployed, or an
> ngrok/Cloudflare tunnel). Prefer `https://` — release builds reject cleartext API URLs.

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
| `EXPO_PUBLIC_API_URL` | App | FastAPI base URL, **including `/api`**. No trailing slash. HTTPS required in release. |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | App | Clerk publishable key (`pk_test_…` locally / `pk_live_…` in production). |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | App | Hosted privacy policy (store listing + optional deep link). |
| `EXPO_PUBLIC_TERMS_OF_SERVICE_URL` | App | Hosted Terms of Service. |
| `EXPO_PUBLIC_ACCOUNT_DELETION_URL` | App | Hosted account-deletion instructions (Play Console). |
| `EXPO_PUBLIC_SENTRY_DSN` | App | Optional; reserved for a future EAS + Sentry setup (Expo Go uses the in-app error boundary). |

Backend checklist (API env, not the app):

| Variable | Description |
|----------|-------------|
| `AUTH_DISABLED` | `false` to enforce JWT verification. |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint. |
| `CLERK_ISSUER` | Clerk issuer URL for the same Clerk app. |

---

## Project structure

```
app/
  _layout.tsx             # Root: Clerk, theme, consent, protected nav
  profile.tsx             # Name, avatar, password
  privacy-policy.tsx      # In-app privacy policy
  terms-of-service.tsx    # In-app terms
  sso-callback.tsx        # OAuth return route
  (auth)/                 # Sign-in, sign-up, forgot password
  (tabs)/                 # Home, Chat, History, Settings
components/
  auth/                   # Auth screens, Google button, verify email, password strength
  brand/                  # Ragmob mark / wordmark
  chat/                   # Chat window, input, bubbles, personas, markdown, sheets
  consent/                # First-run Terms + Privacy gate
  home/                   # Quick-start prompt tiles
  ui/                     # Screen, Button, Card, TextField, Dialog, Toast, Skeleton, …
hooks/                    # chat-context, use-chat, theme, consent, feedback
lib/
  api/                    # HTTP client, streamChat, history, account, feedback, health
  auth/                   # Clerk helpers, token bridge, session 401 handling
  media/                  # Avatar pick + resize
  monitoring/             # Optional Sentry shim
  storage/                # Chat + consent persistence
  env.ts                  # Public env access + release guards
legal/                    # Hostable HTML for privacy, terms, account deletion
types/chat.ts             # Message, conversation, persona types
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
| `npm run typecheck` | Type-check (`tsc --noEmit`). |
| `npm run ci` | Lint + typecheck (matches CI). |
| `npm run doctor` | Run `expo-doctor`. |
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
- **Google sign-in unavailable in Expo Go** — use
  `eas build --profile development` or `--profile preview`.
- **Chat image attach / camera** — photo library works via the system picker in
  Expo Go; camera needs the `expo-image-picker` permission strings (configured in
  `app.json`). After changing plugins, rebuild native apps (`eas build` /
  `npx expo prebuild`). Backend must support `POST /api/chat/images` + stream `imageId` (see
  AI web kit `docs/ragmob-chat-image-contract.md`).
- **Voice input (mic)** — uses `expo-speech-recognition` (native module). It does
  **not** work in Expo Go. Build with
  `eas build --profile development` or `--profile preview`, install on a device,
  grant microphone + speech recognition permissions, then dictate → edit → send.

---

## Notes

- Auth uses `@clerk/expo` JS flows for Expo Go. Google SSO needs a browser-based
  OAuth flow or a development build.
- Release builds reject `pk_test_` keys, cleartext API URLs, and localhost API hosts
  (`lib/env.ts`).
- Check the versioned Expo docs
  (<https://docs.expo.dev/versions/v58.0.0/>) before adding native modules.
