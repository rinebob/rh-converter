import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as BusboyModule from 'busboy'; // Aliased import for clarity

/**
 * Handles CSV file uploads from the frontend.
 * Parses multipart/form-data to extract the file.
 */
export const uploadCsv = onRequest(
  { cors: true }, // Enable CORS for all origins by default, can be configured more strictly
  (request, response) => {
    if (request.method === "OPTIONS") {
      // Handle CORS preflight requests.
      response.status(204).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    const bb = BusboyModule.default({ headers: request.headers });
    let fileData: Buffer[] = [];
    let originalFileName = '';

    bb.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: BusboyModule.FileInfo) => {
      const { filename, encoding, mimeType } = info;
      logger.info(`File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimeType: ${mimeType}`);
      originalFileName = filename;

      file.on('data', (data: Buffer) => {
        logger.info(`File [${fieldname}] got ${data.length} bytes`);
        fileData.push(data);
      });

      file.on('end', () => {
        logger.info(`File [${fieldname}] Finished`);
      });

      file.on('error', (err: Error) => {
        logger.error(`File [${fieldname}] Error:`, err);
      });
    });

    bb.on('finish', () => {
      if (originalFileName && fileData.length > 0) {
        const fullFile = Buffer.concat(fileData);
        logger.info(`Received file ${originalFileName} with size ${fullFile.length} bytes.`);
        // TODO: Actual file processing logic will go here (e.g., save to GCS, parse CSV)
        response.status(200).json({ 
          message: `File '${originalFileName}' uploaded successfully. Size: ${fullFile.length} bytes.`,
          filename: originalFileName,
          size: fullFile.length
        });
      } else {
        logger.warn('No file was uploaded or file data is empty.');
        response.status(400).json({ message: 'No file uploaded or file is empty.' });
      }
    });

    bb.on('error', (err: Error) => {
      logger.error('Busboy error:', err);
      response.status(500).json({ message: 'Error processing file upload.', error: err.message });
    });

    if (request.rawBody) {
      bb.end(request.rawBody);
    } else {
      request.pipe(bb);
    }
  }
);
