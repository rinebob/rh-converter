import { Environment } from './environment.interface';

/**
 * Production environment variables
 */
export const environment: Environment = {
  production: true,
  firebase: {
    apiKey: 'YOUR_PROD_API_KEY',
    authDomain: 'your-prod-app.firebaseapp.com',
    projectId: 'your-prod-project-id',
    storageBucket: 'your-prod-app.appspot.com',
    messagingSenderId: '0987654321',
    appId: '1:0987654321:web:fedcba654321',
    measurementId: 'G-YYYYYYYYYY'
  },
  api: {
    baseUrl: 'https://us-central1-your-prod-project-id.cloudfunctions.net/api',
  },
  features: {
    enableAnalytics: true,
    enablePerformanceMonitoring: true
  },
  app: {
    name: 'RH Converter',
    version: '0.1.0',
    description: 'Convert Robinhood CSV files to JSON and CSV',
    supportEmail: 'support@rhconverter.com'
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
