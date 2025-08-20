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
* [x] Constrain header and tab group content width to 800px (2025-06-18)
    * [x] Defined global CSS variable `--content-max-width` for consistent width.
    * [x] Created `.main-content-column` wrapper to center and constrain the main layout.
    * [x] Fixed "File Formats" tab overflow by making the wide table horizontally scrollable.
    * [x] Resolved page-level scrollbar by correcting the component's flexbox layout.
        * [x] Set component `:host` to be a full-height flex container.
        * [x] Added `min-height: 0` to the main content column to allow it to shrink correctly.
    * [x] Cleaned up redundant CSS rules after fixing the layout.
* [x] Add 'Brokers' tab to list supported brokerages (2025-06-18)
    * [x] Create `brokers-list` component to display supported brokers (`brokers-list.component.ts/.html/.scss`)
    * [x] Add 'Brokers' tab to the `file-converter-v1` component's tab group and embed `app-brokers-list`
    * [x] Import `BrokersListComponent` and `MatIconModule` into `file-converter-v1.component.ts` and `brokers-list.component.ts` respectively
    * [x] Style `BrokersListComponent` to match "File Formats" tab, listing 'Robinhood'
    * [x] Add "Request New Brokerage Support" card to `BrokersListComponent`
    * [ ] Write Jest unit tests for `BrokersListComponent` (render, content, edge cases) - *Deferred*
* [x] Refactor Instructions and File Formats tabs into standalone components (2025-06-19)
    * [x] Generate `instructions-content` standalone component (`ts`/`html`/`scss`)
    * [x] Move existing Instructions HTML into `instructions-content` template and apply styling
    * [x] Update `file-converter-v1.component.html` to embed `<app-instructions-content>`
    * [x] Update `file-converter-v1.component.ts` to import `InstructionsContentComponent`
    * [x] Generate `file-formats-content` standalone component (`ts`/`html`/`scss`)
    * [x] Move existing File Formats HTML (tables, etc.) and associated TS logic (data sources, column defs, sorting) into `file-formats-content` component
    * [x] Move SCSS styles for File Formats into `file-formats-content.component.scss`
    * [x] Update `file-converter-v1.component.html` to embed `<app-file-formats-content>`
    * [x] Update `file-converter-v1.component.ts` to import `FileFormatsContentComponent` and remove migrated logic/data
* [x] Standardize tab headings across all tab content components
  - [x] Inspect `BrokersListComponent` heading style for reference.
  - [x] Add centered `<h2>` heading to `InstructionsContentComponent`
  - [x] Add centered `<h2>` heading to `FileFormatsContentComponent`.
  - [x] Style `mat-card-title` in `FileConverterLegacy` to match heading spec.
  - [x] Style `mat-card-title` in `CommentsSectionComponent` to match heading spec.
  - [x] Apply consistent SCSS for heading centering across components.

* [x] Fix layout consistency for Instructions and Comments tabs (2025-06-19)
    * [x] Investigated shrinking header and identified root cause as narrow content in the Instructions tab.
    * [x] Applied flexbox to the instruction cards container, forcing it to fill the available width.
    * [x] Removed fixed max-width from comments section to allow it to fill the container.

* [x] Implement sticky footer and full-height application layout (2025-06-19)
    * [x] Ensure `html, body` establish a full-height flex context (`min-height: 100vh` on body)
    * [x] Configure `app.component` (`:host`) to fill body using flexbox
    * [x] Centralize base/reset styles in `styles.scss` and clean up `app.component.scss`
    * [x] Ensure feature components like `FileConverterV1Component` correctly fill available height (e.g., using `min-height: 100vh` or `flex:1` as appropriate)
    * [x] Test all tabs for proper scrolling and footer positioning

