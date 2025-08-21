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
  response.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Type');
};

// Helpers
const EDIT_WINDOW_MINUTES = 15;

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

function sanitizeContent(content: unknown): string {
  const text = (typeof content === 'string' ? content : '').trim();
  // Basic normalization; stronger filters can be added server-side later
  return text.slice(0, 2500);
}

// Types used by this file only
interface SubmitCommentBody {
  content: string;
  type?: 'feedback' | 'brokerage-request';
  parentId?: string | null;
  displayName?: string | null; // optional pseudonymous handle
  contactEmail?: string | null; // private; only when type=brokerage-request
}

/**
 * submitComment: creates a new public comment and a private meta record.
 * Anonymous users are allowed (uid=null), but we still create a stable record.
 */
export const submitComment = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }
  try {
    console.log('[submitComment] start', { method: request.method, hasAuth: !!(request.headers['authorization'] || request.headers['Authorization']) });
    const uid = await getRequestUserUid(request); // null for anonymous
    const body = (request.body || {}) as Partial<SubmitCommentBody>;

    const content = sanitizeContent(body.content);
    if (!content) {
      response.status(400).json({ error: 'Content required' });
      return;
    }

    const type: 'feedback' | 'brokerage-request' = body.type === 'brokerage-request' ? 'brokerage-request' : 'feedback';
    const parentId = typeof body.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : null;
    const displayName = typeof body.displayName === 'string' && body.displayName.trim() ? body.displayName.trim().slice(0, 50) : null;
    const contactEmail = typeof body.contactEmail === 'string' && body.contactEmail.trim() ? body.contactEmail.trim().slice(0, 254) : null;

    console.log('[submitComment] payload', { uid: !!uid ? 'authed' : 'anon', type, parentId, displayName, contentLength: content.length, content });
    // Basic rate limiting placeholder: can be expanded using Firestore counters/IP hashes.
    // If needed, respond with captcha_required to trigger client flow.

    const now = Timestamp.now();

    const commentDoc = db.collection('comments').doc();
    const commentData = {
      id: commentDoc.id,
      content,
      createdAt: now,
      editedAt: null as Timestamp | null,
      authorUid: uid, // may be null
      displayName: displayName || null,
      type,
      parentId: parentId || null,
      status: 'active' as 'active' | 'removed' | 'flagged',
      reportCount: 0,
    };

    await commentDoc.set(commentData);

    // Private meta (write-only conceptually; not exposed to clients directly)
    const metaDoc = db.collection('commentMeta').doc(commentDoc.id);
    const userAgent = (request.headers['user-agent'] || '').toString().slice(0, 256);
    const ip = (request.headers['x-forwarded-for'] || request.ip || '').toString();
    // For privacy, store a simple truncated hash placeholder; replace with salted hash later.
    const ipHash = ip ? `hash:${Buffer.from(ip).toString('base64').slice(0, 16)}` : null;

    await metaDoc.set({
      commentId: commentDoc.id,
      uid: uid || null,
      ipHash,
      userAgent,
      contactEmail: type === 'brokerage-request' ? (contactEmail || null) : null,
      createdAt: now,
    });

    console.log('[submitComment] success', { id: commentDoc.id });
    response.status(200).json({ success: true, id: commentDoc.id });
  } catch (err: any) {
    console.error('submitComment error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * editComment: author can edit within EDIT_WINDOW_MINUTES; admin can always edit.
 */
export const editComment = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'PATCH') { response.status(405).send('Method Not Allowed'); return; }

  try {
    console.log('[editComment] start');
    const uid = await getRequestUserUid(request);
    const { id, content } = request.body || {};
    if (!id || typeof id !== 'string') { response.status(400).json({ error: 'id required' }); return; }
    const newContent = sanitizeContent(content);
    if (!newContent) { response.status(400).json({ error: 'content required' }); return; }

    console.log('[editComment] payload', { id, contentLength: newContent.length, content: newContent });

    const ref = db.collection('comments').doc(id);
    const snap = await ref.get();
    if (!snap.exists) { response.status(404).json({ error: 'Not found' }); return; }
    const data = snap.data() as any;

    // Check permissions
    let isAdmin = false;
    if (uid) {
      try { const token = await auth.getUser(uid); isAdmin = !!(token.customClaims && (token.customClaims as any).admin); } catch { /* noop */ }
    }

    const createdAt = (data.createdAt as Timestamp);
    const withinWindow = Timestamp.now().toMillis() - createdAt.toMillis() <= EDIT_WINDOW_MINUTES * 60 * 1000;

    const isAuthor = uid && data.authorUid && uid === data.authorUid;
    console.log('[editComment] decision', { id, isAdmin, isAuthor: !!isAuthor, withinWindow });
    if (!(isAdmin || (isAuthor && withinWindow))) {
      response.status(403).json({ error: 'Forbidden' });
      return;
    }

    await ref.update({ content: newContent, editedAt: Timestamp.now() });
    console.log('[editComment] success', { id });
    response.status(200).json({ success: true });
  } catch (err) {
    console.error('editComment error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * deleteComment: author (anytime) or admin can soft-delete (status=removed)
 */
export const deleteComment = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'DELETE') { response.status(405).send('Method Not Allowed'); return; }

  try {
    console.log('[deleteComment] start');
    const uid = await getRequestUserUid(request);
    const { id } = request.query as any;
    const commentId = typeof id === 'string' ? id : (request.body && request.body.id);
    if (!commentId || typeof commentId !== 'string') { response.status(400).json({ error: 'id required' }); return; }

    const ref = db.collection('comments').doc(commentId);
    const snap = await ref.get();
    if (!snap.exists) { response.status(404).json({ error: 'Not found' }); return; }
    const data = snap.data() as any;

    let isAdmin = false;
    if (uid) {
      try { const token = await auth.getUser(uid); isAdmin = !!(token.customClaims && (token.customClaims as any).admin); } catch { /* noop */ }
    }

    const isAuthor = uid && data.authorUid && uid === data.authorUid;
    console.log('[deleteComment] decision', { id: commentId, isAdmin, isAuthor: !!isAuthor });
    if (!(isAdmin || isAuthor)) { response.status(403).json({ error: 'Forbidden' }); return; }

    await ref.update({ status: 'removed', editedAt: Timestamp.now() });
    console.log('[deleteComment] success', { id: commentId });
    response.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteComment error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * reportComment: increments reportCount and optionally flags comment
 */
export const reportComment = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'POST') { response.status(405).send('Method Not Allowed'); return; }

  try {
    console.log('[reportComment] start');
    const { id, reason } = request.body || {};
    if (!id || typeof id !== 'string') { response.status(400).json({ error: 'id required' }); return; }

    const ref = db.collection('comments').doc(id);
    const snap = await ref.get();
    if (!snap.exists) { response.status(404).json({ error: 'Not found' }); return; }

    await ref.update({ reportCount: (snap.data()!.reportCount || 0) + 1, status: 'flagged' });

    // Optional: store report details
    await db.collection('commentReports').add({ commentId: id, reason: (reason || '').toString().slice(0, 200), createdAt: Timestamp.now() });

    console.log('[reportComment] success', { id, reasonLength: (reason || '').toString().length, reason: (reason || '').toString() });
    response.status(200).json({ success: true });
  } catch (err) {
    console.error('reportComment error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * adminModeration: admin-only actions on comments
 * actions: remove, restore
 */
export const adminModeration = onRequest({ cors: corsEnabled }, async (request: Request, response: Response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') { response.status(204).send(''); return; }
  if (request.method !== 'POST') { response.status(405).send('Method Not Allowed'); return; }

  try {
    console.log('[adminModeration] start');
    const uid = await getRequestUserUid(request);
    if (!uid) { response.status(401).json({ error: 'Unauthorized' }); return; }
    const user = await auth.getUser(uid);
    const isAdmin = !!(user.customClaims && (user.customClaims as any).admin);
    if (!isAdmin) { response.status(403).json({ error: 'Forbidden' }); return; }

    const { action, id } = request.body || {};
    if (!action) { response.status(400).json({ error: 'action required' }); return; }

    if ((action === 'remove' || action === 'restore') && (!id || typeof id !== 'string')) {
      response.status(400).json({ error: 'id required' });
      return;
    }

    console.log('[adminModeration] action', { action, id });
    switch (action) {
      case 'remove': {
        const ref = db.collection('comments').doc(id);
        await ref.update({ status: 'removed', editedAt: Timestamp.now() });
        break;
      }
      case 'restore': {
        const ref = db.collection('comments').doc(id);
        await ref.update({ status: 'active' });
        break;
      }
      default:
        response.status(400).json({ error: 'Unsupported action' });
        return;
    }

    console.log('[adminModeration] success', { action, id });
    response.status(200).json({ success: true });
  } catch (err) {
    console.error('adminModeration error', err);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});
