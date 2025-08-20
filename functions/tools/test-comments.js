#!/usr/bin/env node
/*
  CLI test for comment Cloud Functions.
  Works with emulator or deployed endpoints.

  Env vars:
    EMULATOR=true              # use emulator (default false)
    PROJECT_ID=rh-converter    # defaults to 'rh-converter'
    LOCATION=us-central1       # defaults to 'us-central1'

    BASE_URL=https://...       # optional override full base URL (without trailing slash)

    TOKEN_USER=eyJhbGci...     # optional Firebase ID token for author actions (User A)
    TOKEN_USER_2=eyJhbGci...   # optional second Firebase ID token (User B, for reply tests)
    TOKEN_ADMIN=eyJhbGci...    # optional Firebase ID token with admin: true claim
    AUTO_ADMIN=true            # when EMULATOR=true and TOKEN_ADMIN missing, elevate minted anon user to admin

  Run examples:
    # Emulator (ensure `firebase emulators:start --only functions,auth` is running):
    EMULATOR=true node functions/tools/test-comments.js

    # Emulator with auto-admin:
    EMULATOR=true AUTO_ADMIN=true node functions/tools/test-comments.js

    # Production (defaults to rh-converter in us-central1):
    node functions/tools/test-comments.js
    # Or explicitly:
    BASE_URL=https://us-central1-rh-converter.cloudfunctions.net node functions/tools/test-comments.js
*/

const DEFAULT_PROJECT_ID = 'rh-converter';
const DEFAULT_LOCATION = 'us-central1';

const LOCATION = process.env.LOCATION || DEFAULT_LOCATION;
const EMULATOR = /^true$/i.test(process.env.EMULATOR || '');
const PROJECT_ID = process.env.PROJECT_ID || DEFAULT_PROJECT_ID;
const BASE_URL = process.env.BASE_URL || (EMULATOR
  ? `http://127.0.0.1:5001/${PROJECT_ID}/${LOCATION}`
  : `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net`);

let TOKEN_USER = process.env.TOKEN_USER || '';
let TOKEN_USER_2 = process.env.TOKEN_USER_2 || '';
let TOKEN_ADMIN = process.env.TOKEN_ADMIN || '';
const AUTO_ADMIN = /^true$/i.test(process.env.AUTO_ADMIN || '');

if (!BASE_URL) {
  console.error('Missing BASE_URL. Set EMULATOR=true and PROJECT_ID, or set BASE_URL explicitly.');
  process.exit(1);
}

/**
 * Basic helper to call a function endpoint.
 */
