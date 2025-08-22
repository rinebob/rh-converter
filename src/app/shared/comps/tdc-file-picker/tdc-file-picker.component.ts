import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * tdc-file-picker: Shared file picker with drag-and-drop for CSV files.
 * - Standalone, Material-styled.
 * - Emits the selected File via signal-based output `fileSelected`.
 * - Accepts `accept` and `disabled` as signal-based inputs.
 */
@Component({
  selector: 'tdc-file-picker',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './tdc-file-picker.component.html',
  styleUrls: ['./tdc-file-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TdcFilePickerComponent {
  // Inputs (signal-based)
  accept = input<string>('.csv,text/csv');
  disabled = input<boolean>(false);

  // Output (signal-based)
  fileSelected = output<File>();

  // Internal state
  dragActive = signal(false);
  selectedFileName = signal<string | null>(null);

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  // Local event handlers
  onButtonClick(): void {
    this.fileInput?.nativeElement?.click();
  }

  onFileInputChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files && inputEl.files[0] ? inputEl.files[0] : null;
    if (!file) return;
    this.selectedFileName.set(file.name);
    this.fileSelected.emit(file);
    // Clear the native input so same file can be picked again later
    inputEl.value = '';
  }

  // Drag & Drop handlers
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
    this.selectedFileName.set(file.name);
    this.fileSelected.emit(file);
  }

  // Window-level guards to avoid browser downloading files when dropped outside target
  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(ev: DragEvent): void {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'none';
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(ev: DragEvent): void {
    ev.preventDefault();
  }
}
