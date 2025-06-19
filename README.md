# Trade Data Converter

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Firebase Setup and Firestore Rules

This project uses Firebase for backend services, including Firestore for data persistence.

### 1. Firebase Configuration

To connect the application to your Firebase project, you need to add your Firebase configuration to the environment files.

1.  Create a Firebase project at [firebase.google.com](https://firebase.google.com/).
2.  In your project settings, find your web app's Firebase configuration object.
3.  Copy this object into `src/environments/environment.ts` and `src/environments/environment.prod.ts`.

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_AUTH_DOMAIN',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
  }
};
```

### 2. Firestore Security Rules

To enable the comments feature and other Firestore functionalities, you must deploy your Firestore security rules. These rules define access control for your database.

The primary rules for the `comments` collection are as follows. You can find the complete ruleset in `firestore.rules` in the project root. Deploy the full ruleset using the Firebase CLI: `firebase deploy --only firestore:rules`.

```firestore
// Excerpt from firestore.rules for the comments collection
match /comments/{commentId} {
  // Anyone can read comments
  allow read: if true;
  
  // Anyone can create comments, provided they include the required fields
  // and meet either anonymous or authenticated user criteria.
  allow create: if 
    // Common conditions
    request.resource.data.fileId is string &&
    request.resource.data.text is string &&
    request.resource.data.text.size() > 0 &&
    request.resource.data.text.size() < 1000 &&
    (
      // Case 1: Anonymous User
      (request.auth == null &&
       request.resource.data.userId == 'anonymous' &&
       request.resource.data.userName is string &&
       request.resource.data.userName.size() > 0 &&
       request.resource.data.createdAt is timestamp
      )
      ||
      // Case 2: Authenticated User
      (request.auth != null &&
       request.resource.data.userId == request.auth.uid &&
       (
         // Handles cases where auth.token.name might be null or a string
         (request.auth.token.name == null && !(request.resource.data.userName is string)) ||
         (request.auth.token.name is string && request.resource.data.userName == request.auth.token.name)
       ) &&
       request.resource.data.createdAt is timestamp
      )
    );
  
  // For now, disallow update and delete by clients directly
  // These operations could be handled by Cloud Functions or admin SDKs if needed.
  allow update, delete: if false; 
}
```

### 3. Using Firebase Emulators for Local Development

For local development, it's highly recommended to use the Firebase Emulators to test Firestore, Auth, and other Firebase services without affecting live data.

**Starting Emulators:**
To start the Firebase emulators (e.g., Auth and Firestore), run the following command from the project root:
```bash
firebase emulators:start --only "auth,firestore"
```
Make sure your `firebase.json` is configured with the emulators you intend to use. The application is set up in `src/app/app.config.ts` to connect to these emulators when running in a non-production environment.

You can view the Emulator UI by navigating to `http://localhost:4000` (or the configured UI port) in your browser once the emulators are running.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
