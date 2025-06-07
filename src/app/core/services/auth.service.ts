import { Injectable, inject, signal, InjectionToken } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Auth, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';

export const FIREBASE_AUTH = new InjectionToken<Auth>('Firebase Auth');

export interface User {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  uid?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(FIREBASE_AUTH);
  private router = inject(Router);
  
  // Store the URL so we can redirect after logging in
  redirectUrl: string | null = null;
  
  // Observable of the current user
  currentUser$: Observable<User | null> = new Observable(subscriber => {
    const unsubscribe = onAuthStateChanged(this.auth, (user) => {
      if (user) {
        subscriber.next({
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          uid: user.uid
        });
      } else {
        subscriber.next(null);
      }
    });
    
    // Cleanup function
    return () => unsubscribe();
  });
  
  constructor() {
    this.initializeAuthState();
  }

  // Current user as a signal for synchronous access
  private readonly _currentUser = signal<User | null>(null);
  
  // Get the current user synchronously (returns null if user is not authenticated)
  get currentUser(): User | null {
    return this._currentUser();
  }
  
  // Initialize the auth state subscription
  private initializeAuthState() {
    this.currentUser$.subscribe(user => {
      this._currentUser.set(user);
    });
  }

  // Check if user is authenticated
  get isAuthenticated$(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user)
    );
  }

  // Sign in with email/password
  signIn(email: string, password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, email, password)
      .then(() => {
        this.router.navigate([this.redirectUrl || '/']);
        this.redirectUrl = null;
      })
      .catch(error => {
        console.error('Sign in error:', error);
        throw error;
      });
  }

  // Sign up with email/password
  signUp(email: string, password: string, displayName: string): Promise<void> {
    return createUserWithEmailAndPassword(this.auth, email, password)
      .then((userCredential) => {
        if (!userCredential.user) throw new Error('No user returned from sign up');
        return updateProfile(userCredential.user, { displayName });
      })
      .then(() => {
        this.router.navigate(['/']);
      })
      .catch(error => {
        console.error('Sign up error:', error);
        throw error;
      });
  }

  // Sign out
  signOut(): Promise<void> {
    return signOut(this.auth)
      .then(() => {
        this.router.navigate(['/login']);
      })
      .catch(error => {
        console.error('Sign out error:', error);
        throw error;
      });
  }
}
