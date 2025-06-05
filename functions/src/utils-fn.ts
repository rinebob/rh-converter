import { parse } from 'csv-parse';
import * as BusboyModule from 'busboy';
import { 
  Request, 
  Response, 
  RecordType,
  BaseHeader,
  RegularTransactionHeader,
  DividendTransactionHeader,
  ProcessedRecord,
  ProcessedRecordField,
  FieldMappings,
  DownloadFormat,
  FileUploadResult,
  Note,
  createFieldMappings,
  ConversionResponse
} from './interfaces-fn';

/**
 * Creates a function that converts a ProcessedRecord to a CSV row
 * @param headers - Array of header strings
 * @param fieldMappings - Map of header strings to field names
 * @returns Function that converts a ProcessedRecord to a CSV row string
 */
function createCsvRowConverter(
  headers: readonly string[],
  fieldMappings: FieldMappings
): (record: ProcessedRecord) => string {
  return (record: ProcessedRecord): string => {
    console.log('---------------- Processing record for CSV --------------------------')
    console.log('fn util rTCR - input record:', record);
    
    return headers.map(header => {
      // Get the field name from our mapping
      const fieldName = fieldMappings.get(header);
      if (!fieldName) {
        console.warn(`fn util rTCR No mapping found for header: ${header}`);
        return '';
      }
      
      let value: any = '';
      
      // Get the value from the record using the field name
      // The field name is the value from ProcessedRecordField
      switch (fieldName) {
        case ProcessedRecordField.SharesOwned:
          value = record.sharesOwned ?? '';
          console.log('fn util cCRC Getting sharesOwned:', { 
            hasValue: record.sharesOwned !== undefined,
            value: record.sharesOwned
          });
          break;
          
        case ProcessedRecordField.DividendPerShareAmount:
          value = record.dividendPerShareAmount ?? '';
          console.log('fn util cCRC Getting dividendPerShareAmount:', { 
            hasValue: record.dividendPerShareAmount !== undefined,
            value: record.dividendPerShareAmount
          });
          break;
          
        case ProcessedRecordField.Notes:
          // There will be only one note value if it exists
          value = record[ProcessedRecordField.Notes]?.[0]?.replace(/"/g, '""') || '';
          console.log('fn util rTCR recordToCsvRow - Processing Notes:', value);
          break;
          
        case ProcessedRecordField.CUSIP:
          value = record[ProcessedRecordField.CUSIP] ?? '';
          console.log('fn util rTCR recordToCsvRow - Processing CUSIP:', value);
          break;
          
        default:
          // For standard fields, use the field name from our mapping
          value = record[fieldName as keyof ProcessedRecord] ?? '';
          console.log(`fn util rTCR header/field: ${header}/${fieldName} = ${value}`);
      }
      
      // Convert to string, escape quotes, and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  };
}

export function convertToOutput(
  standard: ProcessedRecord[],
  dividends: ProcessedRecord[],
  format: DownloadFormat = DownloadFormat.JSON
): string | ConversionResponse {
  const timestamp = new Date().toISOString();
  const recordCount = standard.length + dividends.length;

  if (format === DownloadFormat.JSON) {
    const response: ConversionResponse = {
      success: true,
      data: { 
        regularTransactions: standard,
        dividends 
      },
      format: DownloadFormat.JSON,
      timestamp,
      recordCount
    };
    return JSON.stringify(response, null, 2);
  }

  // For CSV, we'll create separate CSV strings for standard and dividend transactions
  if (format === DownloadFormat.CSV) {
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
      RegularTransactionHeader.Notes,
      DividendTransactionHeader.SharesOwned,
      DividendTransactionHeader.DividendPerShare
    ] as const;

    // Create field mappings for these headers
    const fieldMappings = createFieldMappings();
    
    // Create a row converter function
    const recordToCsvRow = createCsvRowConverter(headers, fieldMappings);

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
 * @param records - Array of ProcessedRecord objects to convert to CSV
 * @param recordType - The type of records being converted (Regular or Dividend)
 * @returns CSV string
 */
export const convertToCsv = (records: ProcessedRecord[], recordType: RecordType): string => {
  const isDividend = recordType === RecordType.Dividend;
  console.log(`Converting ${isDividend ? 'dividend' : 'regular'} records to CSV`);
  
  // Create field mappings
  const fieldMappings = createFieldMappings();
  
  // Base headers that are common to all record types
  const baseHeaders = [
    BaseHeader.ActivityDate,
    BaseHeader.ProcessDate,
    BaseHeader.SettleDate,
    BaseHeader.Instrument,
    BaseHeader.Description,
    BaseHeader.TransCode,
    BaseHeader.Amount
  ];

  // Initialize headers array with base headers
  let headers: string[] = [...baseHeaders];
  
  // Add type-specific headers
  if (isDividend) {
    // For dividend transactions, add dividend-specific headers
    headers.push(
      DividendTransactionHeader.SharesOwned,
      DividendTransactionHeader.DividendPerShare
    );
  } else {
    // For regular transactions, add regular transaction headers
    headers.push(
      RegularTransactionHeader.Quantity,
      RegularTransactionHeader.Price,
      RegularTransactionHeader.CUSIP,
      RegularTransactionHeader.Notes
    );
  }

  console.log(`Generated headers for ${isDividend ? 'dividend' : 'regular'} CSV:`, headers);
  
  // Create the row converter with the appropriate headers
  const recordToCsvRow = createCsvRowConverter(headers, fieldMappings);

  // Generate CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...records.map(record => {
      console.log(`Processing record for CSV:`, JSON.stringify(record, null, 2));
      return recordToCsvRow(record);
    }) // Data rows with logging
  ].join('\n');

  console.log('======================================');
  console.log(`Generated ${isDividend ? 'dividend' : 'regular'} CSV content (${records.length} records):`);
  console.log(csvContent.substring(0, 500) + (csvContent.length > 500 ? '...' : ''));
  console.log('======================================');
  
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
  format: DownloadFormat = DownloadFormat.JSON
): { contentType: string; data: string } {
  // For CSV, we want to send the raw CSV string directly
  if (format === DownloadFormat.CSV) {
    return {
      contentType: 'text/csv',
      data: data
    };
  }
  
  // For JSON, we'll wrap the data in a success response
  const response: ConversionResponse = {
    success: true,
    data: JSON.parse(data),
    format: DownloadFormat.JSON,
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
  console.log(`fn util fD dateString: ${dateString}`);
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
 * Processes a dividend transaction to extract shares and dividend per share
 * @param record - The record to process
 */
export const processDividendTransaction = (record: ProcessedRecord): void => {
  // Clear quantity and price fields for dividend transactions
  record[RegularTransactionHeader.Quantity] = undefined;
  record[RegularTransactionHeader.Price] = undefined;
  
  // Remove CUSIP for dividend transactions
  record[RegularTransactionHeader.CUSIP] = undefined;
  
  // Preserve notes if they exist
  const notes = record.notes || [];
  
  // Get the description using BaseHeader.Description or fall back to description
  const description = record[BaseHeader.Description] || record.description || '';
  
  // Check for dividend reinvestment in description
  if (description.toLowerCase().includes('dividend reinvestment') && !notes.includes(Note.DividendReinvestment)) {
    notes.push(Note.DividendReinvestment);
  }
  
  if (notes.length > 0) {
    record.notes = [...new Set(notes)]; // Remove duplicates
  }
  
  // Try to extract shares and dividend per share from the description
  // Format: "... 293.564723 shares at 0.275316"
  const sharesPattern = /(\d+\.?\d*)\s*shares?\s*at\s*(\d+\.?\d*)/i;
  const sharesMatch = description.match(sharesPattern);
  
  if (sharesMatch) {
    // Extract shares owned (first capture group)
    const shares = parseFloat(sharesMatch[1]);
    if (!isNaN(shares)) {
      record.sharesOwned = shares;
    }
    
    // Extract dividend per share (second capture group)
    const dividendPerShare = parseFloat(sharesMatch[2]);
    if (!isNaN(dividendPerShare)) {
      record.dividendPerShareAmount = dividendPerShare;
    }
  } else {
    // Fallback: Try to extract just the shares and calculate dividend per share from amount
    const fallbackMatch = description.match(/(\d+\.?\d*)\s*shares?/i);
    
    if (fallbackMatch) {
      const shares = parseFloat(fallbackMatch[1]);
      const amount = Math.abs(record[BaseHeader.Amount] || 0);
      if (!isNaN(shares) && amount > 0 && shares > 0) {
        const divPerShare = amount / shares;
        record.sharesOwned = shares;
        record.dividendPerShareAmount = divPerShare;
      }
    } else if (record[BaseHeader.Amount]) {
      // If we can't parse shares, set dividend per share to the amount
      record.dividendPerShareAmount = Math.abs(record[BaseHeader.Amount]);
    }
  }
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
 * Processes a raw record into an IProcessedRecord with proper types and derived fields
 * @param record - The raw record to process
 * @returns IProcessedRecord object with proper types and derived fields, or null if record should be skipped
 */
export const processRecord = (record: Record<string, string>): ProcessedRecord | null => {
  // Skip empty records or records that are just the footer
  if (Object.keys(record).length === 0 || 
      (Object.keys(record).length === 1 && record['']?.includes('The data provided is for informational purposes'))) {
    return null;
  }

  const processedRecord: Partial<ProcessedRecord> = {};
  
  // Create field mappings
  const fieldMappings = createFieldMappings();
  
  console.log('-------------------------------------------');
  console.log('uT fN pR field mappings: ', fieldMappings);
  
  // Type guard to check if a field is a date field
  const isDateField = (field: string): boolean => {
    const dateFields = [
      ProcessedRecordField.ActivityDate,
      ProcessedRecordField.ProcessDate,
      ProcessedRecordField.SettleDate,
      BaseHeader.ActivityDate,
      BaseHeader.ProcessDate,
      BaseHeader.SettleDate
    ];
    const isDate = dateFields.includes(field as any);
    console.log(`fn util isDateField('${field}') = ${isDate}`);
    return isDate;
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
    const fieldName = fieldMappings.get(key);
    console.log(`fn util pR fieldName: ${fieldName}`);
    
    // Skip if we don't have a valid field name
    if (!fieldName) continue;
    
    // Process based on field type
    if (isDateField(key)) {
      console.log(`fn util pR Processing date field '${key}' as '${fieldName}' with value: ${value}`);
      const formattedDate = formatDate(value);
      console.log(`fn util pR Formatted date: ${formattedDate}`);
      if (formattedDate) {
        // Type assertion is safe here because we've already checked the field name
        processedRecord[fieldName] = formattedDate;
      }
    } else if (isNumberField(key)) {
      const num = parseNumber(value);
      if (num !== undefined) {
        // Type assertion is safe here because we've already checked the field name
        processedRecord[fieldName] = num;
      } else {
        console.warn(`fn util pR Could not parse sanitized number for key '${key}': Original='${value}'`);
      }
    } else {
      // Type assertion is safe here because we've already checked the field name
      processedRecord[fieldName] = value;
    }
  }

  // Extract CUSIP and notes from description
  if (processedRecord.description) {
    const description = processedRecord.description.toLowerCase();
    console.log(`fn util pR Processing description: "${description}"`);
    
    // Extract CUSIP
    const cusip = extractCusip(description);
    console.log(`fn util pR Extracted CUSIP: ${cusip || 'Not found'}`);
    if (cusip) {
      processedRecord.cusip = cusip;
      console.log(`fn util pR Set CUSIP on record: ${processedRecord.cusip}`);
    }
    
    // Process notes
    const notes: Note[] = [];
    
    if (description.includes('recurring')) {
      notes.push(Note.Recurring);
    }
    if (description.includes('dividend reinvestment')) {
      notes.push(Note.DividendReinvestment);
    }
    
    if (notes.length > 0) {
      processedRecord.notes = notes;
      console.log(`fn util pR Set notes on record: ${notes.join(', ')}`);
    }
    
    // Set record type based on transaction code
    if (processedRecord.transCode) {
      const transCode = processedRecord.transCode.trim().toUpperCase();
      processedRecord.recordType = transCode === 'CDIV' ? RecordType.Dividend : RecordType.Regular;
    } else {
      // Default to Regular if no transaction code is present
      processedRecord.recordType = RecordType.Regular;
    }
  }

  // Return the processed record with notes
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
    let fileBuffer: Buffer = Buffer.alloc(0);
    let fileInfo: FileUploadResult | null = null;

    bb.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: BusboyModule.FileInfo) => {
      const { filename, mimeType } = info;
      console.log(`fn util hFU File [${fieldname}]: filename: ${filename}, mimeType: ${mimeType}`);
      
      fileInfo = {
        filename,
        mimetype: mimeType || 'application/octet-stream',
        originalFileName: filename,
        fileData: Buffer.alloc(0), // Will be filled with file data
        fileContent: ''
      } as FileUploadResult;

      file.on('data', (data: Buffer) => {
        console.log(`fn util hFU File [${fieldname}] got ${data.length} bytes`);
        fileBuffer = Buffer.concat([fileBuffer, data]);
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

      if (fileBuffer.length === 0) {
        reject(new Error('Uploaded file is empty'));
      } else if (fileInfo) {
        fileInfo.fileData = fileBuffer;
        fileInfo.fileContent = fileBuffer.toString('utf-8');
        resolve(fileInfo);
      } else {
        reject(new Error('File info not available'));
      }
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
