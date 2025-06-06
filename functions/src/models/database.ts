import { Timestamp } from 'firebase-admin/firestore';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  isActive: boolean;
  role: 'free' | 'paid';
  currentPeriodEnd?: Timestamp;
  customerId?: string;
  subscriptionId?: string;
  freeTierUsage: {
    lastReset: Timestamp;
    currentMonthCount: number;
    monthlyLimit: number;
  };
  updatedAt: Timestamp;
}

export interface Subscription {
  id: string;
  userId: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused';
  planId: string;
  priceId: string;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  canceledAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  latestInvoice?: string;
  paymentMethod?: string;
  billingCycleAnchor?: Timestamp;
}

export interface TransactionLog {
  id: string;
  userId: string;
  timestamp: Timestamp;
  fileId: string;
  recordCount: number;
  transactionTypes: {
    [key: string]: number;
  };
  status: 'completed' | 'partial' | 'failed';
  error?: string;
  wasWithinLimit: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
  productId: string;
  features: string[];
  isActive: boolean;
  trialPeriodDays?: number;
  metadata: {
    [key: string]: any;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  SUBSCRIPTIONS: 'subscriptions',
  TRANSACTIONS: 'transactions',
  PLANS: 'plans',
} as const;

// Subcollections
export const SUBCOLLECTIONS = {
  USER_SUBSCRIPTIONS: 'subscriptions',
} as const;

// Indexes configuration
export const INDEXES = {
  USERS: {
    BY_EMAIL: 'users_email',
    BY_CUSTOMER_ID: 'users_customerId',
    BY_ROLE: 'users_role',
  },
  SUBSCRIPTIONS: {
    BY_USER_ID: 'subscriptions_userId',
    BY_STATUS: 'subscriptions_status',
    BY_PERIOD_END: 'subscriptions_periodEnd',
  },
  TRANSACTIONS: {
    BY_USER_AND_DATE: 'transactions_userId_timestamp',
    BY_TIMESTAMP: 'transactions_timestamp',
  },
} as const;
