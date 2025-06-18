// Authentication constants
export const AUTH_ERRORS = {
  'auth/email-already-in-use': 'This email is already in use by another account.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
} as const;

// App constants
export const APP = {
  TITLE: 'Trade Data File Converter',
  DESCRIPTION: 'Convert your trade data files',
  VERSION: '1.0.0',
} as const;
