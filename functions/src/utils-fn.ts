import { parse } from 'csv-parse';
import * as BusboyModule from 'busboy';
import { 
  Request, 
  Response, 
  ProcessedRecord, 
  FileUploadResult,
  ConversionResponse,
  BaseHeader, 
  RegularTransactionHeader, 
  DividendTransactionHeader,
  RecordType 
} from './interfaces-fn';

// Define the output formats that can be generated
export type OutputFormat = 'json' | 'csv';

// Define the structure of the output data
export interface ConversionResult {
  success: boolean;
  data: {
    standard: any[];
    dividends: any[];
  };
  format: OutputFormat;
  timestamp: string;
  recordCount: number;
  error?: string;
}

/**
 * Converts processed records to the specified output format
 * @param standard - Array of standard transactions
 * @param dividends - Array of dividend transactions
 * @param format - The desired output format ('json' or 'csv')
 * @returns A string containing the converted data in the specified format
 */
export function convertToOutput(
  standard: ProcessedRecord[],
  dividends: ProcessedRecord[],
  format: OutputFormat = 'json'
): string {
  const timestamp = new Date().toISOString();
  const recordCount = standard.length + dividends.length;

  if (format === 'json') {
    const response: ConversionResponse = {
      success: true,
      data: { 
        regularTransactions: standard, 
        dividends 
      },
      format: 'json',
      timestamp,
      recordCount
    };
    return JSON.stringify(response);
  }

  // For CSV, we'll create separate CSV strings for standard and dividend transactions
  if (format === 'csv') {
    // Define the CSV headers based on the available fields
    const headers = [
      BaseHeader.ActivityDate,
      BaseHeader.ProcessDate,
      BaseHeader.SettleDate,
      BaseHeader.Instrument,
      BaseHeader.Description,
      BaseHeader.TransCode,
      BaseHeader.Amount,
      RegularTransactionHeader.Quantity,
      RegularTransactionHeader.Price,
      RegularTransactionHeader.CUSIP,
      RegularTransactionHeader.IsRecurring,
      DividendTransactionHeader.SharesOwned,
      DividendTransactionHeader.DividendPerShare
    ] as const;

    // Convert a single record to a CSV row
    const recordToCsvRow = (record: ProcessedRecord): string => {
      return headers.map(header => {
        // Convert header to the format used in the record object
        const key = header.toLowerCase().replace(/ /g, '_') as keyof ProcessedRecord;
        // Get the value or empty string if undefined/null
        const value = record[key] ?? '';
        // Convert to string, escape quotes, and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    };

    // Generate CSV content for standard transactions
    let csvContent = [headers.join(',')];
    
    // Add standard transactions
    csvContent.push(...standard.map(recordToCsvRow));
    
    // Add dividend transactions with a section header if there are any
    if (dividends.length > 0) {
      csvContent.push('', 'Dividend Transactions', headers.join(','));
      csvContent.push(...dividends.map(recordToCsvRow));
    }

    return csvContent.join('\n');
  }

  throw new Error(`Unsupported output format: ${format}`);
}

/**
 * Converts an array of processed records to CSV format
 * @param records - Array of processed records
 * @param recordType - Type of records ('regular' or 'dividend')
 * @returns CSV string
 */
export const convertToCsv = (records: ProcessedRecord[], recordType: RecordType): string => {
  // Use the appropriate headers based on record type
  const baseHeaders: BaseHeader[] = [
    BaseHeader.ActivityDate,
    BaseHeader.ProcessDate,
    BaseHeader.SettleDate,
    BaseHeader.Instrument,
    BaseHeader.Description,
    BaseHeader.TransCode
  ];
  
  // Add transaction type specific headers
  let headers: (BaseHeader | RegularTransactionHeader | DividendTransactionHeader)[] = [...baseHeaders];
  
  if (recordType === RecordType.Regular) {
    // For regular transactions, include Quantity, Price, CUSIP, Is Recurring
    const regularHeaders: RegularTransactionHeader[] = [
      RegularTransactionHeader.Quantity,
      RegularTransactionHeader.Price,
      RegularTransactionHeader.CUSIP,
      RegularTransactionHeader.IsRecurring
    ];
    headers = [
      ...baseHeaders,
      ...regularHeaders
    ];
  } else {
    // For dividend transactions, include Shares Owned, Dividend Per Share
    const dividendHeaders: DividendTransactionHeader[] = [
      DividendTransactionHeader.SharesOwned,
      DividendTransactionHeader.DividendPerShare
    ];
    headers = [
      ...baseHeaders,
      ...dividendHeaders
    ];
  }

  // Convert a single record to a CSV row
  const recordToCsvRow = (record: ProcessedRecord): string => {
    console.log('fn util cTC recordToCsvRow - Record keys:', Object.keys(record));
    console.log('fn util cTC recordToCsvRow - Record CUSIP:', record.cusip);
    
    return headers.map(header => {
      let value: any = '';
      
      // Handle special fields using the enum values for comparison
      switch (header) {
        case DividendTransactionHeader.SharesOwned.toString():
          value = record.shares_owned ?? '';
          console.log('fn util cTC recordToCsvRow - Processing Shares Owned:', value);
          break;
          
        case DividendTransactionHeader.DividendPerShare.toString():
          value = record.dividend_per_share_amount ?? '';
          console.log('fn util cTC recordToCsvRow - Processing Dividend Per Share:', value);
          break;
          
        case RegularTransactionHeader.IsRecurring.toString():
          value = record.is_recurring ?? false;
          console.log('fn util cTC recordToCsvRow - Processing Is Recurring:', value);
          break;
          
        case RegularTransactionHeader.CUSIP.toString():
          value = record.cusip ?? '';
          console.log('fn util cTC recordToCsvRow - Processing CUSIP:', value);
          break;
          
        default:
          // For standard fields, convert header to the format used in the record object
          const key = header.toLowerCase().replace(/ /g, '_') as keyof ProcessedRecord;
          value = record[key] ?? '';
          console.log(`fn util cTC recordToCsvRow - Processing ${header}:`, value);
      }
      
      // Convert to string, escape quotes, and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  };

  // Generate CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...records.map(recordToCsvRow) // Data rows
  ].join('\n');

  return csvContent;
};

/**
 * Prepares data for download with appropriate headers
 * @param data - The data to prepare for download
 * @param format - The format of the data ('json' or 'csv')
 * @returns An object with the appropriate content type and data
 */
export function prepareDownload(
  data: string,
  format: OutputFormat = 'json'
): { contentType: string; data: string } {
  // For CSV, we want to send the raw CSV string directly
  if (format === 'csv') {
    return {
      contentType: 'text/csv',
      data: data
    };
  }
  
  // For JSON, we'll wrap the data in a success response
  const response: ConversionResponse = {
    success: true,
    data: JSON.parse(data),
    format: 'json',
    timestamp: new Date().toISOString(),
    recordCount: Array.isArray(JSON.parse(data).regularTransactions) 
      ? JSON.parse(data).regularTransactions.length + (JSON.parse(data).dividends?.length || 0)
      : 0
  };
  
  return {
    contentType: 'application/json',
    data: JSON.stringify(response, null, 2)
  };
}

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
  // Look for CUSIP followed by optional whitespace/colon and then a 9-character alphanumeric code
  const cusipMatch = description.match(/CUSIP[\s:]+([A-Z0-9]{9})/i);
  if (cusipMatch && cusipMatch[1]) {
    return cusipMatch[1];
  }
  
  // Fallback: Look for any 9-character alphanumeric code that might be a CUSIP
  // This is more permissive and might produce false positives
  const fallbackMatch = description.match(/\b([A-Z0-9]{9})\b/);
  return fallbackMatch?.[1];
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
  
  // Clear quantity and price fields for dividend transactions
  record[RegularTransactionHeader.Quantity] = undefined;
  record[RegularTransactionHeader.Price] = undefined;
  
  // Remove CUSIP for dividend transactions
  record[RegularTransactionHeader.CUSIP] = undefined;
  
  // Debug log the record to see all available properties
  console.log('fn util pDT Record keys:', Object.keys(record));
  console.log('fn util pDT Record values:', record);
  
  // Get the description from either 'description' or 'Description' property
  const description = ('description' in record ? record['description'] : record[BaseHeader.Description]) || '';
  console.log('fn util pDT Raw description:', description);
  
  // Try to extract shares and dividend per share from the description
  // Format: "... 293.564723 shares at 0.275316"
  const sharesMatch = description.match(/(\d+\.?\d*)\s*shares?\s*at\s*(\d+\.?\d*)/i);
  console.log('fn util pDT Shares match:', sharesMatch);
  
  if (sharesMatch) {
    // Extract shares owned (first capture group)
    const shares = parseFloat(sharesMatch[1]);
    if (!isNaN(shares)) {
      record.shares_owned = shares;
      console.log('fn util pDT Set shares_owned:', shares);
    }
    
    // Extract dividend per share (second capture group)
    const dividendPerShare = parseFloat(sharesMatch[2]);
    if (!isNaN(dividendPerShare)) {
      record.dividend_per_share_amount = dividendPerShare;
      console.log('fn util pDT Set dividend_per_share_amount from match:', dividendPerShare);
    }
  } else {
    // Fallback: Try to extract just the shares and calculate dividend per share from amount
    const fallbackMatch = description.match(/(\d+\.?\d*)\s*shares?/i);
    console.log('fn util pDT Fallback match:', fallbackMatch);
    
    if (fallbackMatch) {
      const shares = parseFloat(fallbackMatch[1]);
      const amount = Math.abs(record[BaseHeader.Amount] || 0);
      if (!isNaN(shares) && amount > 0 && shares > 0) {
        const divPerShare = amount / shares;
        record.shares_owned = shares;
        record.dividend_per_share_amount = divPerShare;
        console.log('fn util pDT Set from fallback - shares:', shares, 'amount:', amount, 'div per share:', divPerShare);
      }
    } else if (record[BaseHeader.Amount]) {
      // If we can't parse shares, set dividend per share to the amount
      const amount = Math.abs(record[BaseHeader.Amount]);
      record.dividend_per_share_amount = amount;
      console.log('fn util pDT Set dividend_per_share_amount from amount only:', amount);
    }
  }

  // Debug logging
  console.log('fn util pDT ===== DIVIDEND TRANSACTION DETAILS =====');
  console.log('fn util pDT Instrument:', record[BaseHeader.Instrument]);
  console.log('fn util pDT Amount:', record[BaseHeader.Amount]);
  console.log('fn util pDT Shares Owned:', record.shares_owned);
  console.log('fn util pDT Dividend per Share:', record.dividend_per_share_amount);
  console.log('fn util pDT Description:', record[BaseHeader.Description]);
  console.log('fn util pDT CUSIP:', record.cusip);
  console.log('fn util pDT Is Recurring:', record.is_recurring);
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
  
  // Map of original header names to our normalized field names
  const fieldMappings: Record<string, string> = {
    [BaseHeader.ActivityDate]: 'activity_date',
    [BaseHeader.ProcessDate]: 'process_date',
    [BaseHeader.SettleDate]: 'settle_date',
    [BaseHeader.Instrument]: 'instrument',
    [BaseHeader.Description]: 'description',
    [BaseHeader.TransCode]: 'trans_code',
    [RegularTransactionHeader.Quantity]: 'quantity',
    [RegularTransactionHeader.Price]: 'price',
    [BaseHeader.Amount]: 'amount',
    [RegularTransactionHeader.CUSIP]: 'cusip',
    [RegularTransactionHeader.IsRecurring]: 'is_recurring',
    [DividendTransactionHeader.SharesOwned]: 'shares_owned',
    [DividendTransactionHeader.DividendPerShare]: 'dividend_per_share'
  };
  
  // Type guard to check if a field is a date field
  const isDateField = (field: string): boolean => {
    return [
      BaseHeader.ActivityDate,
      BaseHeader.ProcessDate,
      BaseHeader.SettleDate
    ].includes(field as BaseHeader);
  };
  
  // Type guard to check if a field is a number field
  const isNumberField = (field: string): boolean => {
    return [
      BaseHeader.Amount,
      RegularTransactionHeader.Quantity,
      RegularTransactionHeader.Price
    ].includes(field as BaseHeader | RegularTransactionHeader);
  };
  
  // Process each field in the record
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === '') continue;
    
    // Get the normalized field name
    const fieldName = fieldMappings[key] || key.toLowerCase().replace(/ /g, '_');
    
    // Process based on field type
    if (isDateField(key)) {
      const formattedDate = formatDate(value);
      if (formattedDate) processedRecord[fieldName] = formattedDate;
    } else if (isNumberField(key)) {
      const num = parseNumber(value);
      if (num !== undefined) {
        processedRecord[fieldName] = num;
      } else {
        console.warn(`fn util pR Could not parse sanitized number for key '${key}': Original='${value}'`);
      }
    } else {
      processedRecord[fieldName] = value;
    }
  }

  // Extract CUSIP and recurring status from description
  if (processedRecord.description) {
    console.log(`fn util pR Processing description for CUSIP: "${processedRecord.description}"`);
    const cusip = extractCusip(processedRecord.description);
    console.log(`fn util pR Extracted CUSIP: ${cusip || 'Not found'}`);
    if (cusip) {
      processedRecord.cusip = cusip;
      console.log(`fn util pR Set CUSIP on record: ${processedRecord.cusip}`);
    }
    processedRecord.is_recurring = isRecurring(processedRecord.description);
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
