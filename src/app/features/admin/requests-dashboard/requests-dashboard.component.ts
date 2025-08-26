import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { toSignal } from '@angular/core/rxjs-interop';
import { BrokerageRequestsService, AdminListItemDto } from '../../../core/services/brokerage-requests.service';
import { RequestStatus, REQUEST_STATUS_LABEL } from '../../../core/common/interfaces';

// Simple sorting keys
type SortKey = 'hotScore' | 'upvoteCount' | 'last24hVotes' | 'last7dVotes' | 'lastActivityMs' | 'createdAt';

@Component({
  selector: 'app-requests-dashboard',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, MatButtonModule],
  templateUrl: './requests-dashboard.component.html',
  styleUrls: ['./requests-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestsDashboardComponent {
  private readonly svc = inject(BrokerageRequestsService);

  // Raw data
  private readonly responseSig = toSignal(this.svc.listRequests());

  // Filters & sorting (signals)
  readonly statusFilter = signal<'all' | RequestStatus>('all');
  readonly onlyWithExample = signal<boolean>(false);
  readonly sortKey = signal<SortKey>('hotScore');
  readonly sortDesc = signal<boolean>(true);

  // Expose statuses and labels for template
  readonly statuses = Object.values(RequestStatus) as RequestStatus[];
  readonly statusLabel = REQUEST_STATUS_LABEL;

  // Derived list with filters and sorting
  readonly rows = computed<AdminListItemDto[]>(() => {
    const res = this.responseSig();
    const items = res?.items ?? [];

    const status = this.statusFilter();
    const withExample = this.onlyWithExample();

    let filtered = items.filter(r => (status === 'all' ? true : r.status === status));
    if (withExample) filtered = filtered.filter(r => !!r.hasExampleFile);

    const key = this.sortKey();
    const desc = this.sortDesc();
    const sorted = [...filtered].sort((a, b) => {
      const av = (a as any)[key] ?? 0;
      const bv = (b as any)[key] ?? 0;
      return desc ? (bv - av) : (av - bv);
    });

    return sorted;
  });

  readonly displayedColumns: ReadonlyArray<string> = [
    'displayName',
    'brokerageName',
    'country',
    'upvoteCount',
    'last24hVotes',
    'last7dVotes',
    'repliesCount',
    'hasExampleFile',
    'lastActivity',
    'hotScore',
  ];

  // UI actions
  toggleSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDesc.update(v => !v);
    } else {
      this.sortKey.set(key);
      this.sortDesc.set(true);
    }
  }
}
