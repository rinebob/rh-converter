import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BrokerageRequestsService, SubmitBrokerageRequestPayload } from '../../services/brokerage-requests.service';
import { finalize } from 'rxjs/operators';
import { StorageUploadService, type UploadProgress } from '../../services/storage-upload.service';
import { DeviceIdService } from '../../services/device-id.service';
import { TdcFilePickerComponent } from '../../../shared/comps/tdc-file-picker/tdc-file-picker.component';
import { AnonymousNameService } from '../../services/anonymous-name.service';

// Helpers for filename construction
const sanitizeForFilename = (s: string): string =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unknown';

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const makeHashId = (): string =>
  (crypto && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID().slice(0, 8)
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

@Component({
  selector: 'app-brokerage-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressBarModule, TdcFilePickerComponent],
  templateUrl: './brokerage-request-form.component.html',
  styleUrls: ['./brokerage-request-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrokerageRequestFormComponent {
  private readonly svc = inject(BrokerageRequestsService);
  private readonly uploadSvc = inject(StorageUploadService);
  private readonly deviceIdSvc = inject(DeviceIdService);
  private readonly anonNameSvc = inject(AnonymousNameService);

  constructor() {
    this.initDisplayName();
  }

  // Form state (signals)
  brokerageName = signal<string>('');
  country = signal<string>('');
  notes = signal<string>('');
  displayName = signal<string>('');
  deviceId = signal<string>('');

  submitting = signal<boolean>(false);
  successId = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // CSV upload state
  selectedFile = signal<File | null>(null);
  uploadError = signal<string | null>(null);
  uploading = signal<boolean>(false);
  uploadPct = signal<number>(0);
  exampleFilePath = signal<string | null>(null);
  previewText = signal<string>('');
  // Drag-and-drop visual state for the drop zone
  dragActive = signal<boolean>(false);

  // Reference to the native file input to clear its value
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;
  // Reference to shared file picker to clear displayed filename programmatically
  @ViewChild(TdcFilePickerComponent) private filePicker?: TdcFilePickerComponent;

  // Auto-dismiss success message after a delay
  private readonly successClearMs = 10000; // 10s
  private successTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly autoDismissEffect = effect((onCleanup) => {
    const id = this.successId();
    if (id) {
      if (this.successTimer) clearTimeout(this.successTimer);
      this.successTimer = setTimeout(() => {
        // Only clear the success message after delay; file state is cleared immediately on success
        this.successId.set(null);
        this.successTimer = null;
      }, this.successClearMs);
    }
    onCleanup(() => {
      if (this.successTimer) {
        clearTimeout(this.successTimer);
        this.successTimer = null;
      }
    });
  });

  // Keep component deviceId in sync with globally auto-generated device id
  private readonly deviceIdSync = effect(() => {
    const id = this.deviceIdSvc.deviceId();
    if (id && id !== this.deviceId()) this.deviceId.set(id);
  });

  // One-time initialization of displayName using persistent anonymous name from localStorage
  private initDisplayName(): void {
    const current = (this.displayName() || '').trim();
    if (!current) {
      const fallbackName = (this.anonNameSvc.getName() || '').toString().trim();
      if (fallbackName) this.displayName.set(fallbackName.slice(0, 50));
    }
  }

  canSubmit = computed(() => !this.submitting() && this.brokerageName().trim().length > 0);

  // ----- CSV upload handlers -----
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    this.handleNewFile(file);
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
    this.previewText.set('');
    this.uploadPct.set(0);
    this.uploading.set(false);
    this.uploadError.set(null);
    this.exampleFilePath.set(null);
    // Clear the native input value so the filename disappears and the same file can be re-selected
    const el = this.fileInput?.nativeElement;
    if (el) el.value = '';
    // Clear the shared file picker displayed filename
    this.filePicker?.clear();
  }

  private handleNewFile(file: File): void {
    this.uploadError.set(null);
    // Validate type and size
    const maxBytes = 5 * 1024 * 1024; // 5 MB
    const nameLower = (file.name || '').toLowerCase();
    const isCsv = nameLower.endsWith('.csv') || file.type === 'text/csv';
    if (!isCsv) {
      this.uploadError.set('Please select a .csv file.');
      return;
    }
    if (file.size > maxBytes) {
      this.uploadError.set('File too large. Max 5 MB.');
      return;
    }

    // Require deviceId to satisfy Storage rules
    const did = this.deviceId().trim();
    if (!did) {
      this.uploadError.set('Device ID not ready yet. Please wait a moment or reload and try again.');
      return;
    }

    // Defer upload until user clicks Submit; just store and preview
    this.selectedFile.set(file);
    this.previewCsv(file);
  }

  private previewCsv(file: File): void {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        const firstLines = text.split(/\r?\n/).slice(0, 15).join('\n');
        this.previewText.set(firstLines);
      };
      const slice = file.slice(0, 64 * 1024); // read first 64KB
      reader.readAsText(slice);
    } catch {
      // ignore preview errors
      this.previewText.set('');
    }
  }

  private uploadCsv(file: File, afterSuccess?: () => void): void {
    // Build a path: csv-example-uploads/{brokerageName}_{yyyy-mm-dd}_{hash}.csv
    const now = new Date();
    const dateStr = formatDate(now);
    const nameSlug = sanitizeForFilename(this.brokerageName());
    const hash = makeHashId();
    const filename = `${nameSlug}_${dateStr}_${hash}.csv`;
    const path = `csv-example-uploads/${filename}`;

    this.uploading.set(true);
    this.uploadPct.set(0);
    this.exampleFilePath.set(null);

    const did = this.deviceId().trim();

    this.uploadSvc.uploadCsv(path, file, did).subscribe({
      next: (p: UploadProgress) => {
        if (p.state === 'running') {
          this.uploadPct.set(p.progressPct);
        } else if (p.state === 'success') {
          this.uploadPct.set(100);
          this.exampleFilePath.set(p.path ?? path);
          this.uploading.set(false);
          if (afterSuccess) afterSuccess();
        } else if (p.state === 'error') {
          this.uploading.set(false);
          this.uploadError.set(p.error || 'Upload failed');
        }
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('Upload failed');
      },
      complete: () => {
        // no-op
      },
    });
  }

  // Handler for tdc-file-picker output
  onPicked(file: File): void {
    this.handleNewFile(file);
  }

  // ----- Drag & Drop Handlers -----
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragActive.set(true);
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive.set(false);
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    this.handleNewFile(file);
  }

  // Window-level guards so dropping outside the target doesn't trigger a download/navigation
  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(ev: DragEvent): void {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'none';
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(ev: DragEvent): void {
    ev.preventDefault();
  }

  submit(): void {
    if (!this.canSubmit()) return;

    // If a file is selected and not yet uploaded, upload first then submit
    const file = this.selectedFile();
    if (file && !this.exampleFilePath()) {
      // Ensure brokerage name present (required by canSubmit)
      this.uploadCsv(file, () => this.submitRequestNow());
      return;
    }

    // No file or already uploaded
    this.submitRequestNow();
  }

  private submitRequestNow(): void {
    const fallbackName = (this.anonNameSvc.getName() || '').toString().trim().slice(0, 50);
    const nameWithFallback = (this.displayName().trim() || fallbackName);

    const payload: SubmitBrokerageRequestPayload = {
      brokerageName: this.brokerageName().trim(),
      country: this.country().trim() || null,
      notes: this.notes().trim() || null,
      displayName: nameWithFallback || null,
      deviceId: this.deviceId().trim() || null,
      exampleFilePath: this.exampleFilePath() || null,
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
            // Preserve displayName for subsequent requests; if empty, seed with fallback
            if (!this.displayName().trim()) {
              this.displayName.set(fallbackName);
            }
            // Clear the file picker and preview immediately upon success
            this.removeSelectedFile();
          } else {
            this.errorMsg.set(res?.error || 'Request failed.');
          }
        },
        error: () => this.errorMsg.set('Network error. Please try again.'),
      });
  }

  // Allow manual dismissal to also clear file preview/metadata
  dismissSuccess(): void {
    this.removeSelectedFile();
    this.successId.set(null);
  }
}
