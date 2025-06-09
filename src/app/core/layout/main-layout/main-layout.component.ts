import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { SubscriptionService } from '../../services/subscription.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';

// Define User interface locally since we don't have the model
interface User {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  uid?: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatProgressBarModule,
    MatMenuModule,
    RouterModule
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
  
  currentUser$ = this.authService.currentUser$ as Observable<User | null>;
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
