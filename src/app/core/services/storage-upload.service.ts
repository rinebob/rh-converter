import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytesResumable } from '@angular/fire/storage';
import { Observable } from 'rxjs';

export interface UploadProgress {
  state: 'running' | 'paused' | 'success' | 'error';
  bytesTransferred: number;
  totalBytes: number;
  progressPct: number; // 0..100
  path?: string; // available on success
  error?: string; // available on error
}

/**
 * Service to upload client-selected files to Firebase Storage with progress updates.
 * Uses RxJS to stream progress without Promises per project rules.
 */
@Injectable({ providedIn: 'root' })
export class StorageUploadService {
  private readonly storage = inject(Storage);

  private log(message: string, data?: unknown): void {
    // Centralized logging for easy filtering
    if (data !== undefined) {
      console.log('[sUSvc uC StorageUploadService]', message, data);
    } else {
      console.log('[sUSvc uC StorageUploadService]', message);
    }
  }

  /**
   * Upload a file to the given storage path using a resumable upload and emit progress.
   * Attaches custom metadata { deviceId } so Storage rules can enforce presence.
   */
  uploadCsv(path: string, file: File, deviceId: string): Observable<UploadProgress> {
    return new Observable<UploadProgress>((subscriber) => {
      const deviceIdTail = deviceId?.slice(-6) || 'unknown';
      this.log('Starting upload', { path, size: file?.size, type: file?.type, deviceIdTail });
      const objectRef = ref(this.storage, path);
      const task = uploadBytesResumable(objectRef, file, {
        contentType: 'text/csv',
        customMetadata: { deviceId },
      });

      const emit = (state: UploadProgress['state'], extra?: Partial<UploadProgress>) => {
        const bytesTransferred = task.snapshot.bytesTransferred;
        const totalBytes = task.snapshot.totalBytes || file.size || 1;
        const progressPct = Math.round((bytesTransferred / totalBytes) * 100);
        if (state === 'running') {
          this.log('Progress', { path, bytesTransferred, totalBytes, progressPct });
        }
        subscriber.next({ state, bytesTransferred, totalBytes, progressPct, ...extra });
      };

      const onProgress = () => emit('running');
      const onError = (err: unknown) => {
        this.log('Error', { path, error: (err as any)?.message || err });
        emit('error', { error: (err as any)?.message || 'Upload failed' });
        subscriber.complete();
      };
      const onSuccess = () => {
        this.log('Success', { path, totalBytes: file?.size });
        emit('success', { path });
      };

      task.on('state_changed', onProgress, onError, onSuccess);

      return () => {
        try {
          this.log('Teardown: cancel (if running)', { path });
          task.cancel();
        } catch {}
      };
    });
  }
}
