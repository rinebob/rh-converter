import { isDevMode } from '@angular/core';
import { SubscriptionPlan } from './interfaces';

/**
 * Core application constants.
 */

const PROD_UPLOAD_CSV_URL = 'https://uploadcsv-65tsqwgeba-uc.a.run.app';
const DEV_UPLOAD_CSV_URL = 'http://127.0.0.1:5001/rh-converter/us-central1/uploadCsv';

const PROD_CONVERT_IMAGE_URL = 'https://convertimage-65tsqwgeba-uc.a.run.app';
const DEV_CONVERT_IMAGE_URL = 'http://127.0.0.1:5001/rh-converter/us-central1/convertImage';

const PROD_CONVERT_IMAGE_V2_URL = 'https://convertimagev2-65tsqwgeba-uc.a.run.app';
const DEV_CONVERT_IMAGE_V2_URL = 'http://127.0.0.1:5001/rh-converter/us-central1/convertImageV2';

/**
 * Maximum length for comments.
 */
export const MAX_COMMENT_LENGTH = 2500;

/**
 * Length at which to truncate comments and show a 'Show more' button.
 */
export const TRUNCATE_COMMENT_LENGTH = 500;

/**
 * Fallback free plan configuration
 */
export const FALLBACK_FREE_PLAN: SubscriptionPlan = {
  id: 'free',
  name: 'Free',
  description: 'Basic plan with limited features',
  price: 0,
  currency: 'usd',
  interval: 'month',
  features: [
    'Up to 10 CSV files per month',
    '5MB max file size',
    'CSV format only',
    'Only most recent 25 transactions returned'
  ],
  maxFiles: 10,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  priceId: 'price_free',
  isPopular: false
} as const;

/**
 * URLs for Firebase Cloud Functions.
 * Automatically selects the correct URL based on the environment (dev/prod).
 */
export const CLOUD_FUNCTION_URLS = {
  UPLOAD_CSV: isDevMode() ? DEV_UPLOAD_CSV_URL : PROD_UPLOAD_CSV_URL,
  CONVERT_IMAGE: isDevMode() ? DEV_CONVERT_IMAGE_URL : PROD_CONVERT_IMAGE_URL,
  CONVERT_IMAGE_V2: isDevMode() ? DEV_CONVERT_IMAGE_V2_URL : PROD_CONVERT_IMAGE_V2_URL
} as const;
