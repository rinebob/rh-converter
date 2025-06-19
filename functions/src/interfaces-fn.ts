/**
 * Enums used throughout the application
 */

export enum RecordType {
  Regular = 'regular',
  Dividend = 'dividend'
}

export enum TransactionCode {
  Buy = 'Buy',
  Sell = 'Sell',
  Dividend = 'Dividend',
  Transfer = 'Transfer',
  Adjustment = 'Adjustment',
  Expired = 'Expired',
  Assigned = 'Assigned',
  Expiration = 'Expiration',
  Cancel = 'Cancel',
  Correction = 'Correction',
  Interest = 'Interest',
  Split = 'Split',
  SpinOff = 'Spin-off',
  Merger = 'Merger',
  NameChange = 'Name Change',
  Tender = 'Tender',
  WarrantExercise = 'Warrant Exercise',
  WarrantAssignment = 'Warrant Assignment',
  WarrantExpiration = 'Warrant Expiration',
  WarrantCancel = 'Warrant Cancel',
  WarrantCorrection = 'Warrant Correction',
  OptionExercise = 'Option Exercise',
  OptionAssignment = 'Option Assignment',
  OptionExpiration = 'Option Expiration',
  OptionCancel = 'Option Cancel',
  OptionCorrection = 'Option Correction',
  OptionExpired = 'Option Expired',
  OptionAssigned = 'Option Assigned',
  OptionExpiredWorthless = 'Option Expired Worthless',
  OptionAssignedWorthless = 'Option Assigned Worthless'
}

export enum DownloadFormat {
  JSON = 'json',
  CSV = 'csv',
  BOTH = 'both'
}

export enum Note {
  Recurring = 'Recurring',
  DividendReinvestment = 'Dividend Reinvestment',
  ManualEntry = 'Manual Entry'
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
  Notes = 'Notes'
}

/**
 * Headers specific to dividend transactions
 */
export enum DividendTransactionHeader {
  SharesOwned = 'Shares Owned',
  DividendPerShare = 'Dividend Per Share'
}

/**
 * Enum for processed record field names
 */
export enum ProcessedRecordField {
  ActivityDate = 'activityDate',
  ProcessDate = 'processDate',
  SettleDate = 'settleDate',
  Instrument = 'instrument',
  Description = 'description',
  TransCode = 'transCode',
  Quantity = 'quantity',
  Price = 'price',
  Amount = 'amount',
  CUSIP = 'cusip',
  Notes = 'notes',
  SharesOwned = 'sharesOwned',
  DividendPerShareAmount = 'dividendPerShareAmount'
}

/**
 * Represents a processed transaction record with typed fields
 */
export interface ProcessedRecord {
  // Core fields from CSV
  activityDate?: string;
  processDate?: string;
  settleDate?: string;
  instrument?: string;
  description?: string;
  transCode?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  
  // Derived fields
  cusip?: string;
  notes?: Note[];
  sharesOwned?: number;
  dividendPerShareAmount?: number;
  recordType?: RecordType;
  
  // Allow dynamic access for any other fields
  [key: string]: any;
}

/**
 * Type for field mappings from header strings to ProcessedRecord fields
 */
export type FieldMappings = Map<string, keyof ProcessedRecord>;

/**
 * Creates a new FieldMappings instance with all the standard field mappings
 */
export const createFieldMappings = (): FieldMappings => {
  const mappings = new Map<string, keyof ProcessedRecord>();
  
  // Base headers
  mappings.set(BaseHeader.ActivityDate, ProcessedRecordField.ActivityDate);
  mappings.set(BaseHeader.ProcessDate, ProcessedRecordField.ProcessDate);
  mappings.set(BaseHeader.SettleDate, ProcessedRecordField.SettleDate);
  mappings.set(BaseHeader.Instrument, ProcessedRecordField.Instrument);
  mappings.set(BaseHeader.Description, ProcessedRecordField.Description);
  mappings.set(BaseHeader.TransCode, ProcessedRecordField.TransCode);
  mappings.set(BaseHeader.Amount, ProcessedRecordField.Amount);
  
  // Regular transaction headers
  mappings.set(RegularTransactionHeader.Quantity, ProcessedRecordField.Quantity);
  mappings.set(RegularTransactionHeader.Price, ProcessedRecordField.Price);
  mappings.set(RegularTransactionHeader.CUSIP, ProcessedRecordField.CUSIP);
  mappings.set(RegularTransactionHeader.Notes, ProcessedRecordField.Notes);
  
  // Dividend transaction headers
  mappings.set(DividendTransactionHeader.SharesOwned, ProcessedRecordField.SharesOwned);
  mappings.set(DividendTransactionHeader.DividendPerShare, ProcessedRecordField.DividendPerShareAmount);
  
  return mappings;
};

/**
 * Converts a raw record to the ProcessedRecord format
 * @param record - Raw record with string keys
 * @returns Processed record with proper types and camelCase keys
 */
export const toProcessedRecord = (record: Record<string, any>): ProcessedRecord => ({
  // Map from header enums to camelCase properties
  activityDate: record[BaseHeader.ActivityDate],
  processDate: record[BaseHeader.ProcessDate],
  settleDate: record[BaseHeader.SettleDate],
  instrument: record[BaseHeader.Instrument],
  description: record[BaseHeader.Description],
  transCode: record[BaseHeader.TransCode],
  quantity: record[RegularTransactionHeader.Quantity],
  price: record[RegularTransactionHeader.Price],
  amount: record[BaseHeader.Amount],
  cusip: record[RegularTransactionHeader.CUSIP],
  notes: record[RegularTransactionHeader.Notes] ? [record[RegularTransactionHeader.Notes]] : [],
  sharesOwned: record[DividendTransactionHeader.SharesOwned],
  dividendPerShareAmount: record[DividendTransactionHeader.DividendPerShare],
  ...record // Spread the rest of the record
});

/**
 * Result of a file upload operation
 */
export interface FileUploadResult {
  filename: string;
  mimetype: string;
  originalFileName: string;
  fileData: Buffer;
  fileContent?: string;
}

/**
 * Generic response structure for API responses
 */
export interface BaseResponse {
  success: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Structure of the output data
 */
export interface ConversionResult extends BaseResponse {
  data: {
    standard: any[];
    dividends: any[];
  };
  format: DownloadFormat;
  recordCount: number;
}

/**
 * Generic response with typed data
 */
export interface TypedResponse<T = any> extends BaseResponse {
  data?: T;
  format?: string;
  recordCount?: number;
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
export type ConversionResponse = TypedResponse<ConversionResponseData>;

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
