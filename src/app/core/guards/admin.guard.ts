import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Auth, authState, getIdTokenResult } from '@angular/fire/auth';
import { from, of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';

/**
 * Guard that restricts routes to users with the admin custom claim.
 * - If not signed in, redirect to /login?redirect=<state.url>
 * - If signed in but not admin, redirect to /
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const auth = inject(Auth);

  return authState(auth).pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        return of(router.createUrlTree(['/login'], { queryParams: { redirect: state.url } }));
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
