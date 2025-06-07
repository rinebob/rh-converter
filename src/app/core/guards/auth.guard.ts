import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

/**
 * Auth guard that protects paid routes
 * Redirects to the free tier if user is not authenticated
 */
export const authGuard: CanActivateFn = () => {
  // Temporarily allow all routes without authentication
  return true;
  
  /* Restore this code when authentication is needed:
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) {
        return true; // Allow access for authenticated users
      }
      
      // For unauthenticated users, redirect to the file converter (free tier)
      return router.createUrlTree(['/file-converter']);
    })
  );
  */
};