import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { map } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { SubscriptionPlan } from '../../../../core/common/interfaces';

interface PlanCard extends Omit<SubscriptionPlan, 'maxFiles' | 'maxFileSize'> {
  pricePerMonth: number;
  isCurrent: boolean;
}

@Component({
  selector: 'app-upgrade-plan',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './upgrade-plan.component.html',
  styleUrls: ['./upgrade-plan.component.scss']
})
export class UpgradePlanComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private router = inject(Router);
  
  loading = signal(true);
  plans = signal<PlanCard[]>([]);
  
  ngOnInit(): void {
    this.loadPlans();
  }

  private loadPlans(): void {
    this.loading.set(true);
    
    this.subscriptionService.loadPlans().subscribe({
      next: () => {
        // Convert the currentPlan signal to an observable
        toObservable(this.subscriptionService.currentPlan).pipe(
          map(currentPlan => {
            return this.subscriptionService.plans().map(plan => ({
              ...plan,
              isPopular: plan.id === 'pro',
              pricePerMonth: plan.interval === 'year' 
                ? Math.round((plan.price / 12) * 100) / 100 
                : plan.price,
              isCurrent: currentPlan?.id === plan.id
            }));
          })
        ).subscribe(plans => {
          this.plans.set(plans);
          this.loading.set(false);
        });
      },
      error: (err) => {
        console.error('Failed to load plans', err);
        this.loading.set(false);
      }
    });
  }
  
  selectPlan(plan: PlanCard) {
    if (plan.isCurrent || !plan.id) return;
    
    this.loading.set(true);
    
    this.subscriptionService.createCheckoutSession(plan.id).subscribe({
      next: (response) => {
        if (response && 'sessionId' in response) {
          // The backend should handle the redirect to the Stripe Checkout page
          // using the sessionId in the response
          console.log('Checkout session created with ID:', response.sessionId);
          // The actual redirect will be handled by the backend's response
          // or you can construct the URL if needed based on your implementation
        } else {
          console.error('Invalid checkout session response');
          this.loading.set(false);
        }
      },
      error: (err: Error) => {
        console.error('Failed to create checkout session', err);
        this.loading.set(false);
      }
    });
  }
}
