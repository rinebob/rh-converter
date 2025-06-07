import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export const subscriptionGuard: CanActivateFn = (route, state) => {
  const subscriptionService = inject(SubscriptionService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  
  const plan = subscriptionService.currentPlan();
  
  if (plan && plan.id !== 'free') {
    return true;
  }
  
  // Show upgrade message
  snackBar.open(
    'This feature requires a paid subscription. Upgrade now to access all features.',
    'Upgrade',
    { duration: 5000 }
  );
  
  // Redirect to upgrade page
  router.navigate(['/upgrade'], {
    queryParams: { returnUrl: state.url }
  });
  
  return false;
};

/**
 * Guard that checks if the user has used their free tier limit
 */
export const usageGuard: CanActivateFn = () => {
  const subscriptionService = inject(SubscriptionService);
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  
  const usage = subscriptionService.usage();
  
  if (!usage || usage.isWithinLimit) {
    return true;
  }
  
  // Show upgrade message
  snackBar.open(
    `You've reached your monthly limit of ${usage.monthlyLimit} records. Upgrade to process more.`,
    'Upgrade',
    { duration: 5000 }
  );
  
  // Redirect to upgrade page
  router.navigate(['/upgrade']);
  
  return false;
};
