import { Injectable, inject, signal, WritableSignal, OnDestroy, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  Timestamp,
  collectionData,
  doc,
  Query,
} from '@angular/fire/firestore';
import { Observable, Subscription, from, of, switchMap, map, catchError, throwError } from 'rxjs';
import { Comment } from '../common/interfaces';
import { AuthService } from './auth.service';
import { AnonymousNameService } from './anonymous-name.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth, getIdToken } from '@angular/fire/auth';
import { environment } from 'src/environments/environment';
import { DeviceIdService } from './device-id.service';

// Firestore public comment document as written by Cloud Functions (backend schema)
interface PublicCommentDoc {
  id?: string;
  content: string;
  createdAt: Timestamp;
  editedAt: Timestamp | null;
  authorUid: string | null;
  authorDeviceId?: string | null;
  displayName: string | null;
  type: 'feedback' | 'brokerage-request';
  parentId: string | null;
  status: 'active' | 'removed' | 'flagged';
  reportCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class CommentsService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private anonymousNameService: AnonymousNameService = inject(AnonymousNameService);
  private injector = inject(Injector);
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private deviceIdService = inject(DeviceIdService);

  private readonly functionsBaseUrl = environment.api.functionsBaseUrl; // e.g., https://us-central1-<project>.cloudfunctions.net

  private commentsCollectionPath = 'comments';
  private commentsSignal: WritableSignal<Comment[]> = signal<Comment[]>([]);
  private commentsSubscription: Subscription | null = null;

  // Public readonly signal for components to consume
  public readonly comments$ = this.commentsSignal.asReadonly();

  constructor() {}

  /**
   * Fetches comments in real-time and updates the commentsSignal.
   */
  loadComments(): void {
    // Unsubscribe from previous listener if any
    if (this.commentsSubscription) {
      this.commentsSubscription.unsubscribe();
      this.commentsSubscription = null;
    }

    runInInjectionContext(this.injector, () => {
      const commentsCol = collection(this.firestore, this.commentsCollectionPath);
      const commentsQuery = query(
        commentsCol,
        orderBy('createdAt', 'asc')
      ) as Query<PublicCommentDoc>; // Query typed to backend schema

      // collectionData will add the 'id' field to produce typed docs
      this.commentsSubscription = collectionData<PublicCommentDoc>(commentsQuery, { idField: 'id' })
        .subscribe({
          next: (docs) => {
            // Map backend schema -> UI Comment interface expected by templates
            const mapped: Comment[] = (docs || [])
              .filter(d => (d?.status ?? 'active') !== 'removed')
              .map(d => {
                const createdAt = d.createdAt instanceof Timestamp ? d.createdAt : Timestamp.fromDate(new Date());
                return {
                  id: d.id,
                  userId: d.authorUid || 'anonymous',
                  userName: (d.displayName || undefined),
                  text: (typeof d.content === 'string' ? d.content : ''),
                  createdAt,
                  parentId: d.parentId || undefined,
                  authorDeviceId: d.authorDeviceId || undefined,
                } as Comment;
              });
            this.commentsSignal.set(mapped);
          },
          error: (error) => {
            console.error('Error fetching comments: ', error);
            this.commentsSignal.set([]);
          }
        });
    });
  }

  // Internal helper: get Authorization header if authenticated
  private authHeaders$(): Observable<HttpHeaders | undefined> {
    const user = this.auth.currentUser;
    if (!user) return of(undefined);
    return from(getIdToken(user, true)).pipe(
      map((token) => new HttpHeaders({ Authorization: `Bearer ${token}` })),
      catchError(() => of(undefined))
    );
  }

