/**
 * Shared interfaces and enums for the application
 */

/**
 * Available download formats for conversion and output
 */
export enum DownloadFormat {
  JSON = 'json',
  CSV = 'csv',
  BOTH = 'both'
}

/**
 * Represents a file upload response from the server
 */
export interface FileUploadResponse {
  success: boolean;
  data?: {
    regularTransactions: any[];
    dividends: any[];
  };
  format?: DownloadFormat;
  recordCount?: number;
  error?: string;
  timestamp?: string;
}

/**
 * Represents a file upload error response
 */
export interface FileUploadError {
  success: boolean;
  error: string;
  details?: string;
}
