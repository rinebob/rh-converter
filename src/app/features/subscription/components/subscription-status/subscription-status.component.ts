import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { 
  SubscriptionPlan, 
  UsageInfo, 
  BillingInfo
} from '../../../../core/common/interfaces';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-subscription-status',
  templateUrl: './subscription-status.component.html',
  styleUrls: ['./subscription-status.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatProgressBarModule,
    MatProgressSpinnerModule
  ]
})
export class SubscriptionStatusComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private router = inject(Router);

  // Current subscription plan
  currentPlan = this.subscriptionService.currentPlan;
  
  // Usage information
  usage = this.subscriptionService.usage;
  
  // Loading state
  isLoading = signal(true);
  
  // Error state
  error = signal<string | null>(null);
  
  // Check if user is on free tier
  isFreeTier = this.subscriptionService.isFreeTier;
  
  // Usage description
  get usageDescription(): string {
    const usage = this.usageInfo;
    if (!usage) return 'Loading usage data...';
    return `You've used ${usage.currentCount} of ${usage.monthlyLimit} records this month.`;
  }
  
  // Get the current usage info
  get usageInfo(): UsageInfo | null {
    return this.subscriptionService.usage();
  }
  
  // Get the current plan
  get currentPlanInfo(): SubscriptionPlan | null {
    return this.subscriptionService.currentPlan();
  }
  
  // Check if the current plan is free tier
  get isPlanFreeTier(): boolean {
    return this.subscriptionService.isFreeTier();
  }

  constructor() { }

  ngOnInit(): void {
    // Initial load
    this.loadSubscriptionData();
  }

  private async loadSubscriptionData() {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      
      // Load plans, current plan, and usage in parallel
      await Promise.all([
        this.subscriptionService.loadPlans().toPromise(),
        this.subscriptionService.loadCurrentPlan().toPromise(),
        this.subscriptionService.loadUsage().toPromise()
      ]);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      this.error.set('Failed to load subscription data. Please try again later.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Navigate to upgrade plan page
   */
  upgradePlan() {
    this.router.navigate(['/subscription/upgrade']);
  }

  /**
   * Open customer portal to manage subscription
   */
  manageSubscription() {
    this.subscriptionService.openCustomerPortal().subscribe({
      error: (err) => {
        console.error('Failed to open customer portal:', err);
        this.error.set('Failed to open customer portal. Please try again later.');
      }
    });
  }
}
