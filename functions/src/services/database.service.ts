import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { User, Subscription, TransactionLog, Plan, COLLECTIONS } from '../models/database';

export class DatabaseService {
  private db: Firestore;

  constructor() {
    this.db = getFirestore();
  }

  // User Operations
  async getUser(uid: string): Promise<User | null> {
    const doc = await this.db.collection(COLLECTIONS.USERS).doc(uid).get();
    return doc.exists ? (doc.data() as User) : null;
  }

  async createUser(userData: Omit<User, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = Timestamp.now();
    await this.db.collection(COLLECTIONS.USERS).doc(userData.uid).set({
      ...userData,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    await this.db.collection(COLLECTIONS.USERS).doc(uid).update({
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  // Subscription Operations
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const snapshot = await this.db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where('userId', '==', userId)
      .where('status', 'in', ['active', 'trialing'])
      .orderBy('currentPeriodEnd', 'desc')
      .limit(1)
      .get();

    return snapshot.empty ? null : (snapshot.docs[0].data() as Subscription);
  }

  // Transaction Log Operations
  async logTransaction(logData: Omit<TransactionLog, 'id' | 'timestamp'>): Promise<string> {
    const docRef = await this.db.collection(COLLECTIONS.TRANSACTIONS).add({
      ...logData,
      timestamp: Timestamp.now(),
    });
    return docRef.id;
  }

  // Plan Operations
  async getPlan(planId: string): Promise<Plan | null> {
    const doc = await this.db.collection(COLLECTIONS.PLANS).doc(planId).get();
    return doc.exists ? (doc.data() as Plan) : null;
  }

  async getActivePlans(): Promise<Plan[]> {
    const snapshot = await this.db
      .collection(COLLECTIONS.PLANS)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => doc.data() as Plan);
  }

  // Free Tier Management
  async checkAndResetFreeTierIfNeeded(userId: string): Promise<boolean> {
    const userRef = this.db.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const user = userDoc.data() as User;
    const now = new Date();
    const lastReset = user.freeTierUsage.lastReset.toDate();
    
    // Check if we need to reset the counter (start of a new month)
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      await userRef.update({
        'freeTierUsage.currentMonthCount': 0,
        'freeTierUsage.lastReset': Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return true; // Counter was reset
    }
    
    return false; // No reset was needed
  }

  async incrementFreeTierUsage(userId: string, count: number): Promise<{ currentCount: number; monthlyLimit: number }> {
    const userRef = this.db.collection(COLLECTIONS.USERS).doc(userId);
    
    // First check and reset counter if needed
    await this.checkAndResetFreeTierIfNeeded(userId);
    
    // Then increment the counter
    const result = await this.db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const user = userDoc.data() as User;
      const newCount = user.freeTierUsage.currentMonthCount + count;
      
      transaction.update(userRef, {
        'freeTierUsage.currentMonthCount': newCount,
        updatedAt: Timestamp.now(),
      });
      
      return {
        currentCount: newCount,
        monthlyLimit: user.freeTierUsage.monthlyLimit,
      };
    });
    
    return result;
  }
}

// Export a singleton instance
export const databaseService = new DatabaseService();
