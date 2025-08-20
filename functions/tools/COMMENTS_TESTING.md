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

### Getting tokens (detailed)

There are two common ways to obtain tokens for production tests.

- Anonymous/author flows: sign in with Email/Password using Firebase Auth REST API and copy the `idToken`.
- Admin flows: assign `admin: true` custom claims to a user with the Admin SDK, then sign in and use the refreshed `idToken`.

#### A) Email/Password sign-in via REST (Production)

1) Find your Web API key in Firebase Console > Project Settings > General.

2) PowerShell example (Windows):
```powershell
# Set API key (replace with your real key)
$API_KEY = "YOUR_WEB_API_KEY"

# Choose credentials for a test user (must exist in Firebase Auth)
$body = @{ email = "test@user.com"; password = "aaabbb"; returnSecureToken = $true } | ConvertTo-Json

# Call REST endpoint
$resp = Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$API_KEY" -ContentType "application/json" -Body $body

# Extract the ID token
$resp.idToken

# Optional: set for the test script
$env:TOKEN_USER = $resp.idToken
```

3) Bash example (macOS/Linux):
```bash
API_KEY="YOUR_WEB_API_KEY"
EMAIL="test@user.com"
PASSWORD="aaabbb"

ID_TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"returnSecureToken\":true}" \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$API_KEY" | jq -r .idToken)

echo "$ID_TOKEN"
# Optional: export for the test script
export TOKEN_USER="$ID_TOKEN"
```

4) Run tests with the token(s):
```powershell
# PowerShell
$env:TOKEN_USER = "$ID_TOKEN"; node functions\tools\test-comments.js
```
```bash
# Bash
TOKEN_USER="$ID_TOKEN" node functions/tools/test-comments.js
```

#### B) Grant admin claim and obtain TOKEN_ADMIN (Production)

You need to set a custom claim on a known user UID, then sign in to obtain an ID token that carries `{ admin: true }`.

1) Set the admin claim using the Admin SDK in a one-liner:
```powershell
# From project root or functions directory
node -e "const {initializeApp,applicationDefault}=require('firebase-admin/app');const {getAuth}=require('firebase-admin/auth');initializeApp({credential:applicationDefault(),projectId:'rh-converter'});getAuth().setCustomUserClaims('UID_HERE',{admin:true}).then(()=>console.log('Done')).catch(e=>console.error(e))"
```
- Replace `UID_HERE` with the target user’s UID.
- If you see an error about project ID, include `projectId:'rh-converter'` or set `$env:GOOGLE_CLOUD_PROJECT="rh-converter"` first.

2) Sign in that same user and copy the fresh `idToken` (use the REST steps from A). Set it as `TOKEN_ADMIN`:
```powershell
$env:TOKEN_ADMIN = "$ID_TOKEN"  # must be the token from the user that has admin:true claim
```

3) Run the full test:
```powershell
$env:TOKEN_USER = "$ID_TOKEN"; $env:TOKEN_ADMIN = "$ID_TOKEN"; node functions\tools\test-comments.js
```

- You can also use a second non-admin user for reply tests:
```powershell
$env:TOKEN_USER_2 = "<idToken-of-userB>"
```

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
  $env:TOKEN_USER="eyJ..."; $env:TOKEN_USER_2="eyJ..."; $env:TOKEN_ADMIN="eyJ..."; node functions\tools\test-comments.js
  ```
- Windows CMD:
  ```cmd
  set TOKEN_USER=eyJ... && set TOKEN_USER_2=eyJ... && set TOKEN_ADMIN=eyJ... && node functions\tools\test-comments.js
  ```
- Common REST error 400: ensure the email/password exist in Firebase Auth and that `$API_KEY` is the Web API key from Project Settings.
- Admin claim not recognized: ensure you signed in after setting the claim, so the new token includes `{ admin: true }`.

---

## What each collection stores

- `comments`: public comment docs (bodies, status, counts, parentId for replies).
- `commentMeta`: private per-comment metadata (uid, ipHash, userAgent, contactEmail) — not readable by clients.
- `commentReports`: private report entries with reason — not readable by clients.

This doc lives at `functions/tools/COMMENTS_TESTING.md`.
