import { parse } from 'csv-parse';
import * as BusboyModule from 'busboy';
import type { Request, Response } from './interfaces-fn';
import type { ProcessedRecord, FileUploadResult } from './interfaces-fn';

/**
 * Formats a date string to YYYY-MM-DD format
 * @param dateString - The date string to format
 * @returns Formatted date string or undefined if invalid
 */
export const formatDate = (dateString: string): string | undefined => {
  if (!dateString) return undefined;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.warn(`fn util fD Could not parse date: ${dateString}`);
    return undefined;
  }
};

/**
 * Parses a string into a number, handling currency symbols, commas, and parentheses for negative numbers
 * @param value - The string value to parse
 * @returns Parsed number or undefined if invalid
 */
export const parseNumber = (value: string): number | undefined => {
  if (!value) return undefined;
  let numericString = value.toString().trim()
    .replace(/\$/g, '')
    .replace(/,/g, '');
  
  if (numericString.startsWith('(') && numericString.endsWith(')')) {
    numericString = '-' + numericString.substring(1, numericString.length - 1);
  }
  
  const num = parseFloat(numericString);
  return isNaN(num) ? undefined : num;
};

/**
 * Extracts CUSIP from a description string
 * @param description - The description containing the CUSIP
 * @returns Extracted CUSIP or undefined if not found
 */
export const extractCusip = (description: string): string | undefined => {
  const cusipRegex = /\((CUSIP )?([A-Z0-9]{9})\)/i;
  const match = description.match(cusipRegex);
  return match?.[2];
};

/**
 * Checks if a description indicates a recurring transaction
 * @param description - The description to check
 * @returns True if the description indicates a recurring transaction
 */
export const isRecurring = (description: string): boolean => {
  // Match "Recurring" by itself or as part of "Recurring Investment" or "Recurring Dividend"
  const recurringRegex = /\bRecurring(?: (?:Investment|Dividend))?\b/i;
  return recurringRegex.test(description);
};

/**
 * Processes a dividend transaction to extract shares and dividend per share
 * @param record - The record to process
 */
export const processDividendTransaction = (record: ProcessedRecord): void => {
  console.log('fn util pDT Processing dividend transaction:', record);
  const description = record['Description'] || '';
  
  // Match format: "Cash Div: R/D 2025-04-10 P/D 2025-04-11 - 684.652797 shares at 0.2595"
  const sharesMatch = description.match(/(\d+\.?\d*)\s*shares?\s*at\s*(\d+\.?\d*)/i);
  
  if (sharesMatch) {
    // Extract shares owned (first capture group)
    const shares = parseFloat(sharesMatch[1]);
    if (!isNaN(shares)) {
      record.shares_owned = shares;
    }
    
    // Extract dividend per share (second capture group)
    const dividendPerShare = parseFloat(sharesMatch[2]);
    if (!isNaN(dividendPerShare)) {
      record.dividend_per_share_amount = dividendPerShare;
    }
  } else {
    // Fallback: Try to extract just the shares and calculate dividend per share from amount
    const fallbackMatch = description.match(/(\d+\.?\d*)\s*shares?/i);
    if (fallbackMatch) {
      const shares = parseFloat(fallbackMatch[1]);
      if (!isNaN(shares) && record['Amount'] && shares > 0) {
        record.shares_owned = shares;
        record.dividend_per_share_amount = Math.abs(record['Amount'] as number) / shares;
      }
    }
  }

  // Debug logging
  console.log('fn util pDT ===== DIVIDEND TRANSACTION DETAILS =====');
  // console.log('fn util pDT Instrument:', record['Instrument']);
  // console.log('fn util pDT Amount:', record['Amount']);
  // console.log('fn util pDT Shares Owned:', record.shares_owned);
  // console.log('fn util pDT Dividend per Share:', record.dividend_per_share_amount);
  // console.log('fn util pDT Description:', record['Description']);
  // console.log('fn util pDT CUSIP:', record.cusip);
  // console.log('fn util pDT Is Recurring:', record.is_recurring);
  console.log('fn util pDT Full Record:', JSON.stringify(record, null, 2));
  console.log('fn util pDT ==================================');
};

/**
 * Checks if a record is a disclaimer or footer that should be filtered out
 * @param record - The record to check
 * @returns True if the record should be filtered out
 */
const shouldFilterRecord = (record: Record<string, string>): boolean => {
  // Skip if record is empty
  if (Object.keys(record).length === 0) return true;
  
  // Skip if record only has empty values
  const hasNonEmptyValue = Object.values(record).some(
    value => value && typeof value === 'string' && value.trim() !== ''
  );
  if (!hasNonEmptyValue) return true;
  
  // Skip if record is the disclaimer footer
  return Object.values(record).some(value => 
    typeof value === 'string' && (
      value.includes('The data provided is for informational purposes') ||
      value.includes('Robinhood Crypto or Robinhood Spending activity')
    )
  );
};

/**
 * Parses CSV content into an array of records
 * @param fileContentString - The CSV content as a string
 * @returns Promise with array of parsed records
 */
