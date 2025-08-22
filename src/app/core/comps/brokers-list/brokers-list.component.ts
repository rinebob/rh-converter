import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { BrokerageRequestFormComponent } from '../brokerage-request-form/brokerage-request-form.component';
import { Firestore, collection, collectionData, limit, orderBy, query, Timestamp } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { BrokerageRequestsService } from '../../services/brokerage-requests.service';

/**
 * Lightweight view model for showing recent new broker requests publicly.
 * Only includes non-sensitive fields suitable for public display.
 */
interface PublicBrokerRequestItem {
  id: string;
  brokerageName: string;
  country: string | null;
  upvoteCount: number;
  createdAtMs: number | null;
}

@Component({
  selector: 'app-brokers-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTableModule, MatButtonModule, MatExpansionModule, BrokerageRequestFormComponent],
  templateUrl: './brokers-list.component.html',
  styleUrls: ['./brokers-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrokersListComponent {
  private readonly firestore = inject(Firestore);
  private readonly svc = inject(BrokerageRequestsService);

  // Loading/error state
  readonly loading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);

  // Live list of recent requests (public fields only)
  private readonly requests$: Observable<PublicBrokerRequestItem[]> = (collectionData(
    query(collection(this.firestore, 'brokerageRequests'), orderBy('createdAt', 'desc'), limit(20)),
    { idField: 'id' }
  ) as Observable<any[]>).pipe(
    map(rows => rows.map(row => ({
      id: row.id,
      brokerageName: row.brokerageName ?? 'Unknown',
      country: row.country ?? null,
      upvoteCount: typeof row.upvoteCount === 'number' ? row.upvoteCount : 0,
      createdAtMs: row.createdAt && typeof row.createdAt.toMillis === 'function' ? row.createdAt.toMillis() : null,
      // createdAt kept server-side; not displayed here
    }) as PublicBrokerRequestItem)),
    catchError(() => {
      this.loadError.set('Failed to load requests.');
      return of<PublicBrokerRequestItem[]>([]);
    })
  );

  readonly requests = toSignal(this.requests$);

  // Column order for Angular Material table
  readonly displayedColumns: ReadonlyArray<string> = [
    'brokerageName',
    'country',
    'createdAt',
    'votes',
    'actions',
  ];

  upvote(item: PublicBrokerRequestItem): void {
    this.svc.vote({ requestId: item.id, direction: 'up' }).subscribe();
  }

  downvote(item: PublicBrokerRequestItem): void {
    this.svc.vote({ requestId: item.id, direction: 'down' }).subscribe();
  }
}
