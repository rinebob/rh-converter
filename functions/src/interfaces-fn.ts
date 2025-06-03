/**
 * Represents a processed transaction record with typed fields
 */
export interface ProcessedRecord {
  // Core fields from CSV
  'Activity Date'?: string;
  'Process Date'?: string;
  'Settle Date'?: string;
  'Instrument'?: string;
  'Description'?: string;
  'Trans Code'?: string;
  'Quantity'?: number;
  'Price'?: number;
  'Amount'?: number;
  
  // Derived fields
  cusip?: string;
  is_recurring?: boolean;
  shares_owned?: number;
  dividend_per_share_amount?: number;
  
  // Allow dynamic access for any other fields
  [key: string]: any;
}

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  success: boolean;
  error: string;
  details?: string;
  [key: string]: unknown;
}

/**
 * Result of a file upload operation
 */
export interface FileUploadResult {
  fileData: Buffer;
  originalFileName: string;
  mimeType: string;
  encoding: string;
}

/**
 * Request interface for Firebase Functions v2
 */
export interface Request {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  rawBody?: Buffer | string;
  pipe: (stream: any) => void;
  [key: string]: any; // Allow any other properties
}

/**
 * Response interface for Firebase Functions v2
 */
export interface Response {
  status: (code: number) => Response;
  send: (body: any) => void;
  json: (body: any) => void;
  set: (field: string, value: string) => void;
}
