import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { HttpClient } from '@angular/common/http';
import { CLOUD_FUNCTION_URLS } from '../../common/constants';
import { DownloadFormat } from '../../common/interfaces';

/**
 * JSDoc for legacy FileConverter component
 * This component handles the file selection, and uploading for conversion.
 * This is the original implementation with header, app and footer
 * Used for initial app rollout
 */
@Component({
  selector: 'rh-file-converter-legacy',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule
  ],
  templateUrl: './file-converter-legacy.html',
  styleUrls: ['./file-converter-legacy.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileConverterLegacy implements OnInit {
  private http = inject(HttpClient);
  
  // Form controls
  fileInput = new FormControl<File | null>(null, { 
    validators: [Validators.required],
    nonNullable: false
  });
  
  downloadFormat = new FormControl<DownloadFormat>(DownloadFormat.JSON, {
    nonNullable: true
  });
  
  // Form group
  form = new FormGroup({
    fileInput: this.fileInput,
    downloadFormat: this.downloadFormat
  });
  
  // State
  selectedFile: File | null = null;
  isProcessing = signal(false);
  readonly cloudFunctionUrl = CLOUD_FUNCTION_URLS.UPLOAD_CSV;
  
  // Available download formats
  readonly formats = [
    { value: DownloadFormat.JSON, label: 'JSON' },
    { value: DownloadFormat.CSV, label: 'CSV' },
    { value: DownloadFormat.BOTH, label: 'Both (ZIP)' }
  ] as const;
  
  // Button disabled state based on form status and processing state
  isButtonDisabled = signal(true);

  /**
   * Clears the selected file and resets the file input
   * @param event - The click event
   */
  clearFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.fileInput.setValue(null);
    this.isButtonDisabled.set(true);
  }
  
  // Update button state based on file selection and processing state
  private updateButtonState() {
    const shouldDisable = !this.selectedFile || this.isProcessing();
    this.isButtonDisabled.set(shouldDisable);
    
    console.log('Button state updated:', {
      disabled: shouldDisable,
      hasFile: !!this.selectedFile,
      isProcessing: this.isProcessing()
    });
  }

  ngOnInit(): void {
    // Initial button state
    this.updateButtonState();
    
    // Update button state when file selection changes
    this.fileInput.valueChanges.subscribe(() => {
      this.updateButtonState();
    });
    
    // Initial log
    console.log('Form initialized', {
      hasFile: !!this.selectedFile,
      isProcessing: this.isProcessing()
    });
  }

  /**
   * Handles the file selection event from the input field.
   * @param event The file input change event.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.fileInput.setValue(this.selectedFile, { emitEvent: true });
    } else {
      this.selectedFile = null;
      this.fileInput.setValue(null, { emitEvent: true });
    }
    
    // Update button state
    this.updateButtonState();
  }
  
  /**
   * Handles the 'Convert' button click and initiates file processing
   */
  onConvertClicked(): void {
    if (this.isButtonDisabled() || !this.selectedFile) {
      console.warn('Cannot process file. Invalid state:', {
        isButtonDisabled: this.isButtonDisabled(),
        selectedFile: !!this.selectedFile,
        isProcessing: this.isProcessing()
      });
      return;
    }
    
    this.isProcessing.set(true);
    this.updateButtonState();
    
    try {
      const format = this.downloadFormat.value as DownloadFormat;
      this.processFile(format);
    } catch (error) {
      console.error('Error processing file:', error);
      this.isProcessing.set(false);
      this.updateButtonState();
    }
  }

  /**
   * Handles the download of a file from a blob
   * @param blob The blob to download
   * @param filename The name of the file to download
   */
  private downloadFile(blob: Blob, filename: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('File download initiated:', { filename, size: blob.size });
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Processes the selected file and triggers the download
   * @param format The format to download the file in
   */
  private processFile(format: DownloadFormat): void {
    if (!this.selectedFile) {
      console.error('No file selected');
      this.isProcessing.set(false);
      this.updateButtonState();
      return;
    }
    
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    
    const url = new URL(this.cloudFunctionUrl);
    url.searchParams.append('format', format);
    
    // Get the original filename without extension
    const originalName = this.selectedFile.name.replace(/\.csv$/i, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    console.log('Sending file to server...', {
      url: url.toString(),
      format,
      fileName: this.selectedFile.name,
      originalName,
      timestamp
    });
    
    this.http.post(url.toString(), formData, { 
      responseType: 'blob',
      observe: 'response',
      headers: {
        'Accept': 'application/zip, application/json, text/csv',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      withCredentials: false
    }).subscribe({
      next: (response) => {
        console.log('Received response from server');
        
        if (!response.body) {
          throw new Error('Empty response from server');
        }

        // Get the filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        if (!contentDisposition) {
          throw new Error('Missing Content-Disposition header in response');
        }
        
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(contentDisposition);
        if (!matches?.[1]) {
          throw new Error('Invalid Content-Disposition header format');
        }
        
        const filename = matches[1].replace(/['"]/g, '');

        // Create a blob with the correct content type
        const blob = new Blob([response.body], { 
          type: response.headers.get('Content-Type') || 'application/octet-stream' 
        });

        console.log('Initiating file download:', { 
          filename, 
          type: blob.type,
          size: blob.size 
        });
        
        this.downloadFile(blob, filename);
      },
      error: (error) => {
        console.error('Upload failed:', error);
      },
      complete: () => {
        console.log('File processing complete');
        this.isProcessing.set(false);
        this.selectedFile = null;
        
        // Reset the file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }
    });
  }
}