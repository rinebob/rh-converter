import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup;
  error: string | null = null;
  loading = false;
  hidePassword = true;
  // Path to Google logo asset used in the OAuth button
  googleLogoUrl = 'assets/google-logo.svg';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Preserve redirect target (e.g. /admin/...) if provided
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    if (redirect) this.authService.redirectUrl = redirect;
  }

  async onSubmit() {
    if (this.loginForm.invalid || this.loading) return;

    this.loading = true;
    this.error = null;

    try {
      const { email, password } = this.loginForm.value as { email: string; password: string };
      await this.authService.signIn(email, password);
    } catch (e: any) {
      this.error = e?.message || 'Failed to sign in.';
    } finally {
      this.loading = false;
    }
  }

  async onGoogleSignIn() {
    if (this.loading) return;
    this.loading = true;
    this.error = null;
    try {
      await this.authService.signInWithGoogle();
    } catch (e: any) {
      this.error = e?.message || 'Failed to sign in with Google.';
    } finally {
      this.loading = false;
    }
  }
}
