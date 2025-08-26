import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { collection, collectionData, Firestore, orderBy, limit, query, Timestamp } from '@angular/fire/firestore';
import { Observable, of, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BrokerageRequestsService, AdminReplyPayload } from '../../../core/services/brokerage-requests.service';
import { Storage, ref, getDownloadURL } from '@angular/fire/storage';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface RequestDoc {
  id: string;
  brokerageName: string;
  country: string | null;
  notes: string | null;
  createdAt: Date;
  authorUid: string | null;
  authorDeviceId: string | null;
  displayName: string | null;
  status: 'open' | 'triaged' | 'in_progress' | 'done' | 'rejected';
  upvoteCount: number;
  // example file metadata (admin only)
  exampleFilePath?: string | null;
  exampleFileName?: string | null;
}

interface ReplyDoc {
  id: string;
  requestId: string;
  message: string;
  createdAt: Date;
  authorUid: string;
}

@Component({
  selector: 'app-admin-brokerage-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './admin-brokerage-requests.component.html',
  styleUrls: ['./admin-brokerage-requests.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBrokerageRequestsComponent {
  private readonly firestore = inject(Firestore);
  private readonly svc = inject(BrokerageRequestsService);
  private readonly storage = inject(Storage);

  // UI state
  selectedId = signal<string | null>(null);
  selectedRequest = signal<RequestDoc | null>(null);
  replies$: Observable<ReplyDoc[]> | null = null;
  downloadUrl = signal<string | null>(null);
  downloading = signal<boolean>(false);

  // feedback
  submitting = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // reply form
  replyMessage = signal<string>('');
  newStatus = signal<RequestDoc['status'] | ''>('');

  // Fetch via HTTPS function using Firebase Auth admin claim
  readonly requests$: Observable<RequestDoc[]> = this.svc.listRequests().pipe(
    map(res => (res.items || []).map(row => ({
      id: row.id,
      brokerageName: row.brokerageName,
      country: row.country,
      notes: row.notes,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      authorUid: row.authorUid,
      authorDeviceId: row.authorDeviceId,
      displayName: row.displayName,
      status: row.status,
      upvoteCount: row.upvoteCount,
      exampleFilePath: (row as any).exampleFilePath ?? null,
      exampleFileName: (row as any).exampleFileName ?? null,
    }) as RequestDoc)),
    catchError(() => {
      this.errorMsg.set('Failed to load requests. Ensure you are signed in as an admin.');
      return of<RequestDoc[]>([]);
    })
  );

  constructor() {
    // Auto-select the first request when data arrives and nothing is selected yet
    this.requests$
      .pipe(takeUntilDestroyed())
      .subscribe((list) => {
        if (!this.selectedId() && list.length > 0) {
          this.selectRequest(list[0]);
        }
      });
  }

  selectRequest(req: RequestDoc): void {
    this.selectedId.set(req.id);
    this.selectedRequest.set(req);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.replyMessage.set('');
    this.newStatus.set('');
    this.downloadUrl.set(null);

    // Auto-fetch download URL when opening details (guarded to current selection)
    if (req.exampleFilePath) {
      this.fetchDownload(req.exampleFilePath);
    }

    // Load replies subcollection for this request (will be empty if rules block direct reads)
    this.replies$ = (collectionData(
      query(collection(this.firestore, `brokerageRequests/${req.id}/replies`), orderBy('createdAt', 'desc')),
      { idField: 'id' }
    ) as Observable<any[]>).pipe(
      map(rows => rows.map(row => ({
        ...row,
        createdAt: row?.createdAt instanceof Timestamp ? row.createdAt.toDate() : row.createdAt,
      }) as ReplyDoc)),
      catchError(() => of<ReplyDoc[]>([]))
    );
  }

  private log(message: string, data?: unknown): void {
    if (data !== undefined) {
      console.log('[AdminBrokerageRequests]', message, data);
    } else {
      console.log('[AdminBrokerageRequests]', message);
    }
  }

  fetchDownload(path: string): void {
    if (!path) {
      this.log('fetchDownload: no path provided');
      return;
    }
    if (this.downloading()) {
      this.log('fetchDownload: already downloading, skip', { path });
      return;
    }
    this.downloading.set(true);
    this.log('fetchDownload: start', { path });
    const selectedAtCall = this.selectedId();
    from(getDownloadURL(ref(this.storage, path)))
      .pipe(
        catchError((err) => {
          this.log('fetchDownload: error', { path, error: (err as any)?.message || err });
          return of(null);
        })
      )
      .subscribe((url) => {
        this.downloading.set(false);
        const hasUrl = !!url;
        this.log('fetchDownload: done', { path, success: hasUrl });
        // Only set URL if this request is still selected
        if (this.selectedId() === selectedAtCall) {
          this.downloadUrl.set(url);
        } else {
          this.log('fetchDownload: selection changed during fetch, ignoring URL', { path });
        }
      });
  }

  canReply = computed(() => {
    return !this.submitting() && !!this.selectedId() && this.replyMessage().trim().length > 0;
  });

  sendReply(): void {
    if (!this.canReply()) return;
    const id = this.selectedId();
    if (!id) return;

    const payload: AdminReplyPayload = {
      requestId: id,
      message: this.replyMessage().trim(),
      newStatus: (this.newStatus() || undefined) as any,
    };

    this.submitting.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    this.svc.adminReply(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res?.success) {
          this.successMsg.set('Reply posted.');
          this.replyMessage.set('');
        } else {
          this.errorMsg.set(res?.error || 'Failed to post reply');
        }
      },
      error: () => {
        this.submitting.set(false);
        this.errorMsg.set('Network error.');
      },
    });
  }
}
