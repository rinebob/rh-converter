# Database Schema Design

## Collections

### 1. `users`
Stores user account information and subscription status.

```typescript
interface User {
  uid: string;                     // Firebase Auth UID (primary key)
  email: string;                   // User's email
  displayName?: string;             // Optional display name
  photoURL?: string;               // Optional profile photo URL
  createdAt: FirebaseFirestore.Timestamp;  // Account creation timestamp
  lastLogin: FirebaseFirestore.Timestamp;  // Last login timestamp
  isActive: boolean;               // Account status
  role: 'free' | 'paid';           // User tier level
  currentPeriodEnd?: FirebaseFirestore.Timestamp; // Subscription period end date
  customerId?: string;             // Stripe customer ID
  subscriptionId?: string;         // Active subscription ID (references subscriptions collection)
  freeTierUsage: {
    lastReset: FirebaseFirestore.Timestamp; // Last reset date for free tier
    currentMonthCount: number;     // Transactions processed this period
    monthlyLimit: number;          // Monthly limit (e.g., 100)
  };
}
```

### 2. `subscriptions`
Tracks user subscription details and payment history.

```typescript
interface Subscription {
  id: string;                     // Subscription ID (primary key)
  userId: string;                 // Reference to users.uid
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused';
  planId: string;                 // Stripe plan ID
  priceId: string;                // Stripe price ID
  currentPeriodStart: FirebaseFirestore.Timestamp;
  currentPeriodEnd: FirebaseFirestore.Timestamp;
  cancelAtPeriodEnd: boolean;     // Whether subscription will cancel at period end
  canceledAt: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  latestInvoice?: string;         // URL to latest invoice
  paymentMethod?: string;          // Last 4 digits of payment method
  billingCycleAnchor?: FirebaseFirestore.Timestamp; // Anchor for billing cycle
}
```

### 3. `transactions`
Logs file processing activities for analytics and usage tracking.

```typescript
interface TransactionLog {
  id: string;                     // Auto-generated ID
  userId: string;                 // Reference to users.uid
  timestamp: FirebaseFirestore.Timestamp;
  fileId: string;                 // Original file identifier
  recordCount: number;            // Number of records processed
  transactionTypes: {
    [key: string]: number;        // e.g., { 'CDIV': 5, 'BUY': 10 }
  };
  status: 'completed' | 'partial' | 'failed';
  error?: string;                 // Error message if failed
  wasWithinLimit: boolean;        // Whether it was within free tier limits
  ipAddress?: string;             // For rate limiting and security
  userAgent?: string;             // Client information
}
```

### 4. `plans`
Stores available subscription plans.

```typescript
interface Plan {
  id: string;                     // Plan ID (matches Stripe price ID)
  name: string;                   // e.g., "Premium Monthly"
  price: number;                  // In cents
  currency: string;               // e.g., 'usd'
  interval: 'month' | 'year';     // Billing interval
  intervalCount: number;          // 1 for monthly, 12 for yearly
  productId: string;              // Stripe product ID
  features: string[];             // List of features
  isActive: boolean;              // Whether plan is available for subscription
  trialPeriodDays?: number;       // Trial period in days
  metadata: {
    [key: string]: any;          // Additional metadata
  };
}
```

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Additional validation for updates
      allow update: if request.auth.uid == userId &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['displayName', 'photoURL']);
    }
    
    // Users can read their own subscriptions
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      // Write handled by Cloud Functions
      allow write: if false;
    }
    
    // Read-only access to plans
    match /plans/{planId} {
      allow read: if true;  // Public read access
      allow write: if false; // Managed by admin
    }
    
    // Users can only access their own transaction logs
    match /transactions/{transactionId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

## Indexes

1. **users collection**
   - `uid` (ascending) - Primary key
   - `email` (ascending) - For user lookup
   - `customerId` (ascending) - For Stripe lookups
   - `role` (ascending) - For filtering users by tier

2. **subscriptions collection**
   - `userId` (ascending) - For user subscription lookups
   - `status` (ascending) - For active subscription queries
   - `currentPeriodEnd` (ascending) - For expiring subscriptions

3. **transactions collection**
   - `userId` (ascending), `timestamp` (descending) - For user history
   - `timestamp` (descending) - For admin analytics
   - `status` (ascending) - For monitoring

## Usage Queries

### Check User's Free Tier Usage
```typescript
const userRef = db.collection('users').doc(userId);
const userDoc = await userRef.get();
const { currentMonthCount, monthlyLimit } = userDoc.data().freeTierUsage;
const remaining = Math.max(0, monthlyLimit - currentMonthCount);
```

### Get Active Subscription
```typescript
const subscription = await db.collection('subscriptions')
  .where('userId', '==', userId)
  .where('status', 'in', ['active', 'trialing'])
  .orderBy('currentPeriodEnd', 'desc')
  .limit(1)
  .get();
```

### Get User's Recent Transactions
```typescript
const transactions = await db.collection('transactions')
  .where('userId', '==', userId)
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get();
```

## Notes

1. **Free Tier Reset**: The `freeTierUsage.lastReset` field should be checked monthly to reset the `currentMonthCount`.
2. **Data Retention**: Consider implementing a Cloud Function to archive or delete old transaction logs.
3. **Security**: All writes to sensitive collections should be handled through Cloud Functions with proper validation.
4. **Backup**: Set up regular database backups in Firebase console.
5. **Monitoring**: Set up alerts for unusual activity or failed operations.
