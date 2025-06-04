import { onRequest } from 'firebase-functions/v2/https';
import { 
  Request, 
  Response, 
  RecordType 
} from './interfaces-fn';
import { convertToCsv } from './utils-fn';

// Firebase Functions v2 handles CORS and request parsing automatically
import { 
  processDividendTransaction, 
  processRecord,
  parseCSV,
  handleError,
  handleFileUpload
} from './utils-fn';

// CORS configuration - using boolean for simplicity
const corsEnabled = true;

// Function to set CORS headers
const setCorsHeaders = (response: Response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
};

/**
 * Cloud Function to handle CSV file uploads and process transaction data
 */
export const uploadCsv = onRequest(
  { cors: corsEnabled },
  async (request: Request, response: Response) => {
    // Set CORS headers for all responses
    setCorsHeaders(response);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Process the file using the utility function
      const { fileData, originalFileName } = await handleFileUpload(request);
      
      console.log(`fn uC Received file ${originalFileName} with size ${fileData.length} bytes.`);

      const standardTransactions: Record<string, any>[] = [];
      const dividendTransactions: Record<string, any>[] = [];
      
      const fileContentString = fileData.toString('utf-8');
      
      // Parse the CSV content using our utility function
      const records = await parseCSV(fileContentString);

      console.log(`fn uC Parsed ${records.length} records from CSV.`);

      let validRecordCount = 0;

      console.log(`fn uC Starting to process ${records.length} records`);
      for (const [index, record] of records.entries()) {
        try {
          // Process the record using helper functions
          console.log(`fn uC [${index + 1}/${records.length}] Raw record:`, JSON.stringify(record, null, 2));
          const processedRecord = processRecord(record);
          
          // Skip null records (empty or footer)
          if (!processedRecord) {
            console.log('fn uC Skipping empty or footer record');
            continue;
          }
          
          validRecordCount++;
          
          // Categorize transaction based on transaction code - get it from the raw record
          const transactionType = (record['Trans Code'] || '').toString().trim().toUpperCase();
          const description = (processedRecord['Description'] || '').toString();
          
          console.log(`fn uC [${validRecordCount}/${records.length}] Processing record - ` +
            `Type: '${transactionType}', ` +
            `Description: '${description.substring(0, 50)}${description.length > 50 ? '...' : ''}'`);
          
          // Check for dividend transactions (CDIV)
          if (transactionType === 'CDIV') {
            console.log('fn uC Found CDIV transaction, processing...');
            console.log('fn uC Record before processDividendTransaction:', JSON.stringify(processedRecord, null, 2));
            
            // Process dividend-specific fields
            processDividendTransaction(processedRecord);
            
            console.log('fn uC Record after processDividendTransaction:', JSON.stringify(processedRecord, null, 2));
            dividendTransactions.push(processedRecord);
            console.log(`fn uC Added to dividendTransactions (now ${dividendTransactions.length} items)`);
          } else {
            standardTransactions.push(processedRecord);
            console.log(`fn uC Added to standardTransactions (now ${standardTransactions.length} items)`);
          }
        } catch (error) {
          console.error(`fn uC Error processing record ${index + 1}:`, error);
          console.error('Problematic record:', JSON.stringify(record, null, 2));
        }
      }
      
      // Get the requested format (defaults to 'both' if not specified or invalid)
      const format = request.query.format === 'csv' ? 'csv' : 
                    request.query.format === 'json' ? 'json' : 'both';
      
      // Get the base name from the original file (without .csv extension)
      const baseName = originalFileName.replace(/\.csv$/i, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Create base filename
      const baseFilename = `${baseName}_transactions_${timestamp}`;
      
      try {
        console.log('Generating files...');
        
        let responseData: Buffer | string;
        let contentType: string;
        let filename: string;

        if (format === 'json') {
          // Create JSON data
          const jsonData = JSON.stringify({
            success: true,
            data: {
              regularTransactions: standardTransactions,
              dividends: dividendTransactions
            },
            format: 'json',
            timestamp: new Date().toISOString(),
            recordCount: standardTransactions.length + dividendTransactions.length
          }, null, 2);
          
          responseData = Buffer.from(jsonData, 'utf-8');
          contentType = 'application/json';
          filename = `${baseFilename}.json`;
          
          // Set appropriate headers
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          response.setHeader('Content-Length', responseData.length.toString());
          
          console.log(`Sending JSON file: ${filename} (${responseData.length} bytes)`);
          response.status(200).send(responseData);
          return;
          
        } else if (format === 'csv') {
          // For CSV format, create a ZIP with both CSVs
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          
          // Always include both CSVs, even if empty
          const regularCsv = standardTransactions.length > 0 
            ? convertToCsv(standardTransactions, RecordType.Regular)
            : 'Activity Date,Process Date,Settle Date,Instrument,Description,Trans Code,Quantity,Price,Amount,CUSIP,Is Recurring\n';
          
          const dividendCsv = dividendTransactions.length > 0
            ? convertToCsv(dividendTransactions, RecordType.Dividend)
            : 'Activity Date,Process Date,Settle Date,Instrument,Description,Trans Code,Quantity,Price,Amount,CUSIP,Is Recurring,Shares Owned,Dividend Per Share\n';
          
          // Add both CSV files to the ZIP
          zip.file(`${baseFilename}_regular.csv`, regularCsv);
          zip.file(`${baseFilename}_dividend.csv`, dividendCsv);
          
          console.log(`CSV: Added regular transactions with ${standardTransactions.length} records`);
          console.log(`CSV: Added dividend transactions with ${dividendTransactions.length} records`);
          
          // Generate the ZIP file
          responseData = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
          });
          
          // Set headers for ZIP file
          contentType = 'application/zip';
          filename = `${baseFilename}.zip`;
          
          // Set appropriate headers
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          response.setHeader('Content-Length', responseData.length.toString());
          
          console.log(`Sending ZIP file with CSVs: ${filename} (${responseData.length} bytes)`);
          response.status(200).send(responseData);
          return;
          
        } else { // both
          // For 'both' format, create a ZIP with JSON and both CSVs
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          
          // Add JSON file to ZIP
          const jsonData = JSON.stringify({
            success: true,
            data: {
              regularTransactions: standardTransactions,
              dividends: dividendTransactions
            },
            format: 'both',
            timestamp: new Date().toISOString(),
            recordCount: standardTransactions.length + dividendTransactions.length
          }, null, 2);
          zip.file(`${baseFilename}.json`, jsonData);
          
          // Add regular transactions CSV
          const regularCsv = convertToCsv(standardTransactions, RecordType.Regular);
          zip.file(`${baseFilename}_regular.csv`, regularCsv);
          
          // Add dividend transactions CSV if there are any
          if (dividendTransactions.length > 0) {
            const dividendCsv = convertToCsv(dividendTransactions, RecordType.Dividend);
            zip.file(`${baseFilename}_dividend.csv`, dividendCsv);
          }
          
          // Generate the ZIP file
          responseData = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
          });
          
          // Set headers for ZIP file
          contentType = 'application/zip';
          filename = `${baseFilename}.zip`;
          
          // Set appropriate headers
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          response.setHeader('Content-Length', responseData.length.toString());
          
          console.log(`Sending ZIP file with all formats: ${filename} (${responseData.length} bytes)`);
          response.status(200).send(responseData);
          return;
        }
        
        // Set appropriate headers
        response.setHeader('Content-Type', contentType);
        response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        response.setHeader('Content-Length', responseData.length.toString());
        
        console.log(`Sending ${contentType} file: ${filename} (${responseData.length} bytes)`);
        response.status(200).send(responseData);
        
      } catch (error) {
        console.error('Error generating files:', error);
        setCorsHeaders(response);
        response.status(500).json({
          success: false,
          error: 'Failed to generate files',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
    } catch (error) {
      setCorsHeaders(response);
      handleError(error, response, 'processing file upload');
    }
  }
);