export const parseCSV = async (fileContentString: string): Promise<Record<string, string>[]> => {
  return new Promise((resolve, reject) => {
    parse(fileContentString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
      skip_records_with_empty_values: true,
    }, (err: Error | undefined, parsedRecords: Record<string, string>[]) => {
      if (err) {
        console.error('fn util pCsv Error during CSV parsing:', err);
        reject(err);
      } else {
        // Filter out disclaimer and empty records
        const filteredRecords = parsedRecords.filter(record => !shouldFilterRecord(record));
        console.log(`fn util pCsv Filtered ${parsedRecords.length - filteredRecords.length} empty or invalid records`);
        resolve(filteredRecords);
      }
    });
  });
};

/**
 * Processes a raw record into a ProcessedRecord with proper types and derived fields
 * @param record - The raw record to process
 * @returns Processed record with proper types and derived fields, or null if record should be skipped
 */
export const processRecord = (record: Record<string, string>): ProcessedRecord | null => {
  // Skip empty records or records that are just the footer
  if (Object.keys(record).length === 0 || 
      (Object.keys(record).length === 1 && record['']?.includes('The data provided is for informational purposes'))) {
    return null;
  }

  const processedRecord: ProcessedRecord = {};
  // List of date fields that need formatting
  const dateFields = ['Activity Date', 'Process Date', 'Settle Date'];
  // List of numeric fields that need parsing
  const numberFields = ['Amount', 'Quantity', 'Price'];
  
  // Process each field in the record
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === '') continue;

    // Process based on field type
    if (dateFields.includes(key)) {
      const formattedDate = formatDate(value);
      if (formattedDate) processedRecord[key] = formattedDate;
    } else if (numberFields.includes(key)) {
      const num = parseNumber(value);
      if (num !== undefined) {
        processedRecord[key] = num;
      } else {
        console.warn(`fn util pR Could not parse sanitized number for key '${key}': Original='${value}'`);
      }
    } else {
      processedRecord[key] = value;
    }
  }

  // Extract CUSIP and recurring status from description
  if (processedRecord['Description']) {
    const cusip = extractCusip(processedRecord['Description']);
    if (cusip) processedRecord.cusip = cusip;
    processedRecord.is_recurring = isRecurring(processedRecord['Description']);
  }

  return processedRecord;
};

/**
 * Handles errors and sends an appropriate response
 * @param error - The error that occurred
 * @param response - Express response object
 * @param context - Additional context about where the error occurred
 */
export const handleError = (error: unknown, response: Response, context = ''): void => {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`fn util hE Error${context ? ` in ${context}:` : ':'}`, error);
  
  // Log the full error stack in non-production environments
  if (process.env.NODE_ENV !== 'production' && errorStack) {
    console.error('Stack trace:', errorStack);
  }
  
  response.status(500).json({
    success: false,
    error: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: errorStack })
  });
};

/**
 * Creates a standardized success response
 * @param response - Express response object
 * @param data - The data to include in the response
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendSuccessResponse = <T>(
  response: Response,
  data: T,
  statusCode = 200
): void => {
  response.status(statusCode).json({
    success: true,
    ...data
  });
};

/**
 * Handles file upload from a request using Busboy
 * @param request - Express request object
 * @returns Promise that resolves with the uploaded file data and metadata
 * @throws {Error} If no file is uploaded or if there's an error processing the upload
 */
export const handleFileUpload = (request: Request): Promise<FileUploadResult> => {
  return new Promise((resolve, reject) => {
    const bb = BusboyModule.default({ headers: request.headers });
    const fileData: Buffer[] = [];
    let fileInfo: Omit<FileUploadResult, 'fileData'> | null = null;

    bb.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: BusboyModule.FileInfo) => {
      const { filename, encoding, mimeType } = info;
      console.log(`fn util hFU File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimeType: ${mimeType}`);
      
      fileInfo = {
        originalFileName: filename,
        mimeType,
        encoding
      };

      file.on('data', (data: Buffer) => {
        console.log(`fn util hFU File [${fieldname}] got ${data.length} bytes`);
        fileData.push(data);
      });

      file.on('end', () => {
        console.log(`fn util hFU File [${fieldname}] Finished`);
      });

      file.on('error', (err: Error) => {
        console.error(`fn util hFU File [${fieldname}] Error:`, err);
        reject(new Error(`Error processing file: ${err.message}`));
      });
    });

    bb.on('finish', () => {
      if (!fileInfo) {
        reject(new Error('No file was uploaded'));
        return;
      }

      if (fileData.length === 0) {
        reject(new Error('Uploaded file is empty'));
        return;
      }

      resolve({
        ...fileInfo,
        fileData: Buffer.concat(fileData)
      });
    });

    bb.on('error', (err: Error) => {
      console.error('fn util hFU Busboy error:', err);
      reject(new Error(`Upload failed: ${err.message}`));
    });

    if (request.rawBody) {
      bb.end(request.rawBody);
    } else {
      request.pipe(bb);
    }
  });
};
