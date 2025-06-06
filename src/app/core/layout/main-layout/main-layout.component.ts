import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
// Define User interface locally
interface User {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  uid?: string;
}
import { Observable } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../services/auth.service';
import { SubscriptionService } from '../../services/subscription.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatProgressBarModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  private breakpointObserver = inject(BreakpointObserver);
  protected router = inject(Router);
  protected authService = inject(AuthService);
  protected subscriptionService = inject(SubscriptionService);
  
  // Current user observable with proper typing
  currentUser$ = this.authService.currentUser$ as Observable<User | null>;
  
  // Responsive breakpoint for mobile view
  isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset);
  
  closeSidenavIfHandset() {
    if (this.isHandset$) {
      // Implementation for closing sidenav would go here
    }
  }
  
  upgradePlan() {
    this.router.navigate(['/subscription/upgrade']);
  }
  
  signOut() {
    this.authService.signOut();
  }
}
