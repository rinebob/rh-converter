import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from '../../auth/components/login/login.component';

/**
 * AdminLoginComponent
 * Thin wrapper to reuse the app-wide LoginComponent for admin login.
 * - Sets a default redirect to '/admin' if none is provided via ?redirect=
 * - Renders the same UI/logic by embedding <app-login />
 */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [LoginComponent],
  template: `<app-login />`,
})
export class AdminLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // If a redirect was already stashed by adminGuard, keep it.
    if (!this.auth.redirectUrl) {
      const redirect = this.route.snapshot.queryParamMap.get('redirect');
      this.auth.redirectUrl = redirect || '/admin';
    }
  }
}
