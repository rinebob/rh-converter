import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { Request, Response, ImageFormat, ImageConversionRequest, ImageConversionResponse, ConvertedFileInfo } from './interfaces-fn';
import { downloadFromStorage, uploadToStorage, generateSignedUrl } from './storage-helpers';
import sharp from 'sharp';
import * as bmp from 'bmp-js';

/**
 * Set CORS headers on response
 */
const setCorsHeaders = (response: Response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

/**
 * Get content type for image format
 */
const getContentType = (format: ImageFormat): string => {
  const contentTypes: Record<ImageFormat, string> = {
    [ImageFormat.PNG]: 'image/png',
    [ImageFormat.JPEG]: 'image/jpeg',
    [ImageFormat.BMP]: 'image/bmp'
  };
  return contentTypes[format];
};

/**
 * Convert a single image buffer to target format
 */
const convertSingleImage = async (
  fileData: Buffer,
  targetFormat: ImageFormat,
  quality?: number
): Promise<Buffer> => {
  try {
    let sharpInstance: sharp.Sharp;

    // Check if input is BMP - Sharp doesn't support BMP input, so decode with bmp-js first
    const isBMP = fileData[0] === 0x42 && fileData[1] === 0x4D; // BM header
    
    if (isBMP) {
      logger.info('fn cI2 cSI Detected BMP input, decoding with bmp-js');
      const bmpData = bmp.decode(fileData);
      
      // Convert RGBA to RGB if needed (bmp-js returns RGBA)
      sharpInstance = sharp(bmpData.data, {
        raw: {
          width: bmpData.width,
          height: bmpData.height,
          channels: 4
        }
      });
    } else {
      sharpInstance = sharp(fileData);
    }

    // Apply format-specific conversion
    switch (targetFormat) {
      case ImageFormat.PNG:
        return await sharpInstance.png({ quality: quality || 100 }).toBuffer();
      
      case ImageFormat.JPEG:
        return await sharpInstance.jpeg({ quality: quality || 100 }).toBuffer();
      
      case ImageFormat.BMP:
        // Sharp doesn't support BMP output, so convert to raw RGBA and encode with bmp-js
        const { data, info } = await sharpInstance.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const bmpOutput = {
          data: data,
          width: info.width,
          height: info.height
        };
        return Buffer.from(bmp.encode(bmpOutput).data);
      
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }
  } catch (error) {
    logger.error('fn cI2 cSI Error converting image:', error);
    throw new Error(`Image conversion failed: ${(error as Error).message}`);
  }
};

/**
 * Generate output filename with new extension
 */
const generateOutputFilename = (originalFilename: string, targetFormat: ImageFormat): string => {
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
  const extension = targetFormat === ImageFormat.JPEG ? 'jpg' : targetFormat;
  return `${nameWithoutExt}.${extension}`;
};

/**
 * Cloud Function to handle image conversion via Cloud Storage
 * 
 * Request Body (JSON):
 * {
 *   sessionId: string,
 *   userId: string,
 *   files: [{ storagePath: string, originalName: string }],
 *   targetFormat: 'png' | 'jpeg' | 'bmp',
 *   quality: number (1-100)
 * }
 * 
 * Response (JSON):
 * {
 *   success: true,
 *   files: [{ originalName, convertedName, downloadUrl, expiresAt, size }],
 *   sessionId: string
 * }
 */
export const convertImageV2 = onRequest(
  { 
    memory: '512MiB',
    timeoutSeconds: 120,
    maxInstances: 10,
    invoker: 'public'
  },
  async (request: Request, response: Response) => {
    // Set CORS headers first
    setCorsHeaders(response);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    try {
      // Parse request body
      const body: ImageConversionRequest = request.body;
      
      logger.info('fn cI2 Request body:', JSON.stringify(body));
      logger.info(`fn cI2 Body fields - sessionId: ${body.sessionId}, userId: ${body.userId}, files: ${body.files?.length}, targetFormat: ${body.targetFormat}`);
      
      if (!body.sessionId || !body.userId || !body.files || !body.targetFormat) {
        logger.error('fn cI2 Missing required fields in request');
        response.status(400).json({
          success: false,
          error: 'Missing required fields: sessionId, userId, files, targetFormat'
        });
        return;
      }

      logger.info(`fn cI2 Processing ${body.files.length} files for session ${body.sessionId}`);

      const targetFormat = body.targetFormat;
      const quality = body.quality || 100;
      const convertedFiles: ConvertedFileInfo[] = [];

      // Process each file
      for (const fileRef of body.files) {
        try {
          logger.info(`fn cI2 Processing file: ${fileRef.originalName}`);

          // Download from Storage
          const fileData = await downloadFromStorage(fileRef.storagePath);
          logger.info(`fn cI2 Downloaded ${fileData.length} bytes`);

          // Convert image
          const convertedData = await convertSingleImage(fileData, targetFormat, quality);
          logger.info(`fn cI2 Converted to ${convertedData.length} bytes`);

          // Generate output filename
          const convertedFilename = generateOutputFilename(fileRef.originalName, targetFormat);

          // Upload converted file to Storage
          const convertedPath = `image-converter/converted/${body.userId}/${body.sessionId}/${convertedFilename}`;
          const contentType = getContentType(targetFormat);
          await uploadToStorage(convertedPath, convertedData, contentType);
          logger.info(`fn cI2 Uploaded converted file to ${convertedPath}`);

          // Generate signed download URL (valid for 1 hour)
          const downloadUrl = await generateSignedUrl(convertedPath, 60);

          // Add to results
          convertedFiles.push({
            originalName: fileRef.originalName,
            convertedName: convertedFilename,
            downloadUrl,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            size: convertedData.length
          });

          logger.info(`fn cI2 Successfully processed ${fileRef.originalName}`);
        } catch (error) {
          logger.error(`fn cI2 Error processing file ${fileRef.originalName}:`, error);
          throw error; // Fail entire batch if one file fails
        }
      }

      // Return success response
      const responseData: ImageConversionResponse = {
        success: true,
        files: convertedFiles,
        sessionId: body.sessionId
      };

      logger.info(`fn cI2 Successfully converted ${convertedFiles.length} files`);
      response.status(200).json(responseData);

    } catch (error) {
      logger.error('fn cI2 Error in convertImageV2:', error);
      
      const errorResponse: ImageConversionResponse = {
        success: false,
        files: [],
        sessionId: request.body?.sessionId || 'unknown',
        error: (error as Error).message || 'Image conversion failed'
      };

      response.status(500).json(errorResponse);
    }
  }
);
