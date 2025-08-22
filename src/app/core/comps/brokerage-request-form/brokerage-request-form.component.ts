import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BrokerageRequestsService, SubmitBrokerageRequestPayload } from '../../services/brokerage-requests.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-brokerage-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './brokerage-request-form.component.html',
  styleUrls: ['./brokerage-request-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrokerageRequestFormComponent {
  private readonly svc = inject(BrokerageRequestsService);

  // Form state (signals)
  brokerageName = signal<string>('');
  country = signal<string>('');
  notes = signal<string>('');
  displayName = signal<string>('');
  contactEmail = signal<string>('');
  deviceId = signal<string>('');

  submitting = signal<boolean>(false);
  successId = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  canSubmit = computed(() => !this.submitting() && this.brokerageName().trim().length > 0);

  submit(): void {
    if (!this.canSubmit()) return;

    const payload: SubmitBrokerageRequestPayload = {
      brokerageName: this.brokerageName().trim(),
      country: this.country().trim() || null,
      notes: this.notes().trim() || null,
      displayName: this.displayName().trim() || null,
      contactEmail: this.contactEmail().trim() || null,
      deviceId: this.deviceId().trim() || null,
    };

    this.submitting.set(true);
    this.errorMsg.set(null);
    this.successId.set(null);

    this.svc
      .submitRequest(payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          if (res?.success && res.id) {
            this.successId.set(res.id);
            // reset fields except optional deviceId for convenience
            this.brokerageName.set('');
            this.country.set('');
            this.notes.set('');
            this.displayName.set('');
            this.contactEmail.set('');
          } else {
            this.errorMsg.set(res?.error || 'Request failed.');
          }
        },
        error: () => this.errorMsg.set('Network error. Please try again.'),
      });
  }
}
