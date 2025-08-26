import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import type { Request, Response } from './interfaces-fn';
import { randomUUID } from 'crypto';

// Initialize Admin once
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

// CORS configuration - using boolean for simplicity
const corsEnabled = true;

// Function to set CORS headers
const setCorsHeaders = (response: Response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Device');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Type');
};

// ---------------------------------------------------------------------------
// Structured logging helpers (PII-safe)
// ---------------------------------------------------------------------------
interface LogContext {
  fn: string;
  rid: string; // request id
  method: string;
  path: string;
  uid?: string | null;
}

function makeContext(fn: string, request: Request, uid?: string | null): LogContext {
  return {
    fn,
    rid: (randomUUID && typeof randomUUID === 'function') ? randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    method: request.method,
    path: (request as any).path || (request as any).originalUrl || '/',
    uid: uid ?? null,
  };
}

function logInfo(ctx: LogContext, message: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ severity: 'INFO', ...ctx, message, ...(extra || {}) }));
}

function logError(ctx: LogContext, message: string, err?: unknown, extra?: Record<string, unknown>) {
  const error = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { err };
  console.error(JSON.stringify({ severity: 'ERROR', ...ctx, message, ...error, ...(extra || {}) }));
}

// Types used by this file only
interface SubmitBrokerageRequestBody {
  brokerageName: string; // required
  country?: string | null; // optional country/region tag
  notes?: string | null; // optional free-form context
  displayName?: string | null; // optional pseudonymous handle
  deviceId?: string | null; // optional device id for anon ownership
  exampleFilePath?: string | null; // optional storage path to an uploaded CSV
}

enum RequestStatus {
  OPEN = 'open',
  TRIAGED = 'triaged',
  NEEDS_INFO = 'needs_info',
  IN_PROGRESS = 'in_progress',
  READY_FOR_QA = 'ready_for_qa',
  DONE = 'done',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
  PAUSED = 'paused',
}

function sanitizeString(input: unknown, max = 200): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

