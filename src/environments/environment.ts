import { Environment } from './environment.interface';

/**
 * Development environment variables
 */
export const environment: Environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_DEV_API_KEY',
    authDomain: 'your-dev-app.firebaseapp.com',
    projectId: 'your-dev-project-id',
    storageBucket: 'your-dev-app.appspot.com',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:abcdef123456',
    measurementId: 'G-XXXXXXXXXX'
  },
  api: {
    baseUrl: 'http://localhost:5001/your-dev-project-id/us-central1/api',
  },
  features: {
    enableAnalytics: false,
    enablePerformanceMonitoring: false
  },
  app: {
    name: 'RH Converter (Dev)',
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
