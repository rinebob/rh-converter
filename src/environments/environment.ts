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
    functionsBaseUrl: 'http://127.0.0.1:5001/rh-converter/us-central1',
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
  },
  examples: {
    robinhood: {
        inputCsvUrl: 'https://firebasestorage.googleapis.com/v0/b/rh-converter.firebasestorage.app/o/site-example-files%2Frh-export-example.csv?alt=media&token=5b100a63-2970-4b35-a291-9b35a801cfb0',
        regularOutputCsvUrl: 'https://firebasestorage.googleapis.com/v0/b/rh-converter.firebasestorage.app/o/site-example-files%2Frh-export-example_transactions_2025-08-29T22-06-40-884Z_regular.csv?alt=media&token=bc3a1b60-41f5-4e47-99d5-330dc3038817',
        dividendOutputCsvUrl: 'https://firebasestorage.googleapis.com/v0/b/rh-converter.firebasestorage.app/o/site-example-files%2Frh-export-example_transactions_2025-08-29T22-06-40-884Z_dividend.csv?alt=media&token=cae0a214-dea7-4164-83fa-3af8a303ff46',
        jsonOutputUrl: 'https://firebasestorage.googleapis.com/v0/b/rh-converter.firebasestorage.app/o/site-example-files%2Frh-export-example_transactions_2025-08-29T22-06-26-739Z.json?alt=media&token=ecca0ba3-8621-46c0-a317-b293371c7d2f',
        csvJsonZipOutputUrl: 'https://firebasestorage.googleapis.com/v0/b/rh-converter.firebasestorage.app/o/site-example-files%2Frh-export-example_transactions_2025-08-29T22-06-52-567Z.zip?alt=media&token=8ffcdb8b-5509-4624-909c-347064550ae4'
    }
  }
};