async function getRequestUserUid(request: Request): Promise<string | null> {
  try {
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    if (!authHeader || Array.isArray(authHeader)) return null;
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : authHeader.trim();
    if (!token) return null;
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export const submitBrokerageRequest = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'POST') { response.status(405).send('Method Not Allowed'); return; }

  try {
    const start = Date.now();
    const uid = await getRequestUserUid(request); // may be null for anonymous
    const ctx = makeContext('submitBrokerageRequest', request, uid);
    logInfo(ctx, 'start');
    const body = (request.body || {}) as Partial<SubmitBrokerageRequestBody>;

    const brokerageName = sanitizeString(body.brokerageName, 120);
    if (!brokerageName) {
      logInfo(ctx, 'validation_failed', { field: 'brokerageName' });
      response.status(400).json({ error: 'brokerageName required' });
      return;
    }

    const country = sanitizeString(body.country, 64);
    const notes = sanitizeString(body.notes, 1000);
    const displayName = sanitizeString(body.displayName, 50);
    const deviceId = sanitizeString(body.deviceId, 64);
    const exampleFilePath = sanitizeString(body.exampleFilePath, 512); // store as-is (private), path length limited

    // Log provided example file path (if any)
    if (exampleFilePath) {
      logInfo(ctx, 'received_example_file_path', { exampleFilePath });
    } else {
      logInfo(ctx, 'no_example_file_path');
    }

    const now = Timestamp.now();

    // Public request doc (minimal, safe fields)
    const reqDoc = db.collection('brokerageRequests').doc();

    const requestData = {
      id: reqDoc.id,
      brokerageName,
      country: country || null,
      notes: notes || null,
      createdAt: now,
      authorUid: uid || null,
      authorDeviceId: deviceId || null,
      displayName: displayName || null,
      status: 'open' as RequestStatus,
      upvoteCount: 1, // initial implicit upvote by the requester
    };

    await reqDoc.set(requestData);

    // Private meta doc (PII, network info)
    const metaDoc = db.collection('brokerageRequestMeta').doc(reqDoc.id);

    await metaDoc.set({
      requestId: reqDoc.id,
      brokerageName,
      uid: uid || null,
      exampleFilePath: exampleFilePath || null,
      createdAt: now,
    });

    // Seed initial vote event for requester (no dedupe). Store deviceId and displayName.
    const seedVoteRef = reqDoc.collection('votes').doc();
    await seedVoteRef.set({ value: 1, createdAt: now, type: 'seed', deviceId: deviceId || null, displayName: displayName || null });
    logInfo(ctx, 'seed_initial_vote', { requestId: reqDoc.id, voteId: seedVoteRef.id, deviceId: deviceId || null, displayName: displayName || null });

    logInfo(ctx, 'success', { requestId: reqDoc.id, durationMs: Date.now() - start, exampleFilePath: exampleFilePath || null });
    response.status(200).json({ success: true, id: reqDoc.id });
  } catch (err) {
    const ctx = makeContext('submitBrokerageRequest', request);
    logError(ctx, 'error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

// Public: vote up/down on a brokerage request (adjust upvoteCount)
interface VoteBody {
  requestId: string;
  direction: 'up' | 'down';
  deviceId?: string | null;
  displayName?: string | null;
}

export const voteBrokerageRequest = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'POST') { response.status(405).send('Method Not Allowed'); return; }

  try {
    const start = Date.now();
    const body = (request.body || {}) as Partial<VoteBody>;
    const uid = await getRequestUserUid(request); // optional
    const ctx = makeContext('voteBrokerageRequest', request, uid);
    const requestId = sanitizeString(body.requestId, 128);
    const direction = body.direction === 'down' ? 'down' : 'up';
    if (!requestId) { response.status(400).json({ error: 'requestId required' }); return; }

    const deviceId = sanitizeString(body.deviceId, 64);
    const displayName = sanitizeString(body.displayName, 50);

    const ref = db.collection('brokerageRequests').doc(requestId);
    const voteEventRef = ref.collection('votes').doc();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('not_found');
      const data = snap.data() as any;
      const current = typeof data.upvoteCount === 'number' ? data.upvoteCount : 0;

      const next = current + (direction === 'up' ? 1 : -1); // single-step +/-1 per call
      if (next !== current) {
        tx.update(ref, { upvoteCount: next });
      }
      // Record vote event with deviceId and displayName
      tx.set(voteEventRef, { direction, value: direction === 'up' ? 1 : -1, createdAt: Timestamp.now(), deviceId: deviceId || null, displayName: displayName || null });
    });

    const latest = await ref.get();
    const count = (latest.data() as any)?.upvoteCount ?? 0;
    logInfo(ctx, 'success', {
      requestId,
      direction,
      newCount: count,
      currentBefore: count - (direction === 'up' ? 1 : -1),
      delta: direction === 'up' ? 1 : -1,
      nextAfter: count,
      deviceId: deviceId || null,
      displayName: displayName || null,
      requestAuthorDisplayName: (latest.data() as any)?.displayName || null,
      durationMs: Date.now() - start,
    });
    response.status(200).json({ success: true, newCount: count });
  } catch (err: any) {
    if (err?.message === 'not_found') {
      const ctx = makeContext('voteBrokerageRequest', request);
      logInfo(ctx, 'not_found');
      response.status(404).json({ error: 'Not found' });
      return;
    }
    const ctx = makeContext('voteBrokerageRequest', request);
    logError(ctx, 'error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin-only: reply to a brokerage request and optionally update status
interface AdminReplyBody {
  requestId: string; // required
  message: string; // required
  newStatus?: RequestStatus; // optional
}

export const adminReplyToBrokerageRequest = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'POST') { response.status(405).send('Method Not Allowed'); return; }

  try {
    const start = Date.now();
    const uid = await getRequestUserUid(request);
    const ctx = makeContext('adminReplyToBrokerageRequest', request, uid);
    if (!uid) { response.status(401).json({ error: 'Unauthorized' }); return; }

    // Verify admin via custom claims
    const user = await auth.getUser(uid);
    const isAdmin = !!(user.customClaims && (user.customClaims as any).admin);
    if (!isAdmin) { response.status(403).json({ error: 'Forbidden' }); return; }

    const body = (request.body || {}) as Partial<AdminReplyBody>;
    const requestId = sanitizeString(body.requestId, 128);
    const message = sanitizeString(body.message, 2000);
    const newStatus = body.newStatus as RequestStatus | undefined;

    if (!requestId) { response.status(400).json({ error: 'requestId required' }); return; }
    if (!message) { response.status(400).json({ error: 'message required' }); return; }

    const reqRef = db.collection('brokerageRequests').doc(requestId);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) { response.status(404).json({ error: 'Not found' }); return; }

    const now = Timestamp.now();

    // Write reply into subcollection
    const replyRef = reqRef.collection('replies').doc();
    await replyRef.set({
      id: replyRef.id,
      requestId,
      message,
      createdAt: now,
      authorUid: uid,
      // optional future fields: internal visibility, tags, etc.
    });

    // Optionally update status
    if (newStatus) {
      await reqRef.update({ status: newStatus });
    }

    logInfo(ctx, 'success', { requestId, replyId: replyRef.id, newStatus: newStatus || null, durationMs: Date.now() - start });
    response.status(200).json({ success: true, replyId: replyRef.id });
  } catch (err) {
    const ctx = makeContext('adminReplyToBrokerageRequest', request);
    logError(ctx, 'error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin view via Firebase Auth admin claim: list latest requests
export const listBrokerageRequests = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'GET') { response.status(405).send('Method Not Allowed'); return; }

  try {
    const start = Date.now();
    // Require Firebase Auth and admin claim
    const uid = await getRequestUserUid(request);
    const ctx = makeContext('listBrokerageRequests', request, uid);
    if (!uid) { response.status(401).json({ error: 'Unauthorized' }); return; }
    const user = await auth.getUser(uid);
    const isAdmin = !!(user.customClaims && (user.customClaims as any).admin);
    if (!isAdmin) { response.status(403).json({ error: 'Forbidden' }); return; }

    const snap = await db.collection('brokerageRequests')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const baseItems = snap.docs.map(d => {
      const data = d.data() as any;
      const createdAtTs: Timestamp | undefined = data.createdAt;
      return {
        id: d.id,
        brokerageName: data.brokerageName || null,
        country: data.country || null,
        notes: data.notes || null,
        createdAt: createdAtTs ? createdAtTs.toMillis() : null,
        authorUid: data.authorUid || null,
        authorDeviceId: data.authorDeviceId || null,
        displayName: data.displayName || null,
        status: data.status || 'open',
        upvoteCount: data.upvoteCount || 0,
      } as any;
    });

    // Join with private meta to surface exampleFilePath for admins
    const metaRefs = baseItems.map(it => db.collection('brokerageRequestMeta').doc(it.id));
    const metaSnaps = metaRefs.length ? await db.getAll(...metaRefs) : [];
    const metaById = new Map<string, any>();
    for (const ms of metaSnaps) {
      if (ms.exists) metaById.set(ms.id, ms.data());
    }

    const items = baseItems.map(it => {
      const meta = metaById.get(it.id) || {};
      const exampleFilePath: string | null = meta.exampleFilePath || null;
      const exampleFileName: string | null = exampleFilePath ? exampleFilePath.split('/').pop() || null : null;
      return {
        ...it,
        exampleFilePath,
        exampleFileName,
      };
    });

    // Compute vote velocity and activity metrics per item (MVP)
    const nowTs = Timestamp.now();
    const nowMs = nowTs.toMillis();
    const ms24h = 24 * 60 * 60 * 1000;
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    const since24h = Timestamp.fromMillis(nowMs - ms24h);
    const since7d = Timestamp.fromMillis(nowMs - ms7d);

    const withMetrics = await Promise.all(items.map(async (it) => {
      const reqRef = db.collection('brokerageRequests').doc(it.id);

      // Fetch votes in last 7d (used to derive 7d and 24h) and replies (all)
      const [votesSnap, repliesSnap] = await Promise.all([
        reqRef.collection('votes')
          .where('createdAt', '>=', since7d)
          .orderBy('createdAt', 'desc')
          .get(),
        reqRef.collection('replies')
          .orderBy('createdAt', 'desc')
          .get(),
      ]);

      let last7dVotes = 0;
      let last24hVotes = 0;
      let lastVotedAtMs: number | null = null;
      votesSnap.docs.forEach((d, idx) => {
        const v = (d.data() as any);
        const createdAt: Timestamp | undefined = v.createdAt;
        const ms = createdAt ? createdAt.toMillis() : null;
        const value = typeof v.value === 'number' ? v.value : (v.direction === 'down' ? -1 : 1);
        last7dVotes += value;
        if (ms && ms >= since24h.toMillis()) last24hVotes += value;
        if (idx === 0 && ms) lastVotedAtMs = ms;
      });

      const repliesCount = repliesSnap.size;
      const lastReplyAtMs = repliesSnap.docs.length ? ((repliesSnap.docs[0].data() as any).createdAt as Timestamp | undefined)?.toMillis() ?? null : null;

      const lastActivityMs = Math.max(
        it.createdAt || 0,
        lastVotedAtMs || 0,
        lastReplyAtMs || 0,
      ) || null;

      const hasExampleFile = !!it.exampleFilePath;

      // Simple hot score: base score + recent velocity + replies signal
      const hotScore = Math.round(
        (it.upvoteCount || 0)
        + (2 * last24hVotes)
        + (1 * last7dVotes)
        + (0.5 * repliesCount)
      );

      return {
        ...it,
        hasExampleFile,
        last24hVotes,
        last7dVotes,
        repliesCount,
        lastVotedAtMs,
        lastReplyAtMs,
        lastActivityMs,
        hotScore,
      };
    }));

    logInfo(ctx, 'success', { count: withMetrics.length, durationMs: Date.now() - start });
    response.status(200).json({ success: true, items: withMetrics });
  } catch (err) {
    const ctx = makeContext('listBrokerageRequests', request);
    logError(ctx, 'error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});
