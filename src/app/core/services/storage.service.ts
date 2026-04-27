import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytesResumable, UploadTaskSnapshot } from '@angular/fire/storage';
import { Observable, from, map } from 'rxjs';

/**
 * Service for managing Cloud Storage operations for image converter
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage = inject(Storage);
  private readonly USER_ID_KEY = 'rh-converter-user-id';

  /**
   * Get or generate a unique user ID
   * Stored in localStorage for persistence
   */
  getUserId(): string {
    let userId = localStorage.getItem(this.USER_ID_KEY);
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem(this.USER_ID_KEY, userId);
    }
    return userId;
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a unique session ID for a conversion batch
   */
  generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Upload a single file to Cloud Storage with progress tracking
   */
  uploadFile(file: File, userId: string, sessionId: string): Observable<UploadProgress> {
    const storagePath = `image-converter/uploads/${userId}/${sessionId}/${file.name}`;
    console.log(`[StorageService] Uploading to path: ${storagePath}`);
    console.log(`[StorageService] Session ID: ${sessionId}`);
    const storageRef = ref(this.storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Observable<UploadProgress>(observer => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          observer.next({
            fileName: file.name,
            progress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            state: snapshot.state,
            storagePath
          });
        },
        (error) => {
          console.error('Upload error:', error);
          observer.error(error);
        },
        () => {
          observer.next({
            fileName: file.name,
            progress: 100,
            bytesTransferred: file.size,
            totalBytes: file.size,
            state: 'success',
            storagePath
          });
          observer.complete();
        }
      );
    });
  }

  /**
   * Upload multiple files in parallel with progress tracking
   */
  uploadFiles(files: File[], userId: string, sessionId: string): Observable<BatchUploadProgress> {
    const totalFiles = files.length;
    const fileProgress = new Map<string, number>();
    let completedFiles = 0;

    return new Observable<BatchUploadProgress>(observer => {
      // Upload all files in parallel
      const uploads = files.map(file => {
        return this.uploadFile(file, userId, sessionId).subscribe({
          next: (progress) => {
            fileProgress.set(progress.fileName, progress.progress);
            
            // Calculate overall progress
            const totalProgress = Array.from(fileProgress.values()).reduce((sum, p) => sum + p, 0) / totalFiles;
            
            observer.next({
              totalFiles,
              completedFiles,
              currentFile: progress.fileName,
              overallProgress: totalProgress,
              fileProgress: new Map(fileProgress)
            });
          },
          error: (error) => {
            observer.error(error);
          },
          complete: () => {
            completedFiles++;
            if (completedFiles === totalFiles) {
              observer.next({
                totalFiles,
                completedFiles,
                currentFile: '',
                overallProgress: 100,
                fileProgress: new Map(fileProgress)
              });
              observer.complete();
            }
          }
        });
      });
    });
  }
}

/**
 * Progress information for a single file upload
 */
export interface UploadProgress {
  fileName: string;
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: string;
  storagePath: string;
}

/**
 * Progress information for batch upload
 */
export interface BatchUploadProgress {
  totalFiles: number;
  completedFiles: number;
  currentFile: string;
  overallProgress: number;
  fileProgress: Map<string, number>;
}
