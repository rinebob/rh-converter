/**
 * Enum for record types
 */
export enum RecordType {
  Regular = 'regular',
  Dividend = 'dividend'
}

/**
 * Base headers that are common to all record types
 */
export enum BaseHeader {
  ActivityDate = 'Activity Date',
  ProcessDate = 'Process Date',
  SettleDate = 'Settle Date',
  Instrument = 'Instrument',
  Description = 'Description',
  TransCode = 'Trans Code',
  Amount = 'Amount'
}

/**
 * Headers specific to regular transactions
 */
export enum RegularTransactionHeader {
  Quantity = 'Quantity',
  Price = 'Price',
  CUSIP = 'CUSIP',
  IsRecurring = 'Is Recurring'
}

/**
 * Headers specific to dividend transactions
 */
export enum DividendTransactionHeader {
  SharesOwned = 'Shares Owned',
  DividendPerShare = 'Dividend Per Share'
}

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
 * Response data structure for conversion results
 */
export interface ConversionResponseData<T = ProcessedRecord> {
  regularTransactions: T[];
  dividends: T[];
}

/**
 * Standard conversion response interface
 */
export interface ConversionResponse {
  success: boolean;
  data: ConversionResponseData;
  format: 'json' | 'csv';
  timestamp: string;
  recordCount: number;
  error?: string;
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
  set: (field: string, value: string) => Response;
  setHeader: (name: string, value: string | string[]) => void;
  getHeader: (name: string) => string | number | string[] | undefined;
  statusCode?: number;
  [key: string]: any; // Allow any other properties
}
