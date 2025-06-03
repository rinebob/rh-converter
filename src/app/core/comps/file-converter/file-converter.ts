import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CLOUD_FUNCTION_URLS } from '../../constants';

/**
 * JSDoc for FileConverter component
 * This component handles the file selection, and uploading for conversion.
 */
@Component({
  selector: 'rh-file-converter',
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './file-converter.html',
  styleUrl: './file-converter.scss'
})
export class FileConverter {
  private http = inject(HttpClient);
  selectedFile: File | null = null;
  readonly cloudFunctionUrl = CLOUD_FUNCTION_URLS.UPLOAD_CSV;

  /**
   * Handles the file selection event from the input field.
   * @param event The file input change event.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      // #Reason: Logging selected file for debugging purposes during development.
      console.log('File selected:', this.selectedFile.name);
    } else {
      this.selectedFile = null;
    }
  }

  /**
   * Handles the 'Convert' button click.
   * Uploads the selected file to the Cloud Function.
   */
  onConvertClicked(): void {
    if (!this.selectedFile) {
      // #Reason: Logging error for debugging and providing feedback if no file is selected.
      console.error('No file selected.');
      // TODO: Implement user-friendly message (e.g., Angular Material Snackbar)
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);

    // #Reason: Logging upload target for debugging.
    console.log('Uploading file to:', this.cloudFunctionUrl);

    // #Reason: Using HttpClient to send a POST request with FormData,
    // # which is the standard way to upload files. The response/error/completion
    // # is logged for now; will be replaced with user-facing feedback.
    this.http.post(this.cloudFunctionUrl, formData).subscribe({
      next: (response) => {
        console.log('Upload successful:', response);
        // TODO: Handle successful upload (e.g., show success message, display results)
      },
      error: (error) => {
        console.error('Upload failed:', error);
        // TODO: Handle upload error (e.g., show error message)
      },
      complete: () => {
        console.log('Upload request completed.');
      }
    });
  }


}
