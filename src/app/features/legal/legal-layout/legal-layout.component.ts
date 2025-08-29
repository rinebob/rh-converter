import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackButtonComponent } from '../back-button/back-button.component';

/**
 * LegalLayoutComponent
 * Wraps all legal routes, provides a consistent header area with a back button.
 */
@Component({
  selector: 'app-legal-layout',
  standalone: true,
  imports: [RouterOutlet, BackButtonComponent],
  template: `
    <app-back-button></app-back-button>
    <router-outlet></router-outlet>
  `,
  styleUrls: ['./legal-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalLayoutComponent {}
