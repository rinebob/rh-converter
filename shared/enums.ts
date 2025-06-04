/**
 * Shared enums between frontend and backend
 */

/**
 * Record types for transaction processing
 */
export enum RecordType {
  Regular = 'regular',
  Dividend = 'dividend'
}

/**
 * Transaction type codes
 */
export enum TransactionCode {
  Dividend = 'CDIV'
}

/**
 * Available download formats for conversion and output
 */
export enum DownloadFormat {
  JSON = 'json',
  CSV = 'csv',
  BOTH = 'both'
}

// For backward compatibility
export const OutputFormat = DownloadFormat;
