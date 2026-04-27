import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';

/**
 * Storage helper functions for image converter
 */

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET || 'rh-converter.appspot.com';

/**
 * Download a file from Cloud Storage
 */
export const downloadFromStorage = async (storagePath: string): Promise<Buffer> => {
  try {
    logger.info(`fn sH dFS Downloading file from Storage: ${storagePath}`);
    const bucket = getStorage().bucket(BUCKET_NAME);
    const file = bucket.file(storagePath);
    
    const [fileBuffer] = await file.download();
    logger.info(`fn sH dFS Downloaded ${fileBuffer.length} bytes from ${storagePath}`);
    
    return fileBuffer;
  } catch (error) {
    logger.error(`fn sH dFS Error downloading from Storage: ${storagePath}`, error);
    throw new Error(`Failed to download file from Storage: ${storagePath}`);
  }
};

/**
 * Upload a file to Cloud Storage
 */
export const uploadToStorage = async (storagePath: string, data: Buffer, contentType: string): Promise<void> => {
  try {
    logger.info(`fn sH uTS Uploading file to Storage: ${storagePath}, size: ${data.length} bytes`);
    const bucket = getStorage().bucket(BUCKET_NAME);
    const file = bucket.file(storagePath);
    
    await file.save(data, {
      metadata: {
        contentType,
      },
    });
    
    logger.info(`fn sH uTS Successfully uploaded to ${storagePath}`);
  } catch (error) {
    logger.error(`fn sH uTS Error uploading to Storage: ${storagePath}`, error);
    throw new Error(`Failed to upload file to Storage: ${storagePath}`);
  }
};

/**
 * Generate a signed URL for downloading a file
 * URL expires after specified duration
 */
export const generateSignedUrl = async (storagePath: string, expiresInMinutes: number = 60): Promise<string> => {
  try {
    logger.info(`fn sH gSU Generating signed URL for: ${storagePath}`);
    const bucket = getStorage().bucket(BUCKET_NAME);
    const file = bucket.file(storagePath);
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    
    logger.info(`fn sH gSU Generated signed URL for ${storagePath}`);
    return url;
  } catch (error) {
    logger.error(`fn sH gSU Error generating signed URL: ${storagePath}`, error);
    throw new Error(`Failed to generate signed URL for: ${storagePath}`);
  }
};

/**
 * Delete a file from Cloud Storage
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
  try {
    logger.info(`fn sH dF Deleting file from Storage: ${storagePath}`);
    const bucket = getStorage().bucket(BUCKET_NAME);
    const file = bucket.file(storagePath);
    
    await file.delete();
    logger.info(`fn sH dF Successfully deleted ${storagePath}`);
  } catch (error) {
    // Don't throw error if file doesn't exist
    if ((error as any).code === 404) {
      logger.warn(`fn sH dF File not found (already deleted?): ${storagePath}`);
      return;
    }
    logger.error(`fn sH dF Error deleting file: ${storagePath}`, error);
    throw new Error(`Failed to delete file from Storage: ${storagePath}`);
  }
};

/**
 * Delete all files in a session folder
 */
export const deleteSession = async (userId: string, sessionId: string): Promise<void> => {
  try {
    logger.info(`fn sH dS Deleting session: ${userId}/${sessionId}`);
    const bucket = getStorage().bucket(BUCKET_NAME);
    
    // Delete uploads folder
    const uploadsPrefix = `image-converter/uploads/${userId}/${sessionId}/`;
    await bucket.deleteFiles({ prefix: uploadsPrefix });
    
    // Delete converted folder
    const convertedPrefix = `image-converter/converted/${userId}/${sessionId}/`;
    await bucket.deleteFiles({ prefix: convertedPrefix });
    
    logger.info(`fn sH dS Successfully deleted session: ${userId}/${sessionId}`);
  } catch (error) {
    logger.error(`fn sH dS Error deleting session: ${userId}/${sessionId}`, error);
    // Don't throw - cleanup is best effort
  }
};