  /**
   * Adds a new comment via Cloud Function submitComment.
   * Keeps method signature; returns Promise<void> for compatibility with existing callers.
   */
  async addComment(text: string, parentId?: string): Promise<void> {
    if (!text || !text.trim()) {
      throw new Error('Comment text cannot be empty.');
    }

    const isAuthed = !!this.authService.currentUser;
    const displayName = isAuthed
      ? this.authService.currentUser?.displayName || undefined
      : this.anonymousNameService.getName() || undefined;

    const body: any = {
      content: text.trim().slice(0, 2500),
      type: 'feedback',
      deviceId: this.deviceIdService.deviceId(),
    } as {
      content: string;
      type: 'feedback';
      parentId?: string;
      displayName?: string;
      deviceId?: string;
    };

    if (parentId) body.parentId = parentId;
    if (displayName) body.displayName = displayName;

    const url = `${this.functionsBaseUrl}/submitComment`;

    // Use RxJS for HTTP, then convert to Promise for backward compatibility.
    return await new Promise<void>((resolve, reject) => {
      this.authHeaders$()
        .pipe(
          switchMap((headers) =>
            this.http.post<{ success: boolean; id: string }>(url, body, { headers })
          )
        )
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('submitComment failed', err);
            reject(err);
          },
        });
    });
  }

  /**
   * Deletes a comment via Cloud Function deleteComment.
   * Keeps method signature; returns Promise<void> for compatibility.
   */
  async deleteComment(commentId: string): Promise<void> {
    if (!commentId) {
      throw new Error('Comment ID cannot be empty.');
    }

    const url = `${this.functionsBaseUrl}/deleteComment`;

    return await new Promise<void>((resolve, reject) => {
      this.authHeaders$()
        .pipe(
          switchMap((headers) =>
            this.http.request<{ success: boolean }>('DELETE', url, { body: { id: commentId, deviceId: this.deviceIdService.deviceId() }, headers })
          )
        )
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('deleteComment failed', err);
            reject(err);
          },
        });
    });
  }

  /**
   * Edits an existing comment via Cloud Function editComment.
   */
  async editComment(id: string, content: string): Promise<void> {
    if (!id || !content || !content.trim()) {
      throw new Error('Comment id and content are required.');
    }

    const url = `${this.functionsBaseUrl}/editComment`;
    const body = { id, content: content.trim().slice(0, 2500), deviceId: this.deviceIdService.deviceId() } as { id: string; content: string; deviceId: string };

    return await new Promise<void>((resolve, reject) => {
      this.authHeaders$()
        .pipe(
          switchMap((headers) => this.http.patch<{ success: boolean }>(url, body, { headers }))
        )
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('editComment failed', err);
            reject(err);
          },
        });
    });
  }

  /**
   * Reports a comment via Cloud Function reportComment.
   */
  async reportComment(id: string, reason?: string): Promise<void> {
    if (!id) {
      throw new Error('Comment id is required.');
    }

    const url = `${this.functionsBaseUrl}/reportComment`;
    const body: { id: string; reason?: string } = { id };
    if (reason && reason.trim()) body.reason = reason.trim().slice(0, 200);

    return await new Promise<void>((resolve, reject) => {
      this.authHeaders$()
        .pipe(
          switchMap((headers) => this.http.post<{ success: boolean }>(url, body, { headers }))
        )
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('reportComment failed', err);
            reject(err);
          },
        });
    });
  }

  /**
   * Admin moderation actions via Cloud Function adminModeration.
   */
  async adminModeration(action: 'remove' | 'restore', id: string): Promise<void> {
    if (!action) {
      throw new Error('Action is required.');
    }
    if ((action === 'remove' || action === 'restore') && !id) {
      throw new Error('Comment id is required for this action.');
    }

    const url = `${this.functionsBaseUrl}/adminModeration`;
    const body = { action, id } as { action: 'remove' | 'restore'; id: string };

    return await new Promise<void>((resolve, reject) => {
      this.authHeaders$()
        .pipe(
          switchMap((headers) => this.http.post<{ success: boolean }>(url, body, { headers }))
        )
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('adminModeration failed', err);
            reject(err);
          },
        });
    });
  }

  ngOnDestroy(): void {
    if (this.commentsSubscription) {
      this.commentsSubscription.unsubscribe();
    }
  }
}
