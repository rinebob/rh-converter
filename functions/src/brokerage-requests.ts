import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import type { Request, Response } from './interfaces-fn';

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

// Types used by this file only
interface SubmitBrokerageRequestBody {
  brokerageName: string; // required
  country?: string | null; // optional country/region tag
  notes?: string | null; // optional free-form context
  displayName?: string | null; // optional pseudonymous handle
  contactEmail?: string | null; // optional private email for follow-up
  deviceId?: string | null; // optional device id for anon ownership
}

type RequestStatus = 'open' | 'triaged' | 'in_progress' | 'done' | 'rejected';

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
    const uid = await getRequestUserUid(request); // may be null for anonymous
    const body = (request.body || {}) as Partial<SubmitBrokerageRequestBody>;

    const brokerageName = sanitizeString(body.brokerageName, 120);
    if (!brokerageName) {
      response.status(400).json({ error: 'brokerageName required' });
      return;
    }

    const country = sanitizeString(body.country, 64);
    const notes = sanitizeString(body.notes, 1000);
    const displayName = sanitizeString(body.displayName, 50);
    const contactEmail = sanitizeString(body.contactEmail, 254);
    const deviceId = sanitizeString(body.deviceId, 64);

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
    const userAgent = (request.headers['user-agent'] || '').toString().slice(0, 256);
    const ip = (request.headers['x-forwarded-for'] || (request as any).ip || '').toString();
    const ipHash = ip ? `hash:${Buffer.from(ip).toString('base64').slice(0, 16)}` : null;

    await metaDoc.set({
      requestId: reqDoc.id,
      uid: uid || null,
      ipHash,
      userAgent,
      contactEmail: contactEmail || null,
      createdAt: now,
    });

    response.status(200).json({ success: true, id: reqDoc.id });
  } catch (err) {
    console.error('submitBrokerageRequest error', err);
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
    const uid = await getRequestUserUid(request);
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

    response.status(200).json({ success: true, replyId: replyRef.id });
  } catch (err) {
    console.error('adminReplyToBrokerageRequest error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin view via Firebase Auth admin claim: list latest requests
export const listBrokerageRequests = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'GET') { response.status(405).send('Method Not Allowed'); return; }

  try {
    // Require Firebase Auth and admin claim
    const uid = await getRequestUserUid(request);
    if (!uid) { response.status(401).json({ error: 'Unauthorized' }); return; }
    const user = await auth.getUser(uid);
    const isAdmin = !!(user.customClaims && (user.customClaims as any).admin);
    if (!isAdmin) { response.status(403).json({ error: 'Forbidden' }); return; }

    const snap = await db.collection('brokerageRequests')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const items = snap.docs.map(d => {
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
      };
    });

    response.status(200).json({ success: true, items });
  } catch (err) {
    console.error('listBrokerageRequests error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

// Public: vote up/down on a brokerage request (adjust upvoteCount)
interface VoteBody {
  requestId: string;
  direction: 'up' | 'down';
  deviceId?: string | null;
}

export const voteBrokerageRequest = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'POST') { response.status(405).send('Method Not Allowed'); return; }

  try {
    const body = (request.body || {}) as Partial<VoteBody>;
    const requestId = sanitizeString(body.requestId, 128);
    const direction = body.direction === 'down' ? 'down' : 'up';
    if (!requestId) { response.status(400).json({ error: 'requestId required' }); return; }

    const ref = db.collection('brokerageRequests').doc(requestId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('not_found');
      const data = snap.data() as any;
      const current = typeof data.upvoteCount === 'number' ? data.upvoteCount : 0;
      const delta = direction === 'up' ? 1 : -1;
      const next = Math.max(0, current + delta);
      tx.update(ref, { upvoteCount: next });
    });

    const latest = await ref.get();
    const count = (latest.data() as any)?.upvoteCount ?? 0;
    response.status(200).json({ success: true, newCount: count });
  } catch (err: any) {
    if (err?.message === 'not_found') {
      response.status(404).json({ error: 'Not found' });
      return;
    }
    console.error('voteBrokerageRequest error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});
