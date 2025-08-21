# Admin ID Token Helper: README

This guide explains how to use `functions/tools/get-admin-id-token.ts` to mint a Firebase Auth ID token that includes `{ admin: true }` for testing admin-only HTTPS functions.

- Source: `functions/tools/get-admin-id-token.ts`
- Primary use cases:
  - Generate `TOKEN_ADMIN` for local emulator tests
  - Manually verify admin-guarded endpoints

---

## What the script does

When run, the script:
1. Targets the Firebase Auth Emulator by setting `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.
2. Initializes the Admin SDK with `projectId: 'rh-converter'`.
3. Ensures an admin-capable user exists with UID `admin-user-1`.
4. Sets a custom claim `{ admin: true }` on that UID.
5. Uses the Web Client SDK (pointing at the emulator) to sign in with a custom token.
6. Prints the freshly minted ID token to stdout.

---

## Prerequisites

- Node 18+ (Node 22 recommended; matches Functions runtime)
- Firebase CLI installed and logged in
- Project ID: `rh-converter`
- Location: `us-central1`
- Firebase Emulators running for Functions and Auth

Start emulators:

```bash
firebase emulators:start --only functions,auth
```

---

## Usage (Emulator)

Run with ts-node or compile then run with node. Easiest is ts-node via npx:

```bash
# From repo root
npx ts-node functions/tools/get-admin-id-token.ts
```

On success, it prints an ID token (a long `eyJ...` string) to stdout.

You can store it in an environment variable for other tools:

```bash
# macOS/Linux
TOKEN_ADMIN=$(npx ts-node functions/tools/get-admin-id-token.ts)
export TOKEN_ADMIN

# Windows PowerShell
$env:TOKEN_ADMIN = (npx ts-node functions/tools/get-admin-id-token.ts)

# Windows CMD
for /f "usebackq delims=" %i in (`npx ts-node functions/tools/get-admin-id-token.ts`) do set TOKEN_ADMIN=%i
```

Use it to call admin endpoints, e.g. with curl:

```bash
BASE_URL=http://127.0.0.1:5001/rh-converter/us-central1
curl -s -H "Authorization: Bearer $TOKEN_ADMIN" "$BASE_URL/listBrokerageRequests"
```

---

## Usage (Production) — Notes

This script is tailored for the Auth Emulator and will not work against production as-is because it explicitly sets `FIREBASE_AUTH_EMULATOR_HOST` and uses a fake client app config.

To obtain a production admin token:
1. Use the Admin SDK with Application Default Credentials to set `{ admin: true }` on a known UID.
2. Sign in that user via your normal client (web/app) or REST API, then copy the fresh `idToken`.

See `functions/tools/COMMENTS_TESTING.md` section “Getting tokens (detailed)” for production token workflows.

---

## Parameters and constants

- UID used: `admin-user-1`
- Emulator Host: `127.0.0.1:9099`
- Project ID: `rh-converter`
- Output: A single line ID token printed to stdout

You can tweak the UID or project by editing `functions/tools/get-admin-id-token.ts`.

---

## Troubleshooting

- No emulators running / connection refused:
  - Ensure `firebase emulators:start --only functions,auth` is running.
- Token rejected by HTTPS function:
  - Verify you are calling the emulator base URL for local tests:
    - `http://127.0.0.1:5001/rh-converter/us-central1/<functionName>`
  - Ensure your function checks for `{ admin: true }` in the decoded token claims.
- Token expired:
  - Re-run the script to mint a fresh token (tokens expire in ~1 hour).
- Windows quoting issues:
  - Prefer PowerShell examples above; CMD env handling differs.

---

## Example end-to-end (Emulator)

```bash
# 1) Start emulators
firebase emulators:start --only functions,auth

# 2) Mint admin token
TOKEN_ADMIN=$(npx ts-node functions/tools/get-admin-id-token.ts)

# 3) Call an admin-only endpoint
BASE_URL=http://127.0.0.1:5001/rh-converter/us-central1
curl -s -H "Authorization: Bearer $TOKEN_ADMIN" "$BASE_URL/listBrokerageRequests" | jq
```

---

This doc lives at `functions/tools/GET_ADMIN_ID_TOKEN.md`. The helper script is `functions/tools/get-admin-id-token.ts`. Use it for local admin testing only.
