/**
 * Firestore collection and document paths
 * Follows the pattern: 'collectionName' or 'collectionName/{documentId}'
 */
export const FirestoreEndpoints = {
  // Users collection
  USERS: 'users',
  user: (userId: string) => `users/${userId}`,
  
  // Subscriptions collection
  SUBSCRIPTIONS: 'subscriptions',
  subscription: (subscriptionId: string) => `subscriptions/${subscriptionId}`,
  
  // Subscription plans collection
  SUBSCRIPTION_PLANS: 'subscriptionPlans',
  subscriptionPlan: (planId: string) => `subscriptionPlans/${planId}`,
  
  // User subscriptions subcollection
  userSubscriptions: (userId: string) => `users/${userId}/subscriptions`,
  userSubscription: (userId: string, subscriptionId: string) => 
    `users/${userId}/subscriptions/${subscriptionId}`,
  
  // Usage tracking
  usage: (userId: string) => `usage/${userId}`,
  
  // File uploads
  UPLOADS: 'uploads',
  userUploads: (userId: string) => `users/${userId}/uploads`,
  
  // Application settings
  SETTINGS: 'settings',
  APP_SETTINGS: 'settings/app',
  SUBSCRIPTION_SETTINGS: 'settings/subscription',
} as const;

export type FirestoreEndpoint = keyof typeof FirestoreEndpoints;
