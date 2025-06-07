import { isDevMode } from '@angular/core';
import { SubscriptionPlan } from './interfaces';

/**
 * Core application constants.
 */

const PROD_UPLOAD_CSV_URL = 'https://uploadcsv-65tsqwgeba-uc.a.run.app';
const DEV_UPLOAD_CSV_URL = 'http://127.0.0.1:5001/rh-converter/us-central1/uploadCsv';

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
  UPLOAD_CSV: isDevMode() ? DEV_UPLOAD_CSV_URL : PROD_UPLOAD_CSV_URL
} as const;
