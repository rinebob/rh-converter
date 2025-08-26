import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RequestStatus, REQUEST_STATUS_LABEL } from '../../common/interfaces';

export interface PublicBrokerRequestItemInput {
  id: string;
  displayName: string | null;
  brokerageName: string;
  country: string | null;
  upvoteCount: number;
  createdAtMs: number | null;
  status?: RequestStatus; // optional if caller doesn't have it
}

@Component({
  selector: 'app-broker-requests-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './broker-requests-table.component.html',
  styleUrls: ['./broker-requests-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrokerRequestsTableComponent {
  // Data source
  readonly requests = input<ReadonlyArray<PublicBrokerRequestItemInput>>([]);

  // Events
  readonly upvote = output<PublicBrokerRequestItemInput>();
  readonly downvote = output<PublicBrokerRequestItemInput>();

  // Labels
  readonly statusLabel = REQUEST_STATUS_LABEL;

  // Helper to avoid indexing with possibly-any from template context
  statusToLabel(status: RequestStatus | undefined | null): string {
    return status ? this.statusLabel[status] : '—';
  }

  // Column order for Angular Material table
  readonly displayedColumns: ReadonlyArray<string> = [
    'requestor',
    'brokerageName',
    'status',
    'country',
    'createdAt',
    'votes',
    'actions',
  ];

  onUpvote(item: PublicBrokerRequestItemInput): void {
    this.upvote.emit(item);
  }
  onDownvote(item: PublicBrokerRequestItemInput): void {
    this.downvote.emit(item);
  }
}
