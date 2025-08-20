/**
 * Main entry point for all Firebase Functions.
 * Each function should be defined in its own file and imported here.
 */

import { uploadCsv } from './upload-csv';
import { submitComment, editComment, deleteComment, reportComment, adminModeration } from './comments';

// Export all functions for Firebase to discover and deploy.
export {
  uploadCsv,
  submitComment,
  editComment,
  deleteComment,
  reportComment,
  adminModeration,
  // Add other functions here as they are created, e.g.:
  // anotherFunction,
  // yetAnotherFunction
};
