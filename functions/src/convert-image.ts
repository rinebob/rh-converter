import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from './interfaces-fn';
import { handleError } from './utils-fn';
import sharp from 'sharp';
import JSZip from 'jszip';
import Busboy from 'busboy';
import * as bmp from 'bmp-js';

/**
 * Supported image formats for conversion
 */
export enum ImageFormat {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
  BMP = 'bmp',
  WEBP = 'webp',
  GIF = 'gif',
  TIFF = 'tiff',
  AVIF = 'avif'
}

/**
 * Configuration for image conversion
 */
interface ConversionOptions {
  targetFormat: ImageFormat;
  quality?: number; // 1-100 for lossy formats (JPG, WEBP, AVIF)
}

/**
 * Uploaded file data
 */
interface UploadedFile {
  filename: string;
  data: Buffer;
  mimetype: string;
}

/**
 * CORS configuration
 */
const corsEnabled = true;

/**
 * Set CORS headers on response
 */
const setCorsHeaders = (response: Response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
};

/**
 * Validate image format
 */
const isValidImageFormat = (format: string): format is ImageFormat => {
  return Object.values(ImageFormat).includes(format as ImageFormat);
};

/**
 * Get content type for image format
 */
const getContentType = (format: ImageFormat): string => {
  const contentTypes: Record<ImageFormat, string> = {
    [ImageFormat.PNG]: 'image/png',
    [ImageFormat.JPG]: 'image/jpeg',
    [ImageFormat.JPEG]: 'image/jpeg',
    [ImageFormat.BMP]: 'image/bmp',
    [ImageFormat.WEBP]: 'image/webp',
    [ImageFormat.GIF]: 'image/gif',
    [ImageFormat.TIFF]: 'image/tiff',
    [ImageFormat.AVIF]: 'image/avif'
  };
  return contentTypes[format];
};

/**
 * Parse multipart form data and extract files
 */
const parseMultipartFiles = (request: Request): Promise<UploadedFile[]> => {
  return new Promise((resolve, reject) => {
    const files: UploadedFile[] = [];
    const busboy = Busboy({ headers: request.headers });

    busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];

      console.log(`fn cI Receiving file: ${filename}, type: ${mimeType}`);

      file.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      file.on('end', () => {
        const fileData = Buffer.concat(chunks);
        console.log(`fn cI File ${filename} received: ${fileData.length} bytes`);
        files.push({
          filename,
          data: fileData,
          mimetype: mimeType
        });
      });

      file.on('error', (error: Error) => {
        console.error(`fn cI Error reading file ${filename}:`, error);
        reject(error);
      });
    });

    busboy.on('finish', () => {
      console.log(`fn cI Finished parsing multipart data. Total files: ${files.length}`);
      resolve(files);
    });

    busboy.on('error', (error: Error) => {
      console.error('fn cI Error parsing multipart data:', error);
      reject(error);
    });

    // Use rawBody if available (Firebase Functions v2), otherwise pipe the request
    if (request.rawBody) {
      busboy.end(request.rawBody);
    } else {
      request.pipe(busboy);
    }
  });
};

/**
 * Convert a single image to target format
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
      console.log('fn cI Detected BMP input, decoding with bmp-js');
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
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
        break;
      
      case ImageFormat.JPG:
      case ImageFormat.JPEG:
        sharpInstance = sharpInstance.jpeg({ quality: quality || 90 });
        break;
      
      case ImageFormat.WEBP:
        sharpInstance = sharpInstance.webp({ quality: quality || 90 });
        break;
      
      case ImageFormat.AVIF:
        sharpInstance = sharpInstance.avif({ quality: quality || 90 });
        break;
      
      case ImageFormat.BMP:
        // Sharp doesn't support BMP output natively, use bmp-js
        const rawImageData = await sharpInstance.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const bmpData = bmp.encode({
          data: rawImageData.data,
          width: rawImageData.info.width,
          height: rawImageData.info.height
        });
        return bmpData.data;
      
      case ImageFormat.TIFF:
        sharpInstance = sharpInstance.tiff({ compression: 'lzw' });
        break;
      
      case ImageFormat.GIF:
        sharpInstance = sharpInstance.gif();
        break;
      
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }

    return await sharpInstance.toBuffer();
  } catch (error) {
    console.error('fn cI Error converting image:', error);
    throw error;
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
 * Cloud Function to handle image conversion
 * 
 * Query Parameters:
 * - targetFormat: Target image format (png, jpg, bmp, webp, gif, tiff, avif)
 * - quality: Quality for lossy formats (1-100, default 90)
 * 
 * Request Body:
 * - Multipart form data with one or more image files
 * 
 * Response:
 * - Single file: Converted image blob
 * - Multiple files: ZIP archive containing all converted images
 */
