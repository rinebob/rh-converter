import { onRequest } from 'firebase-functions/v2/https';
import { 
  Request, 
  Response, 
  RecordType,
  DownloadFormat
} from './interfaces-fn';
import { 
  convertToCsv, 
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
          
          const description = processedRecord.description?.toString() || '';
          
          console.log(`fn uC [${validRecordCount}/${records.length}] Processing record - ` +
            `Type: '${processedRecord.recordType || 'unknown'}', ` +
            `TransCode: '${processedRecord.transCode || 'none'}', ` +
            `Description: '${description.substring(0, 50)}${description.length > 50 ? '...' : ''}'`);
          
          // Categorize transaction based on recordType
          if (processedRecord.recordType === RecordType.Dividend) {
            try {
              processDividendTransaction(processedRecord);
              dividendTransactions.push(processedRecord);
            } catch (error) {
              console.error('fn uC Error processing dividend transaction:', error);
              // Convert to regular transaction if dividend processing fails
              processedRecord.recordType = RecordType.Regular;
              standardTransactions.push(processedRecord);
            }
          } else {
            standardTransactions.push(processedRecord);
          }
        } catch (error) {
          console.error(`fn uC Error processing record ${index + 1}:`, error);
          console.error('Problematic record:', JSON.stringify(record, null, 2));
        }
      }
      
      // Determine the requested format (defaults to 'json' if not specified or invalid)
      type ResponseFormat = 'json' | 'csv' | 'both';
      const format: ResponseFormat = 
        request.query.format === DownloadFormat.CSV ? 'csv' : 
        request.query.format === DownloadFormat.JSON ? 'json' : 'both';
      
      // Get the base name from the original file (without .csv extension)
      const baseName = originalFileName.replace(/\.csv$/i, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Create base filename
      const baseFilename = `${baseName}_transactions_${timestamp}`;
      
      try {
        console.log('Generating files...');
        
        if (format === DownloadFormat.JSON) {
          const jsonData = JSON.stringify({
            success: true,
            data: {
              regularTransactions: standardTransactions,
              dividends: dividendTransactions
            },
            format: DownloadFormat.JSON,
            timestamp: new Date().toISOString(),
            recordCount: standardTransactions.length + dividendTransactions.length
          }, null, 2);
          
          const responseData = Buffer.from(jsonData, 'utf-8');
          const contentType = 'application/json';
          const filename = `${baseFilename}.json`;
          
          console.log(`Sending JSON file: ${filename} (${responseData.length} bytes)`);
          
          // Set headers and send the response
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          response.setHeader('Content-Length', responseData.length.toString());
          
          console.log(`Sending JSON file: ${filename} (${responseData.length} bytes)`);
          response.status(200).send(responseData);
          
        } else if (format === DownloadFormat.CSV) {
          // For CSV format, create a ZIP with both CSVs
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          
          // Only include CSV files for record types that have data
          if (standardTransactions.length > 0) {
            const regularCsv = convertToCsv(standardTransactions, RecordType.Regular);
            zip.file(`${baseFilename}_regular.csv`, regularCsv);
            console.log(`CSV: Added ${standardTransactions.length} regular transactions`);
          } else {
            console.log('No regular transactions to include in CSV');
          }
          
          if (dividendTransactions.length > 0) {
            const dividendCsv = convertToCsv(dividendTransactions, RecordType.Dividend);
            zip.file(`${baseFilename}_dividend.csv`, dividendCsv);
            console.log(`CSV: Added ${dividendTransactions.length} dividend transactions`);
          } else {
            console.log('No dividend transactions to include in CSV');
          }
          
          // Generate the ZIP file
          const responseData = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
          });
          
          // Set headers for ZIP file
          const contentType = 'application/zip';
          const filename = `${baseFilename}.zip`;
          
          // Set appropriate headers
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          response.setHeader('Content-Length', responseData.length.toString());
          
          console.log(`Sending ZIP file with CSVs: ${filename} (${responseData.length} bytes)`);
          response.status(200).send(responseData);
          return;
          
        } else { // DownloadFormat.BOTH
          // For 'both' format, create a ZIP with JSON and both CSVs
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          
          const jsonData = JSON.stringify({
            success: true,
            data: {
              regularTransactions: standardTransactions,
              dividends: dividendTransactions
            },
            format: DownloadFormat.BOTH,
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
          const responseData = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
          });
          
          // Set headers for ZIP file
          const contentType = 'application/zip';
          const filename = `${baseFilename}.zip`;
          
          // Set appropriate headers
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          response.setHeader('Content-Length', responseData.length.toString());
          
          console.log(`Sending ZIP file with all formats: ${filename} (${responseData.length} bytes)`);
          response.status(200).send(responseData);
          return;
        }
        
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