* [x] Implement Firestore persistence for Comments Tab (2025-06-19)
    * [x] Refactor `Comment` and `User` interfaces into `src/app/core/common/interfaces.ts`
    * [x] Verify/install `@angular/fire` and configure Firebase in `app.config.ts`
    * [x] Create `CommentsService` (`src/app/core/services/comments.service.ts`)
        * [x] Inject `Firestore` and `AuthService`
        * [x] Implement `addComment` with user authentication (and anonymous)
        * [x] Implement real-time `loadComments` (formerly `getComments`)
        * [x] Implement `deleteComment` for comment owners
        * [x] Use signals for reactive state management
        * [x] Refactor to remove `fileId` parameter and logic (global comment thread)
    * [x] Integrate `CommentsService` into `CommentsSectionComponent`
        * [x] Fetch and display comments using `@for`
        * [x] Implement form to add new comments (enabled for logged-in and anonymous users)
        * [x] Implement delete functionality for comment owners
        * [x] Refactor to remove `fileId` input and related logic
    * [x] Add Firestore configuration to `environment.ts` and `environment.prod.ts` (Covered by emulator/prod setup)
    * [ ] Write Jest unit tests for `CommentsService` (updated for global comments)
    * [ ] Write Cypress e2e test for adding and viewing a comment (updated for global comments)
    * [x] Update Firestore security rules for the `comments` collection (and remove `fileId` check)
    * [ ] Test global comment functionality thoroughly
    * [x] **Implement Comment Reply Feature (2025-06-19)**
        * [x] Update `Comment` interface in `src/app/core/common/interfaces.ts` to include `parentId?: string`
        * [x] Modify `CommentsService`:
            * [x] Update `addComment` method to accept and store an optional `parentId`.
            * [x] Ensure `loadComments` fetches all comments (top-level and replies) - *No change needed, existing logic fetches all.*
        * [x] Update `CommentsSectionComponent` (`.ts`):
            * [x] Modify logic to handle `parentId` when adding a reply.
            * [x] Implement logic to transform the flat list of comments into a nested structure for display (e.g., using a computed signal or a pipe).
            * [x] Manage UI state for showing/hiding inline reply forms (e.g., a signal to track which comment's reply form is active).
        * [x] Update `CommentsSectionComponent` (`.html`):
            * [x] Add "Reply" button to each comment.
            * [x] Use a recursive `ng-template` to render nested replies.
            * [x] Show/hide inline reply form based on UI state.
            * [x] Add `.reply-button` class to reply buttons for specific styling.
        * [x] Update `CommentsSectionComponent` (`.scss`):
            * [x] Add indentation for nested replies.
            * [x] Implement compact styling to reduce vertical space.
            * [x] Neutralize various Material Component pseudo-elements (`::before`, `::after`) causing extra height.
            * [x] Override default heights and margins on list items and buttons.
            * [x] Use `::ng-deep` to force-hide stubborn pseudo-elements.
            * [x] Scope compact button styles to `.reply-button` class.
        * [ ] Write Jest unit tests for reply functionality (`CommentsService`, `CommentsSectionComponent`).
        * [ ] Write Cypress e2e test for adding and viewing a nested reply.
        * [ ] Manually test and verify the compact styling and reply functionality.
* [ ] Add a better message for the comments tab (2025-06-19)
    * [ ] Display message: "Anonymous comments only for now. Be nice and considerate. If you want to request a file format to convert, just give the brokerage name and any info regarding formats you can."
* [ ] Create Jest unit tests for `CommentsSectionComponent` (2025-06-19) - *Deferred*
    * [ ] Test rendering of the informational message
    * [ ] Test basic component structure and elements (e.g., comment form, comments list)
    * [ ] Test interaction logic if applicable (e.g., toggling comment expansion - though this might be more e2e)

* [ ] Design database schema
* [ ] Implement user authentication
* [ ] Develop subscription management features
* [ ] Implement free tier limit enforcement
* [ ] Integrate payment gateway (Stripe)
* [x] Generate sitemap.xml (2025-06-20)
    * [x] Identify key public URLs for the application.
    * [x] Create `public/sitemap.xml` with the identified URLs.
    * [x] Ensure `robots.txt` points to `sitemap.xml`.
* [x] Deploy sitemap.xml and robots.txt to hosting (2025-06-20)

---

## Phase 3: Refactoring & Code Quality

### In Progress

- [ ] Refactor site text to use "Trade Data File Converter" as the app name (2025-06-18)
    - [x] Update `<title>` tag in `src/index.html`
    - [x] Change `AppComponent.title` string to `trade-data-file-converter`
    - [x] Search & update any remaining hard-coded "Robinhood"/"RH Converter" strings in other templates/components
    - [ ] Update app name to 'Trade Data File Converter' across UI (Batch 1 & 2 proposed)
    - [ ] Run the app locally, manually verify no Robinhood references appear and new app name is consistent

### Completed

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

* [x] Deploy sitemap.xml and robots.txt to hosting (2025-06-20)
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

---

## Roadmap: Moderation & Safety

- [ ] Shadow-ban moderation (Deferred) — 2025-08-20
  - Description: Implement optional shadow-ban capability for abusive users.
  - Scope:
    - Admin tool: add/remove shadow ban on a user (with reason, createdAt, by, optional expiresAt).
    - Enforcement policy (to be decided when needed):
      - Option A: status='shadow' + read filtering.
      - Option B: quarantine collection.
      - Option C: hard-block with 403.
    - Client UX: author sees own shadowed posts; others do not; admins see all.
  - Notes: Not currently needed; defer until there is actual abuse volume.
