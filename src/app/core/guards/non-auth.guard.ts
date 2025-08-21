import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Non-auth guard that prevents authenticated users from accessing public routes
 * Redirects to the dashboard if user is already authenticated
 */
export const nonAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        return true; // Allow access if not authenticated
      }
      // Redirect to dashboard if already authenticated
      return router.createUrlTree(['/dashboard']);
    })
  );
};
