import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

/**
 * BackButtonComponent
 * A reusable, accessible back button. Navigates to history.back() when possible,
 * otherwise routes to a provided fallback URL (default '/').
 */
@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './back-button.component.html',
  styleUrls: ['./back-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButtonComponent {
  // Text label presented on the button
  readonly label = input<string>('Back to site');
  // Fallback home URL if history/back is not available/safe
  readonly home = input<string>('/');

  private readonly doc = inject(DOCUMENT);

  onActivate(): void {
    const win = this.doc.defaultView;
    if (!win) return;

    // If we're within the legal area, always navigate to home to avoid bouncing between child routes
    try {
      const current = new URL(win.location.href);
      if (current.pathname.startsWith('/legal')) {
        win.location.href = this.home();
        return;
      }
    } catch {
      // no-op; fallback to logic below
    }

    const hasHistory = win.history.length > 1;
    const sameOriginRef = !!this.doc.referrer && (() => {
      try {
        const refUrl = new URL(this.doc.referrer);
        return refUrl.origin === win.location.origin;
      } catch {
        return false;
      }
    })();

    if (hasHistory && sameOriginRef) {
      win.history.back();
    } else {
      win.location.href = this.home();
    }
  }
}
