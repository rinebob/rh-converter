/**
 * Main entry point for all Firebase Functions.
 * Each function should be defined in its own file and imported here.
 */

import { uploadCsv } from './upload-csv';

// Export all functions for Firebase to discover and deploy.
export {
  uploadCsv,
  // Add other functions here as they are created, e.g.:
  // anotherFunction,
  // yetAnotherFunction
};
