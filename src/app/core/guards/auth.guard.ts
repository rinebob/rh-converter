import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Auth guard that protects paid routes
 * Redirects to the free tier if user is not authenticated
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) {
        return true; // Allow access for authenticated users
      }
      
      // For unauthenticated users, redirect to the file converter (free tier)
      return router.createUrlTree(['/']);
    })
  );
};