import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { CLOUD_FUNCTION_URLS } from '../common/constants';
import { ImageFormat } from '../common/interfaces';

/**
 * Service for converting image files using the Cloud Function backend.
 * Handles file uploads, conversion requests, and download triggering.
 */
@Injectable({ providedIn: 'root' })
export class ImageConversionService {
  private readonly http = inject(HttpClient);

  readonly isProcessing = signal<boolean>(false);
  readonly conversionError = signal<string | null>(null);

  /**
   * Convert one or more image files to the specified target format.
   * Returns a Blob containing either a single converted image or a ZIP file with multiple images.
   */
  convertImages(files: File[], targetFormat: ImageFormat = ImageFormat.PNG): Observable<Blob> {
    this.isProcessing.set(true);
    this.conversionError.set(null);

    const formData = this.buildFormData(files);
    const url = this.buildRequestUrl(targetFormat);

    return this.http.post(url, formData, {
      responseType: 'blob',
      observe: 'body'
    }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error)),
      finalize(() => this.isProcessing.set(false))
    );
  }

  /**
   * Convert images and automatically trigger download.
   */
  convertAndDownload(files: File[], targetFormat: ImageFormat = ImageFormat.PNG): void {
    this.convertImages(files, targetFormat).subscribe({
      next: (blob) => {
        const filename = this.generateDownloadFilename(files, targetFormat);
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('[ImageConversionService] Conversion failed:', error);
        this.conversionError.set(error.message || 'Conversion failed');
      }
    });
  }

  /**
   * Build FormData with all files to upload.
   */
  private buildFormData(files: File[]): FormData {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file, file.name);
    });
    return formData;
  }

  /**
   * Build the request URL with query parameters.
   */
  private buildRequestUrl(targetFormat: ImageFormat): string {
    const baseUrl = CLOUD_FUNCTION_URLS.CONVERT_IMAGE;
    const params = new URLSearchParams({
      targetFormat: targetFormat,
      quality: '100'
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate appropriate filename for download.
   */
  private generateDownloadFilename(files: File[], targetFormat: ImageFormat): string {
    if (files.length === 1) {
      const originalName = files[0].name;
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      return `${nameWithoutExt}.${targetFormat}`;
    } else {
      const timestamp = new Date().toISOString().split('T')[0];
      return `converted-images-${timestamp}.zip`;
    }
  }

  /**
   * Trigger browser download of a Blob.
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Handle HTTP errors and convert to user-friendly messages.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Image conversion failed';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network error: ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your connection.';
    } else if (error.status === 413) {
      errorMessage = 'Files too large. Please reduce file size or number of files.';
    } else if (error.status === 400) {
      errorMessage = 'Invalid request. Please check file formats.';
    } else if (error.status === 500) {
      errorMessage = 'Server error during conversion. Please try again.';
    } else if (error.status === 504) {
      errorMessage = 'Conversion timed out. Please try with fewer files.';
    } else {
      errorMessage = `Conversion failed: ${error.statusText || 'Unknown error'}`;
    }

    this.conversionError.set(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
