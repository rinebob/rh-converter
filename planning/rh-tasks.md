# Project Task List

This is a general task list for project management.

---

## Phase 1: Planning & Setup

* [x] Define project scope and goals
* [x] Create Product Requirements Document (PRD)
* [x] Set up version control (Git repository)
* [x] Configure development environment
* [x] Initialize Angular 20 project
* [x] Set up SCSS for styling
* [x] Configure project structure and naming conventions
* [x] Set up global styles and CSS reset
* [x] Configure environment files for development and production
* [x] Add Angular CDK and @angular-devkit/build-angular@20.0.0 to the project
* [x] Set up Firebase Project with Authentication, Firestore, Cloud Functions and AppHosting
* [x] Resolve Firebase App Hosting build failures

---

## Phase 2: Development
* [x] Build user interface for conversion (FileConverter component, Material styling, descriptive text)
    * [x] Integrate Angular Material with prebuilt azure-blue theme
    * [x] Style FileConverter component (card, header, content, input areas)
    * [x] Refine application header styling
    * [x] Add descriptive text to FileConverter component
    * [x] Clean up SCSS comments and remove unused _theme.scss
* [x] Develop CSV upload functionality (Initial frontend and backend for upload in place)
    * [x] Create file input element in FileConverter component (UI only)
    * [x] Implement file selection handling in FileConverter component (frontend)
    * [x] Implement 'Convert' button action to upload selected file to Cloud Function (frontend)
    * [x] Configure HttpClient for HTTP requests (using provideHttpClient)
    * (Backend) [x] Create Cloud Function endpoint for file upload (basic file reception)
* [x] Implement data parsing and transformation logic
    * [x] Create utility functions for CSV parsing and processing
    * [x] Implement transaction type detection and processing
    * [x] Handle different transaction types (dividends, recurring investments, etc.)
    * [x] Implement error handling and validation
    * [x] Create interfaces for strongly-typed data structures
* [x] Create output generation (JSON/CSV)
    * [x] Implement CSV header enums and type definitions
    * [x] Create CSV generation logic for different transaction types
    * [x] Add support for ZIP file generation
    * [x] Implement proper field mapping for Regular and Dividend transactions
    * [x] Fix file content handling in ZIP generation
* [ ] Design database schema
* [ ] Implement user authentication
* [ ] Develop subscription management features
* [ ] Implement free tier limit enforcement
* [ ] Integrate payment gateway (Stripe)

---

## Phase 3: Refactoring & Code Quality
* [x] Consolidate CSV header enums and types
    * [x] Move enums from shared directory to interfaces-fn.ts
    * [x] Update all imports to use consolidated enums
    * [x] Clean up TypeScript configurations
    * [x] Remove unused shared types directory
    * [x] Fix type safety issues with Amount field
* [x] Standardize enums between frontend and backend
    * [x] Create shared enums module with DownloadFormat, RecordType, and TransactionCode
    * [x] Update frontend to use shared enums
    * [x] Update backend to use shared enums
    * [x] Configure TypeScript path aliases for shared imports
    * [x] Remove duplicate enum definitions
* [x] Fix CUSIP case sensitivity in output
    * [x] Update extractCusip function to ensure consistent uppercase output
    * [x] Add case-insensitive matching for CUSIP extraction
    * [x] Update function documentation to specify uppercase return value

---

## Phase 4: Project Dependencies

### Core Dependencies
- [x] @angular/* (v20.0.0) - Angular framework and core modules
- [x] @angular/material (v20.0.0) - Material Design components
- [x] @angular/cdk (v20.0.0) - Component Dev Kit
- [x] @angular/fire (v20.0.0) - Firebase integration for Angular
- [x] firebase (v11.9.0) - Firebase SDK
- [x] rxjs (~7.8.0) - Reactive Extensions for JavaScript
- [x] zone.js (~0.15.0) - Zone-based async operations wrapper

### Development Dependencies
- [x] @angular/cli (v20.0.0) - Angular CLI
- [x] typescript (~5.8.2) - TypeScript compiler
- [x] @types/firebase (^2.4.32) - TypeScript definitions for Firebase
- [x] Testing tools (Jasmine, Karma)

## Phase 5: Testing & Deployment

* [ ] Conduct manual testing of core features
* [ ] Fix identified bugs
* [ ] Prepare deployment scripts
* [ ] Deploy to staging environment
* [ ] Perform user acceptance testing (UAT)
* [ ] Deploy to production environment

---

## Phase 5: Post-Launch

* [ ] Set up monitoring and logging
* [ ] Gather user feedback
* [ ] Plan for future enhancements
* [ ] Conduct post-mortem analysis
