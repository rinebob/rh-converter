import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SubscriptionStatusComponent } from '../subscription/components/subscription-status/subscription-status.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    SubscriptionStatusComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  protected subscriptionService = inject(SubscriptionService);
  private router = inject(Router);
  
  upgradePlan() {
    this.router.navigate(['/subscription/upgrade']);
  }
}
