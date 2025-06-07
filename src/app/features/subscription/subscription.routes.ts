import { Routes } from '@angular/router';
import { subscriptionGuard } from '../../core/guards/subscription.guard';
import { UpgradePlanComponent } from './components/upgrade-plan/upgrade-plan.component';

export const SUBSCRIPTION_ROUTES: Routes = [
  {
    path: 'upgrade',
    component: UpgradePlanComponent,
    title: 'Upgrade Plan',
    canActivate: [subscriptionGuard]
  },
  // Add more subscription-related routes here
];
