import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from './interfaces-fn';

// Firebase Functions v2 handles CORS and request parsing automatically
import { 
  processDividendTransaction, 
  processRecord,
  parseCSV,
  handleError,
  sendSuccessResponse,
  handleFileUpload
} from './utils-fn';

/**
 * Handles CSV file uploads from the frontend.
 * Parses multipart/form-data to extract the file.
 */
/**
 * Cloud Function to handle CSV file uploads and process transaction data
 */
export const uploadCsv = onRequest(
  { cors: true },
  async (request: Request, response: Response) => {
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

      for (const record of records) {
        // Process the record using helper functions
        const processedRecord = processRecord(record);
        
        // Skip null records (empty or footer)
        if (!processedRecord) {
          console.log('fn uC Skipping empty or footer record');
          continue;
        }
        
        validRecordCount++;
        
        // console.log(`fn uC [${validRecordCount}/${records.length}] Processing record:`, {
        //   rawRecord: record,
        //   processedRecord
        // });

        // Categorize transaction based on transaction code
        const transactionType = (processedRecord['Trans Code'] || '').toString().trim().toUpperCase();
        console.log(`fn uC Transaction type: '${transactionType}'`);
        
        if (transactionType === 'CDIV') {
          console.log('fn uC Found CDIV transaction, processing...');
          // Process dividend-specific fields
          processDividendTransaction(processedRecord);
          dividendTransactions.push(processedRecord);
          console.log('fn uC CDIV transaction processed successfully');
        } else {
          console.log('fn uC Standard transaction, adding to standardTransactions');
          standardTransactions.push(processedRecord);
        }
      }
      
      sendSuccessResponse(response, {
        standardTransactions,
        dividendTransactions,
        originalFileName,
        message: `Successfully processed ${standardTransactions.length} standard transactions and ${dividendTransactions.length} dividend transactions`
      });
      
    } catch (error) {
      handleError(error, response, 'processing file upload');
    }
  }
);
