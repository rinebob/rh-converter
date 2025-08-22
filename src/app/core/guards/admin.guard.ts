import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Auth, authState, getIdTokenResult } from '@angular/fire/auth';
import { from, of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guard that restricts routes to users with the admin custom claim.
 * - If not signed in, stash target in AuthService.redirectUrl and go to /admin/login
 * - If signed in but not admin, redirect to /
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const auth = inject(Auth);
  const authSvc = inject(AuthService);

  return authState(auth).pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        // Store the intended URL without exposing it in the query string
        authSvc.redirectUrl = state.url;
        return of(router.createUrlTree(['/admin/login']));
      }
      return from(getIdTokenResult(user)).pipe(
        map(result => {
          const isAdmin = !!result.claims['admin'];
          if (isAdmin) return true;
          return router.createUrlTree(['/']);
        })
      );
    })
  );
};