async function callFn(name, method, body, token) {
  const url = `${BASE_URL}/${name}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${name} ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Auth Emulator helpers (only used when EMULATOR=true)
 */
const AUTH_BASE = 'http://127.0.0.1:9099';
async function mintAnonymous() {
  const res = await fetch(`${AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=any`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`mintAnonymous failed: ${res.status} ${JSON.stringify(json)}`);
  return { idToken: json.idToken, refreshToken: json.refreshToken, localId: json.localId };
}

// Requires admin privileges in the emulator: use Authorization: Bearer owner and localId
async function setAdminClaim(localId) {
  const res = await fetch(`${AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:update?key=any`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer owner',
    },
    body: JSON.stringify({ localId, customAttributes: JSON.stringify({ admin: true }) }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`setAdminClaim failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function refreshIdToken(refreshToken) {
  const res = await fetch(`${AUTH_BASE}/securetoken.googleapis.com/v1/token?key=any`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`refreshIdToken failed: ${res.status} ${JSON.stringify(json)}`);
  return json; // contains id_token
}

async function main() {
  console.log('Using base URL:', BASE_URL);

  // Auto-mint tokens when using emulator
  let refreshTokenLocal = '';
  let localIdLocal = '';
  if (EMULATOR && !TOKEN_USER) {
    const anon = await mintAnonymous();
    TOKEN_USER = anon.idToken;
    refreshTokenLocal = anon.refreshToken;
    localIdLocal = anon.localId;
    console.log('Minted anonymous TOKEN_USER via Auth Emulator (User A).');
  }
  // For reply-by-another-user scenarios, mint a second user if not provided
  if (EMULATOR && !TOKEN_USER_2) {
    const anonB = await mintAnonymous();
    TOKEN_USER_2 = anonB.idToken;
    console.log('Minted anonymous TOKEN_USER_2 via Auth Emulator (User B).');
  }

  if (EMULATOR && !TOKEN_ADMIN && AUTO_ADMIN && (localIdLocal || TOKEN_USER)) {
    if (!localIdLocal || !refreshTokenLocal) {
      // If TOKEN_USER came from env without localId/refresh token, mint a fresh anon for admin
      const anon2 = await mintAnonymous();
      TOKEN_USER = TOKEN_USER || anon2.idToken;
      refreshTokenLocal = anon2.refreshToken;
      localIdLocal = anon2.localId;
    }
    await setAdminClaim(localIdLocal);
    const refreshed = await refreshIdToken(refreshTokenLocal);
    TOKEN_ADMIN = refreshed.id_token;
    console.log('Elevated user to admin and minted TOKEN_ADMIN via Auth Emulator.');
  }

  // 1) Anonymous submit (top-level)
  console.log('\n1) submitComment (anonymous, top-level)');
  const sub1 = await callFn('submitComment', 'POST', {
    content: 'Hello from anonymous test at ' + new Date().toISOString(),
    type: 'feedback',
    displayName: 'anon-test',
  });
  console.log('submitComment (anon) =>', sub1);

  // 2) Auth user submit (top-level, User A)
  let authoredId = null;
  if (TOKEN_USER) {
    console.log('\n2) submitComment (user A, top-level)');
    const sub2 = await callFn('submitComment', 'POST', {
      content: 'Hello from user A at ' + new Date().toISOString(),
      type: 'feedback',
      displayName: 'userA-test',
    }, TOKEN_USER);
    console.log('submitComment (user A) =>', sub2);
    authoredId = sub2.id;
  } else {
    console.log('\n2) Skipping user submit (no TOKEN_USER provided)');
  }

  // 2b) Reply by the same author (User A) to the authored or anon comment
  if (TOKEN_USER) {
    const parentForA = authoredId || sub1.id;
    console.log('\n2b) submitComment (user A, reply)');
    const replyA = await callFn('submitComment', 'POST', {
      content: 'Reply from user A at ' + new Date().toISOString(),
      type: 'feedback',
      parentId: parentForA,
      displayName: 'userA-reply',
    }, TOKEN_USER);
    console.log('submitComment (user A reply) =>', replyA);
  } else {
    console.log('\n2b) Skipping reply by user A (no TOKEN_USER)');
  }

  // 2c) Reply by another user (User B)
  if (TOKEN_USER_2) {
    const parentForB = authoredId || sub1.id;
    console.log('\n2c) submitComment (user B, reply)');
    const replyB = await callFn('submitComment', 'POST', {
      content: 'Reply from user B at ' + new Date().toISOString(),
      type: 'feedback',
      parentId: parentForB,
      displayName: 'userB-reply',
    }, TOKEN_USER_2);
    console.log('submitComment (user B reply) =>', replyB);
  } else {
    console.log('\n2c) Skipping reply by user B (no TOKEN_USER_2)');
  }

  // 2d) Contact request (top-level)
  console.log('\n2d) submitComment (contact request)');
  const contact = await callFn('submitComment', 'POST', {
    content: 'Contact me about brokerage support, posted at ' + new Date().toISOString(),
    type: 'brokerage-request',
    contactEmail: 'tester@example.com',
    displayName: 'contact-requester',
  }, TOKEN_USER || undefined);
  console.log('submitComment (contact request) =>', contact);

  // 3) Edit authored comment within window (User A)
  if (authoredId && TOKEN_USER) {
    console.log('\n3) editComment (user A, within window)');
    const edit = await callFn('editComment', 'PATCH', {
      id: authoredId,
      content: 'Edited by user A at ' + new Date().toISOString(),
    }, TOKEN_USER);
    console.log('editComment =>', edit);
  } else {
    console.log('\n3) Skipping edit (needs authored id + TOKEN_USER)');
  }

  // 4) Report a comment (anonymous) — report authored or anon
  const toReport = authoredId || sub1.id;
  console.log('\n4) reportComment (anonymous)');
  const rep = await callFn('reportComment', 'POST', {
    id: toReport,
    reason: 'spam test',
  });
  console.log('reportComment =>', rep);

  // 5) Delete as author (User A)
  if (authoredId && TOKEN_USER) {
    console.log('\n5) deleteComment (user A, author)');
    const del = await callFn('deleteComment', 'DELETE', { id: authoredId }, TOKEN_USER);
    console.log('deleteComment =>', del);
  } else {
    console.log('\n5) Skipping delete (needs authored id + TOKEN_USER)');
  }

  // 6) Admin moderation: remove then restore (if admin token provided) on the anon comment (or authored)
  if (TOKEN_ADMIN) {
    const modTarget = authoredId || sub1.id;
    console.log('\n6a) adminModeration (remove)');
    const modRemove = await callFn('adminModeration', 'POST', {
      action: 'remove',
      id: modTarget,
    }, TOKEN_ADMIN);
    console.log('adminModeration (remove) =>', modRemove);

    console.log('\n6b) adminModeration (restore)');
    const modRestore = await callFn('adminModeration', 'POST', {
      action: 'restore',
      id: modTarget,
    }, TOKEN_ADMIN);
    console.log('adminModeration (restore) =>', modRestore);
  } else {
    console.log('\n6) Skipping adminModeration (no TOKEN_ADMIN provided)');
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Test failed:', err.message || err);
  process.exit(1);
});
