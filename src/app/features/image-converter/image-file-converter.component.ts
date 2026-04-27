import { Component, inject, signal, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TdcFilePickerComponent } from 'src/app/shared/comps/tdc-file-picker/tdc-file-picker.component';
import { ImageConversionV2Service } from 'src/app/core/services/image-conversion-v2.service';
import { ImageFormat } from 'src/app/core/common/interfaces';

/**
 * Component for converting image files between different formats.
 * Supports batch conversion of BMP, PNG, and JPG files.
 * Primary use case: BMP → PNG conversion.
 */
@Component({
  selector: 'rh-image-file-converter',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
    TdcFilePickerComponent
  ],
  templateUrl: './image-file-converter.component.html',
  styleUrls: ['./image-file-converter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageFileConverterComponent {
  private readonly conversionService = inject(ImageConversionV2Service);

  readonly filePicker = viewChild(TdcFilePickerComponent);

  readonly selectedFiles = signal<File[]>([]);
  readonly targetFormat = signal<ImageFormat>(ImageFormat.PNG);
  
  readonly ImageFormat = ImageFormat;
  
  readonly formats = [
    { value: ImageFormat.PNG, label: 'PNG' },
    { value: ImageFormat.JPG, label: 'JPG' },
    { value: ImageFormat.BMP, label: 'BMP' }
  ] as const;

  get isProcessing() {
    return this.conversionService.isProcessing;
  }

  get conversionError() {
    return this.conversionService.conversionError;
  }

  get progress() {
    return this.conversionService.progress;
  }

  get isConvertDisabled(): boolean {
    return this.selectedFiles().length === 0 || this.isProcessing();
  }

  onFilesPicked(files: File[]): void {
    const currentFiles = this.selectedFiles();
    this.selectedFiles.set([...currentFiles, ...files]);
  }

  removeFile(index: number): void {
    const currentFiles = this.selectedFiles();
    const updatedFiles = currentFiles.filter((_, i) => i !== index);
    this.selectedFiles.set(updatedFiles);
  }

  clearAllFiles(): void {
    this.selectedFiles.set([]);
    this.filePicker()?.clear();
  }

  onConvertClicked(): void {
    const files = this.selectedFiles();
    const format = this.targetFormat();
    
    if (files.length === 0) return;

    this.conversionService.convertAndDownload(files, format);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  }
}
