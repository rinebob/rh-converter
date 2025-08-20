# Comments Cloud Functions: Testing Guide

This guide shows how to run end-to-end tests for the comments API using the CLI script `functions/tools/test-comments.js`.

- Backend functions live in `functions/src/comments.ts`:
  - `submitComment`, `editComment`, `deleteComment`, `reportComment`, `adminModeration`
- Test script: `functions/tools/test-comments.js`

---

## Prerequisites

- Node 18+ (Node 22 recommended; matches Functions runtime)
- Firebase CLI installed and logged in
- Project ID: `rh-converter`
- Location: `us-central1`

---

## 1) Run on Emulator (local)

Start emulators (Functions + Auth):

```bash
firebase emulators:start --only functions,auth
```

In a separate terminal, run the test script.

- Minimal (anon + user; skips admin):
```bash
EMULATOR=true node functions/tools/test-comments.js
```

- Full flow with auto admin and second user:
```bash
EMULATOR=true AUTO_ADMIN=true node functions/tools/test-comments.js
```

What happens:
- Uses base URL: `http://127.0.0.1:5001/rh-converter/us-central1`
- Automatically mints:
  - `TOKEN_USER` (User A) via Auth Emulator
  - `TOKEN_USER_2` (User B) via Auth Emulator
  - If `AUTO_ADMIN=true`, elevates User A and refreshes to get `TOKEN_ADMIN`.
- Executes steps:
  1. submitComment (anonymous, top-level)
  2. submitComment (user A, top-level)
  2b. submitComment (user A, reply to parent)
  2c. submitComment (user B, reply to same parent)
  2d. submitComment (contact request, brokerage-request + contactEmail)
  3. editComment (user A, within 15 min window)
  4. reportComment (anonymous)
  5. deleteComment (user A, author)
  6a. adminModeration (remove) — if `TOKEN_ADMIN` present
  6b. adminModeration (restore) — if `TOKEN_ADMIN` present

Environment variables supported:
- `EMULATOR=true`
- `AUTO_ADMIN=true` (optional, emulator-only)
- `TOKEN_USER`, `TOKEN_USER_2`, `TOKEN_ADMIN` (optional; override auto-mint)
- `BASE_URL` (optional override)

---

## 2) Run against Production

By default, the script targets prod when `EMULATOR` is not set:
- Base URL: `https://us-central1-rh-converter.cloudfunctions.net`

Run anon/report-only:
```bash
node functions/tools/test-comments.js
```

To exercise author/admin flows, provide tokens:
```bash
TOKEN_USER=eyJ... TOKEN_USER_2=eyJ... TOKEN_ADMIN=eyJ... \
node functions/tools/test-comments.js
```

### Getting tokens (summary)

- TOKEN_USER / TOKEN_USER_2: sign into your web app and call `auth.currentUser.getIdToken(true)`; or use the Auth REST API (`accounts:signInWithPassword`).
- TOKEN_ADMIN: set `admin: true` custom claim for a user via Admin SDK, then sign in and refresh to get an ID token with the claim.

See the earlier section for details or create a small local admin script as needed.

---

## Notes & Troubleshooting

- ID tokens expire (~1 hour). If you get 401/403, refresh tokens.
- `BASE_URL` can be overridden manually, e.g.:
  ```bash
  BASE_URL=https://us-central1-rh-converter.cloudfunctions.net \
  node functions/tools/test-comments.js
  ```
- Windows PowerShell:
  ```powershell
  $env:TOKEN_USER="eyJ..."; $env:TOKEN_USER_2="eyJ..."; $env:TOKEN_ADMIN="eyJ..."; node functions/tools/test-comments.js
  ```
- Windows CMD:
  ```cmd
  set TOKEN_USER=eyJ... && set TOKEN_USER_2=eyJ... && set TOKEN_ADMIN=eyJ... && node functions\tools\test-comments.js
  ```

---

## What each collection stores

- `comments`: public comment docs (bodies, status, counts, parentId for replies).
- `commentMeta`: private per-comment metadata (uid, ipHash, userAgent, contactEmail) — not readable by clients.
- `commentReports`: private report entries with reason — not readable by clients.

This doc lives at `functions/tools/COMMENTS_TESTING.md`.