export const convertImage = onRequest(
  { 
    cors: corsEnabled,
    memory: '512MiB',
    timeoutSeconds: 120,
    maxInstances: 10,
    minInstances: 1,
    invoker: 'public'
  },
  async (request: Request, response: Response) => {
    setCorsHeaders(response);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Only allow POST
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Parse query parameters
      const targetFormatParam = request.query.targetFormat as string;
      const qualityParam = request.query.quality as string;

      // Validate target format
      if (!targetFormatParam || !isValidImageFormat(targetFormatParam)) {
        response.status(400).json({
          error: 'Invalid or missing targetFormat parameter',
          validFormats: Object.values(ImageFormat)
        });
        return;
      }

      const targetFormat = targetFormatParam as ImageFormat;
      const quality = qualityParam ? parseInt(qualityParam, 10) : 90;

      // Validate quality
      if (quality < 1 || quality > 100) {
        response.status(400).json({
          error: 'Quality must be between 1 and 100'
        });
        return;
      }

      console.log(`fn cI Starting image conversion - Format: ${targetFormat}, Quality: ${quality}`);

      // Parse uploaded files
      const files = await parseMultipartFiles(request);

      if (files.length === 0) {
        response.status(400).json({
          error: 'No files uploaded'
        });
        return;
      }

      console.log(`fn cI Processing ${files.length} file(s)`);

      const conversionOptions: ConversionOptions = {
        targetFormat,
        quality
      };

      // Convert all files
      const convertedFiles: Array<{ filename: string; data: Buffer }> = [];

      for (const file of files) {
        try {
          console.log(`fn cI Converting ${file.filename} (${file.data.length} bytes) to ${targetFormat}`);
          
          const convertedData = await convertSingleImage(
            file.data,
            conversionOptions.targetFormat,
            conversionOptions.quality
          );

          const outputFilename = generateOutputFilename(file.filename, targetFormat);
          
          convertedFiles.push({
            filename: outputFilename,
            data: convertedData
          });

          console.log(`fn cI Converted ${file.filename} -> ${outputFilename} (${convertedData.length} bytes)`);
        } catch (error) {
          console.error(`fn cI Error converting ${file.filename}:`, error);
          throw new Error(`Failed to convert ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // If single file, return it directly
      if (convertedFiles.length === 1) {
        const converted = convertedFiles[0];
        const contentType = getContentType(targetFormat);
        
        response.setHeader('Content-Type', contentType);
        response.setHeader('Content-Disposition', `attachment; filename="${converted.filename}"`);
        response.setHeader('Content-Length', converted.data.length.toString());
        
        console.log(`fn cI Sending single file: ${converted.filename}`);
        response.status(200).send(converted.data);
        return;
      }

      // Multiple files - create ZIP
      console.log(`fn cI Creating ZIP archive with ${convertedFiles.length} files`);
      
      const zip = JSZip();
      
      for (const file of convertedFiles) {
        zip.file(file.filename, file.data);
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const zipFilename = `converted-images-${timestamp}.zip`;

      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
      response.setHeader('Content-Length', zipBuffer.length.toString());

      console.log(`fn cI Sending ZIP file: ${zipFilename} (${zipBuffer.length} bytes)`);
      response.status(200).send(zipBuffer);

    } catch (error) {
      console.error('fn cI Error in convertImage function:', error);
      handleError(error, response);
    }
  }
);
