import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { nonAuthGuard } from './core/guards/non-auth.guard';

export const routes: Routes = [
  // Public routes (free tier)
  {
    path: '',
    loadComponent: () => import('./features/file-converter-v1/file-converter-v1.component')
      .then(m => m.FileConverterV1Component),
    title: 'Robinhood Converter',
    canActivate: [nonAuthGuard]
  },  
  {
    path: 'fc-legacy',
    loadComponent: () => import('./core/comps/fc-legacy-wrapper/fc-legacy-wrapper')
      .then(m => m.FcLegacyWrapper),
    title: 'Legacy File Converter'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login/login.component').then(c => c.LoginComponent),
    title: 'Login',
    canActivate: [nonAuthGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/components/signup/signup.component').then(c => c.SignupComponent),
    title: 'Sign Up',
    canActivate: [nonAuthGuard]
  },
  
  // Authenticated routes (paid tier)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/main-layout/main-layout.component')
      .then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent),
        title: 'Dashboard'
      },
      {
        path: 'subscription',
        loadComponent: () => import('./features/subscription/components/subscription-status/subscription-status.component')
          .then(m => m.SubscriptionStatusComponent),
        title: 'Subscription Status'
      },
      {
        path: 'upgrade',
        loadComponent: () => import('./features/subscription/components/upgrade-plan/upgrade-plan.component')
          .then(m => m.UpgradePlanComponent),
        title: 'Upgrade Plan'
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Catch-all route
  { path: '**', redirectTo: '' }
];
