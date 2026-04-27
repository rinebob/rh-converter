import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, forkJoin, from, of, timer, last } from 'rxjs';
import { catchError, finalize, switchMap, map, tap } from 'rxjs/operators';
import { CLOUD_FUNCTION_URLS } from '../common/constants';
import { ImageFormat } from '../common/interfaces';
import { StorageService, BatchUploadProgress } from './storage.service';
// TODO: Add JSZip when network is available
// import JSZip from 'jszip';

/**
 * Storage file reference for Cloud Function
 */
interface StorageFileReference {
  storagePath: string;
  originalName: string;
}

/**
 * Request body for Cloud Function
 */
interface ImageConversionRequest {
  sessionId: string;
  userId: string;
  files: StorageFileReference[];
  targetFormat: string;
  quality: number;
}

/**
 * Converted file info from Cloud Function
 */
interface ConvertedFileInfo {
  originalName: string;
  convertedName: string;
  downloadUrl: string;
  expiresAt: string;
  size: number;
}

/**
 * Response from Cloud Function
 */
interface ImageConversionResponse {
  success: boolean;
  files: ConvertedFileInfo[];
  sessionId: string;
  error?: string;
}

/**
 * Overall conversion progress
 */
export interface ConversionProgress {
  stage: 'uploading' | 'converting' | 'downloading' | 'complete';
  uploadProgress?: number;
  message: string;
}

/**
 * Service for converting image files using Cloud Storage flow
 */
@Injectable({ providedIn: 'root' })
export class ImageConversionV2Service {
  private readonly http = inject(HttpClient);
  private readonly storageService = inject(StorageService);

  readonly isProcessing = signal<boolean>(false);
  readonly conversionError = signal<string | null>(null);
  readonly progress = signal<ConversionProgress>({ stage: 'uploading', message: 'Preparing...' });

  /**
   * Convert images using Cloud Storage flow
   */
  convertAndDownload(files: File[], targetFormat: ImageFormat = ImageFormat.PNG): void {
    this.isProcessing.set(true);
    this.conversionError.set(null);

    const userId = this.storageService.getUserId();
    const sessionId = this.storageService.generateSessionId();
    
    console.log(`[ImageConversionV2Service] Starting conversion with userId: ${userId}, sessionId: ${sessionId}`);

    // Step 1: Upload files to Storage
    this.progress.set({ stage: 'uploading', uploadProgress: 0, message: 'Uploading files...' });
    
    this.storageService.uploadFiles(files, userId, sessionId).pipe(
      tap((uploadProgress: BatchUploadProgress) => {
        this.progress.set({
          stage: 'uploading',
          uploadProgress: uploadProgress.overallProgress,
          message: `Uploading ${uploadProgress.completedFiles}/${uploadProgress.totalFiles} files...`
        });
      }),
      last(),
      switchMap(() => {
        // Build storage paths from files
        const storagePaths = files.map(file => 
          `image-converter/uploads/${userId}/${sessionId}/${file.name}`
        );
        const fileNames = files.map(file => file.name);

        console.log(`[ImageConversionV2Service] Upload complete, waiting for Storage propagation...`);
        console.log(`[ImageConversionV2Service] Session ID: ${sessionId}`);
        console.log(`[ImageConversionV2Service] Storage paths:`, storagePaths);

        // Wait 2 seconds for Storage to propagate the uploaded files
        return timer(2000).pipe(
          tap(() => {
            console.log(`[ImageConversionV2Service] Calling conversion function after delay`);
            this.progress.set({ stage: 'converting', message: 'Converting images...' });
          }),
          switchMap(() => this.callConversionFunction(userId, sessionId, storagePaths, fileNames, targetFormat))
        );
      }),
      switchMap((response: ImageConversionResponse) => {
        if (!response.success) {
          throw new Error(response.error || 'Conversion failed');
        }

        // Step 3: Download converted files
        this.progress.set({ stage: 'downloading', message: 'Downloading converted files...' });
        return this.downloadConvertedFiles(response.files, response.sessionId, targetFormat);
      }),
      finalize(() => {
        this.isProcessing.set(false);
      })
    ).subscribe({
      next: (blob) => {
        this.progress.set({ stage: 'complete', message: 'Download complete!' });
        const filename = this.generateDownloadFilename(files, targetFormat);
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('[ImageConversionV2Service] Conversion failed:', error);
        this.conversionError.set(error.message || 'Conversion failed');
        this.progress.set({ stage: 'uploading', message: 'Error occurred' });
      }
    });
  }

  /**
   * Call Cloud Function with storage paths
   */
  private callConversionFunction(
    userId: string,
    sessionId: string,
    storagePaths: string[],
    fileNames: string[],
    targetFormat: ImageFormat
  ): Observable<ImageConversionResponse> {
    const files: StorageFileReference[] = storagePaths.map((path, index) => ({
      storagePath: path,
      originalName: fileNames[index]
    }));

    const requestBody: ImageConversionRequest = {
      sessionId,
      userId,
      files,
      targetFormat,
      quality: 100
    };

    const url = CLOUD_FUNCTION_URLS.CONVERT_IMAGE_V2;

    return this.http.post<ImageConversionResponse>(url, requestBody).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error))
    );
  }

  /**
   * Download converted files from Storage using Firebase SDK
   */
  private downloadConvertedFiles(files: ConvertedFileInfo[], sessionId: string, targetFormat: ImageFormat): Observable<Blob> {
    if (files.length === 1) {
      // Single file - download directly from Storage
      const storagePath = `image-converter/converted/${this.storageService.getUserId()}/${sessionId}/${files[0].convertedName}`;
      return from(this.storageService.downloadFile(storagePath));
    } else {
      // Multiple files - download first file only for now
      // TODO: Create ZIP when JSZip is available
      console.warn('Multiple file download: Downloading first file only. Install JSZip for ZIP support.');
      const storagePath = `image-converter/converted/${this.storageService.getUserId()}/${sessionId}/${files[0].convertedName}`;
      return from(this.storageService.downloadFile(storagePath));
    }
  }

  /**
   * Generate appropriate filename for download
   */
  private generateDownloadFilename(files: File[], targetFormat: ImageFormat): string {
    const originalName = files[0].name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    
    if (files.length === 1) {
      return `${nameWithoutExt}.${targetFormat}`;
    } else {
      // TODO: Return ZIP filename when JSZip is available
      return `${nameWithoutExt}.${targetFormat}`;
    }
  }

  /**
   * Trigger browser download of a Blob
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
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Image conversion failed';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network error: ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your connection.';
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
