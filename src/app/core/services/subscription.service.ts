import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { 
  catchError, 
  finalize, 
  map, 
  shareReplay, 
  tap 
} from 'rxjs/operators';
import { 
  SubscriptionPlan, 
  UsageInfo, 
  UserProfile, 
  CheckoutSessionResponse, 
  CustomerPortalResponse,
  SubscriptionStatus,
  ActiveSubscription,
  SubscriptionState
} from '../common/interfaces';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { FirestoreEndpoints } from '../common/firestore-endpoints';
import { FALLBACK_FREE_PLAN } from '../common/constants';


@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.api.baseUrl;
  
  // State
  private readonly _state = signal<SubscriptionState>({
    plans: [],
    currentPlan: null,
    usage: null,
    loading: false,
    error: null
  });
  
  // Selectors
  readonly plans = computed(() => this._state().plans);
  readonly currentPlan = computed(() => this._state().currentPlan);
  readonly usage = computed(() => this._state().usage);
  readonly loading = computed(() => this._state().loading);
  readonly error = computed(() => this._state().error);
  readonly isFreeTier = computed((): boolean => {
    const plan = this._state().currentPlan;
    return !plan || plan.id === 'free';
  });
  
  readonly isUsageWithinLimit = computed(() => {
    const usage = this._state().usage;
    return usage ? usage.isWithinLimit : true;
  });
  
  readonly usagePercentage = computed(() => {
    const usage = this._state().usage;
    return usage ? Math.min(100, (usage.currentCount / usage.monthlyLimit) * 100) : 0;
  });

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.loadPlans();
    this.loadCurrentPlan();
    this.loadUsage();
  }
  
  private updateState(partial: Partial<SubscriptionState>): void {
    this._state.update(current => ({ ...current, ...partial }));
  }

  private setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  /**
   * Handle API errors consistently across all service methods
   * @param error The error that occurred
   * @returns An observable that will error with the normalized error
   */
  private handleError(error: unknown): Observable<never> {
    const errorObj = error instanceof Error ? error : new Error('An unknown error occurred');
    this.updateState({ error: errorObj });
    return throwError(() => errorObj);
  }

  /**
   * Get the current user's subscription plan
   * @returns The current subscription plan or free plan if not subscribed
   */
  getCurrentPlan(): SubscriptionPlan {
    return this._state().currentPlan || this.getFreePlanWithFallback();
  }
  
  //#region Plans
  loadPlans(forceRefresh = false): Observable<SubscriptionPlan[]> {
    if (!forceRefresh && this._state().plans.length > 0) {
      return of(this._state().plans);
    }

    this.setLoading(true);
    return this.http.get<SubscriptionPlan[]>(
      `${this.baseUrl}/${FirestoreEndpoints.SUBSCRIPTION_PLANS}`
    ).pipe(
      tap({
        next: (plans) => this.updateState({ plans, error: null }),
        error: (error) => this.handleError(error)
      }),
      finalize(() => this.setLoading(false)),
      shareReplay(1)
    );
  }
  
  getPlan(planId: string): SubscriptionPlan | undefined {
    return this._state().plans.find(plan => plan.id === planId);
  }
  //#endregion
  
  //#region Current Plan & Subscription
  loadCurrentPlan(): Observable<SubscriptionPlan | null> {
    const userId = this.authService.currentUser?.uid;
    if (!userId) {
      return of(null);
    }

    this.setLoading(true);
    return this.http.get<ActiveSubscription | null>(
      `${this.baseUrl}/${FirestoreEndpoints.userSubscriptions(userId)}/active`
    ).pipe(
      map(sub => {
        if (!sub) {
          // If no active subscription, return the free plan
          const freePlan = this.getFreePlanWithFallback();
          return { 
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            plan: freePlan 
          };
        }
        return {
          ...sub,
          currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
          plan: sub.plan || this.getFreePlanWithFallback()
        };
      }),
      tap({
        next: (subscription) => {
          const plan = subscription?.plan || this.getFreePlanWithFallback();
          this.updateState({ currentPlan: plan, error: null });
        },
        error: (error) => this.handleError(error)
      }),
      map(sub => sub.plan),
      finalize(() => this.setLoading(false)),
      shareReplay(1)
    );
  }
  
  createCheckoutSession(priceId: string): Observable<CheckoutSessionResponse> {
    const userId = this.authService.currentUser?.uid;
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }
    
    this.setLoading(true);
    return this.http.post<CheckoutSessionResponse>(
      `${this.baseUrl}/${FirestoreEndpoints.userSubscriptions(userId)}/checkout`,
      { priceId }
    ).pipe(
      tap({
        error: (error) => this.handleError(error)
      }),
      finalize(() => this.setLoading(false))
    );
  }
  
  openCustomerPortal(): Observable<CustomerPortalResponse> {
    const userId = this.authService.currentUser?.uid;
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }
    
    this.setLoading(true);
    return this.http.post<CustomerPortalResponse>(
      `${this.baseUrl}/${FirestoreEndpoints.userSubscriptions(userId)}/portal`,
      {}
    ).pipe(
      tap({
        next: ({ url }) => {
          if (url) {
            window.open(url, '_blank');
          }
        },
        error: (error) => this.handleError(error)
      }),
      finalize(() => this.setLoading(false))
    );
  }
  //#endregion
  
  //#region Usage Tracking
  loadUsage(): Observable<UsageInfo | null> {
    const userId = this.authService.currentUser?.uid;
    if (!userId) {
      return of(null);
    }
    
    this.setLoading(true);
    return this.http.get<UsageInfo>(
      `${this.baseUrl}/${FirestoreEndpoints.usage(userId)}`
    ).pipe(
      tap({
        next: (usage) => this.updateState({ usage, error: null }),
        error: (error) => this.handleError(error)
      }),
      finalize(() => this.setLoading(false)),
      shareReplay(1)
    );
  }
  
  incrementUsage(count: number): Observable<UsageInfo> {
    const userId = this.authService.currentUser?.uid;
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }
    
    this.setLoading(true);
    return this.http.post<UsageInfo>(
      `${this.baseUrl}/${FirestoreEndpoints.usage(userId)}/increment`,
      { count }
    ).pipe(
      tap({
        next: (usage) => this.updateState({ usage, error: null }),
        error: (error) => this.handleError(error)
      }),
      finalize(() => this.setLoading(false))
    );
  }
  
  checkRemainingRecords(): { canProcess: boolean; message: string } {
    const usage = this._state().usage;
    
    if (!usage) {
      return { 
        canProcess: true, 
        message: 'Loading usage data...' 
      };
    }
    
    if (this.isFreeTier() && !usage.isWithinLimit) {
      return {
        canProcess: false,
        message: `You've reached your monthly limit of ${usage.monthlyLimit} records. Please upgrade to process more.`
      };
    }
    
    return {
      canProcess: true,
      message: `You've used ${usage.currentCount} of ${usage.monthlyLimit} records this month.`
    };
  }
  //#endregion
  
  
  private getFreePlan(): SubscriptionPlan | undefined {
    return this._state().plans.find(p => p.id === 'free');
  }
  
  // Helper to safely get the free plan or fallback to the default
  private getFreePlanWithFallback(): SubscriptionPlan {
    return this.getFreePlan() || FALLBACK_FREE_PLAN;
  }
}
