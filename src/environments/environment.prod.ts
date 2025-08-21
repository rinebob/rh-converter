import { Environment } from './environment.interface';

/**
 * Production environment variables
 */
export const environment: Environment = {
  production: true,
  firebase: {
    apiKey: 'AIzaSyDRbwbS5D-RGq1_Gv9rQkywh3p5Bvw3618',
    authDomain: 'rh-converter.firebaseapp.com',
    projectId: 'rh-converter',
    storageBucket: 'rh-converter.firebasestorage.app',
    messagingSenderId: '9526366257',
    appId: '1:9526366257:web:3658fba523aed7b1954510',
    measurementId: 'G-YYYYYYYYYY'
  },
  api: {
    baseUrl: 'https://us-central1-rh-converter.cloudfunctions.net/api',
    functionsBaseUrl: 'https://us-central1-rh-converter.cloudfunctions.net',
  },
  features: {
    enableAnalytics: true,
    enablePerformanceMonitoring: true
  },
  app: {
    name: 'Trade Data File Converter',
    version: '0.1.0',
    description: 'Convert trade data CSV files to JSON and CSV',
    supportEmail: 'tradedataconverter@gmail.com'
  },
  subscription: {
    freeTier: {
      maxConversions: 5,
      maxFileSize: 5
    },
    proTier: {
      monthlyPrice: 9.99,
      yearlyPrice: 99.99
    }
  }
};
