import { isDevMode } from '@angular/core';

/**
 * Core application constants.
 */

const PROD_UPLOAD_CSV_URL = 'https://uploadcsv-65tsqwgeba-uc.a.run.app';
const DEV_UPLOAD_CSV_URL = 'http://127.0.0.1:5001/rh-converter/us-central1/uploadCsv';

/**
 * URLs for Firebase Cloud Functions.
 * Automatically selects the correct URL based on the environment (dev/prod).
 */
export const CLOUD_FUNCTION_URLS = {
  UPLOAD_CSV: isDevMode() ? DEV_UPLOAD_CSV_URL : PROD_UPLOAD_CSV_URL
} as const;
