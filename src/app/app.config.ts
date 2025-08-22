import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ApiInterceptor } from './core/interceptors/api.interceptor';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app'; 
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth'; 
import { getFirestore, provideFirestore, connectFirestoreEmulator } from '@angular/fire/firestore'; 
import { getStorage, provideStorage, connectStorageEmulator } from '@angular/fire/storage';
import { environment } from '../environments/environment';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideFirebaseApp(() => initializeApp(environment.firebase)), 
    provideAuth(() => {
      const auth = getAuth();
      if (!environment.production) {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      }
      return auth;
    }), 
    provideFirestore(() => {
      const firestore = getFirestore();
      if (!environment.production) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    }), 
    provideStorage(() => {
      const storage = getStorage();
      if (!environment.production) {
        connectStorageEmulator(storage, 'localhost', 9199);
      }
      return storage;
    }),
    MatSnackBar,
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true
    }
  ]
};
