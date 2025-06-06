/**
 * Shared interfaces and enums for the application
 */

/**
 * Available download formats for conversion and output
 */
export enum DownloadFormat {
  JSON = 'json',
  CSV = 'csv',
  BOTH = 'both'
}

/**
 * Represents a file upload response from the server
 */
export interface FileUploadResponse {
  success: boolean;
  data?: {
    regularTransactions: any[];
    dividends: any[];
  };
  format?: DownloadFormat;
  recordCount?: number;
  error?: string;
  timestamp?: string;
}

/**
 * Represents a file upload error response
 */
export interface FileUploadError {
  success: boolean;
  error: string;
  details?: string;
}

/**
 * Represents a subscription plan offered to users
 */
export interface SubscriptionPlan {
  /** Unique identifier for the plan */
  id: string;
  /** Display name of the plan */
  name: string;
  /** Detailed description of the plan */
  description?: string;
  /** Price amount in the specified currency */
  price: number;
  /** Currency code (e.g., 'USD', 'EUR') */
  currency: string;
  /** Billing interval */
  interval: 'month' | 'year';
  /** Array of features included in this plan */
  features: string[];
  /** Maximum number of files allowed */
  maxFiles: number;
  /** Maximum size per file in bytes */
  maxFileSize: number;
  /** Stripe price ID for this plan */
  priceId?: string;
  /** Whether this plan should be highlighted as popular */
  isPopular?: boolean;
}

/**
 * Represents the current usage metrics for a user
 */
export interface UsageInfo {
  /** Number of files processed in current period */
  currentCount: number;
  /** Maximum allowed files in current period */
  monthlyLimit: number;
  /** Whether the current usage is within limits */
  isWithinLimit: boolean;
  /** When the usage will reset */
  resetDate?: Date;
  /** Storage used in bytes */
  storageUsed?: number;
  /** Storage limit in bytes */
  storageLimit?: number;
  /** When the usage was last updated */
  lastUpdated?: Date;
}

/**
 * Billing information for the current subscription
 */
export interface BillingInfo {
  /** Start of current billing period */
  currentPeriodStart: Date;
  /** End of current billing period */
  currentPeriodEnd: Date;
  /** Current status of the subscription */
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused' | null;
  /** Whether the subscription is set to cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Next billing date (if applicable) */
  nextBillingDate?: Date;
  /** Last 4 digits of the payment method */
  last4?: string;
  /** Default payment method details */
  defaultPaymentMethod?: {
    /** Card brand (Visa, Mastercard, etc.) */
    brand: string;
    /** Last 4 digits */
    last4: string;
    /** Expiration month (1-12) */
    expMonth: number;
    /** Expiration year */
    expYear: number;
  };
}

/**
 * Response from creating a checkout session
 */
export interface CheckoutSessionResponse {
  /** Stripe session ID */
  sessionId: string;
}

/**
 * Response from creating a customer portal session
 */
export interface CustomerPortalResponse {
  /** URL to redirect the user to the Stripe customer portal */
  url: string;
}

/**
 * User profile information including subscription status
 */
export interface UserProfile {
  /** User ID */
  uid: string;
  /** User's email address */
  email: string;
  /** Display name */
  displayName?: string;
  /** Profile photo URL */
  photoURL?: string;
  /** User's role */
  role: 'free' | 'paid';
  /** Current subscription status */
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'unpaid';
  /** When the current billing period ends */
  currentPeriodEnd?: Date;
  /** Usage information for free tier */
  freeTierUsage: {
    currentCount: number;
    monthlyLimit: number;
    resetDate: Date;
  };
}
