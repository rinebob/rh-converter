import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-brokers-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './brokers-list.component.html',
  styleUrls: ['./brokers-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrokersListComponent {
  // Initially, we can hardcode the list or fetch it later.
  // For now, the HTML will handle the display of "Robinhood".
}
