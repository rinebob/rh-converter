import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PublicBrokerRequestItemInput {
  id: string;
  displayName: string | null;
  brokerageName: string;
  country: string | null;
  upvoteCount: number;
  createdAtMs: number | null;
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

  // Column order for Angular Material table
  readonly displayedColumns: ReadonlyArray<string> = [
    'requestor',
    'brokerageName',
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
