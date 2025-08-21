/**
 * Environment configuration interface
 */

export interface Environment {
  production: boolean;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  api: {
    baseUrl: string;
    functionsBaseUrl: string; // Base URL for callable HTTP Cloud Functions (no trailing slash)
  };
  features: {
    enableAnalytics: boolean;
    enablePerformanceMonitoring: boolean;
  };
  app: {
    name: string;
    version: string;
    description: string;
    supportEmail: string;
  };
  subscription: {
    freeTier: {
      maxConversions: number;
      maxFileSize: number;
    };
    proTier: {
      monthlyPrice: number;
      yearlyPrice: number;
    };
  };
}
