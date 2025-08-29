import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { nonAuthGuard } from './core/guards/non-auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Public routes (free tier)
  {
    path: '',
    loadComponent: () => import('./features/file-converter-v1/file-converter-v1.component')
      .then(m => m.FileConverterV1Component),
    title: 'Trade Data File Converter',
    // canActivate: [nonAuthGuard],
    pathMatch: 'full'
  },  
  {
    path: 'fc-legacy',
    loadComponent: () => import('./core/comps/fc-legacy-wrapper/fc-legacy-wrapper')
      .then(m => m.FcLegacyWrapper),
    title: 'Legacy File Converter'
  },
  // Legal routes (Angular-routed)
  {
    path: 'legal',
    loadComponent: () => import('./features/legal/legal-layout/legal-layout.component')
      .then(m => m.LegalLayoutComponent),
    children: [
      { path: '', redirectTo: 'privacy-policy', pathMatch: 'full' },
      {
        path: 'privacy-policy',
        loadComponent: () => import('./features/legal/legal-doc/legal-doc.component').then(c => c.LegalDocComponent),
        data: { src: '/legal/privacy-policy', title: 'Privacy Policy' }
      },
      {
        path: 'terms-of-service',
        loadComponent: () => import('./features/legal/legal-doc/legal-doc.component').then(c => c.LegalDocComponent),
        data: { src: '/legal/terms-of-service', title: 'Terms of Service' }
      },
      // Deprecated slugs → redirects
      { path: 'acceptable-use', redirectTo: 'terms-of-service', pathMatch: 'full' },
      { path: 'disclaimer', redirectTo: 'terms-of-service', pathMatch: 'full' },
      { path: 'security', redirectTo: 'terms-of-service', pathMatch: 'full' },
      { path: 'cookie-policy', redirectTo: 'privacy-policy', pathMatch: 'full' },
      { path: 'california-privacy', redirectTo: 'privacy-policy', pathMatch: 'full' },
      { path: 'processors', redirectTo: 'privacy-policy', pathMatch: 'full' },
      { path: 'accessibility', redirectTo: 'terms-of-service', pathMatch: 'full' },
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login/login.component').then(c => c.LoginComponent),
    title: 'Login',
    canActivate: [nonAuthGuard]
  },
  // Admin login (kept separate from app-wide login to avoid one-off logic)
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/admin-login/admin-login.component').then(c => c.AdminLoginComponent),
    title: 'Admin Login',
    canActivate: [nonAuthGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/components/signup/signup.component').then(c => c.SignupComponent),
    title: 'Sign Up',
    canActivate: [nonAuthGuard]
  },

  // Admin routes protected by Firebase Auth adminGuard
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./core/layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'brokerage-requests', pathMatch: 'full' },
      {
        path: 'brokerage-requests',
        loadComponent: () => import('./features/admin/brokerage-requests/admin-brokerage-requests.component')
          .then(m => m.AdminBrokerageRequestsComponent),
        title: 'Admin • Brokerage Requests'
      },
      {
        path: 'requests-dashboard',
        loadComponent: () => import('./features/admin/requests-dashboard/requests-dashboard.component')
          .then(m => m.RequestsDashboardComponent),
        title: 'Admin • Requests Dashboard'
      }
    ]
  },
  
  // Authenticated routes (paid tier)
  {
    path: 'main-layout',
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
