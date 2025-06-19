import { Environment } from './environment.interface';

/**
 * Development environment variables
 */
export const environment: Environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyDRbwbS5D-RGq1_Gv9rQkywh3p5Bvw3618',
    authDomain: 'rh-converter.firebaseapp.com',
    projectId: 'rh-converter',
    storageBucket: 'rh-converter.firebasestorage.app',
    messagingSenderId: '9526366257',
    appId: '1:9526366257:web:3658fba523aed7b1954510',
    measurementId: 'G-XXXXXXXXXX'
  },
  api: {
    baseUrl: 'http://localhost:5001/rh-converter/us-central1/api',
  },
  features: {
    enableAnalytics: false,
    enablePerformanceMonitoring: false
  },
  app: {
    name: 'Trade Data File Converter (Dev)',
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
