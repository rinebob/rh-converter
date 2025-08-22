import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { type OperatorFunction, Observable, throwError, from } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth, authState, getIdTokenResult } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Attach Firebase ID token from the current user (no localStorage)
    return authState(this.auth).pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          return next.handle(request).pipe(this.handleErrors());
        }
        return from(getIdTokenResult(user)).pipe(
          switchMap(result => {
            const token = result?.token;
            const reqWithAuth = token
              ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
              : request;
            return next.handle(reqWithAuth).pipe(this.handleErrors());
          })
        );
      })
    );
  }

  private handleErrors(): OperatorFunction<HttpEvent<unknown>, HttpEvent<unknown>> {
    return catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
          // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
          // Server-side error
        errorMessage = error.error?.message || error.statusText;
          
          // Handle specific error statuses
        switch (error.status) {
          case 401: {
            const currentUrl = this.router.url || '';
            if (currentUrl.startsWith('/admin')) {
              this.authService.redirectUrl = currentUrl;
              this.router.navigate(['/admin/login']);
              errorMessage = 'An error occurred';
            } else {
                  // Regular app login route
              this.router.navigate(['/login']);
              errorMessage = 'Your session has expired. Please log in again.';
            }
            break;
          }
          case 403:
            errorMessage = 'You do not have permission to perform this action.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again later.';
            break;
          case 500:
            errorMessage = 'A server error occurred. Please try again later.';
            break;
        }
      }

      this.snackBar.open(errorMessage, 'Dismiss', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });

      return throwError(() => error);
    });
  }
}
