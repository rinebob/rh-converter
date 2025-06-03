Here's the content converted into a Markdown file format, suitable for a `.md` extension.

```markdown
# RH .csv Converter App Planning

## Product Requirements Document (prd.md)

---

### 1. Introduction

This document outlines the Product Requirements for a web application designed to convert Robinhood transaction CSV files into structured JSON and CSV formats. The application aims to provide a clear, user-friendly tool for individuals to process their financial transaction data for personal record-keeping, tax preparation, or analysis.

### 2. Vision

To be the most intuitive and reliable online tool for Robinhood users to transform their complex transaction CSVs into clean, usable JSON and CSV formats, offering both free and premium tiers.

### 3. Goals

* **Primary Goal:** Enable users to accurately convert Robinhood transaction CSVs into two distinct JSON and CSV files (one for standard transactions, one for dividends).
* **Monetization:** Implement a tiered access model (free with limits, paid for unlimited).
* **User Experience:** Provide a simple, clean, and intuitive user interface.
* **Reliability:** Ensure accurate parsing and conversion of various CSV formats.
* **Scalability:** Build on a serverless architecture to handle varying user loads.
* **Security:** Safeguard user data and financial information (though not stored persistently).

### 4. Target Audience

* Individual Robinhood users who need to organize their transaction data.
* Users looking for a simple, quick way to process financial CSVs without complex software.

### 5. Key Features

* **CSV Upload:** Users can upload their Robinhood transaction CSV files.
* **Automatic Parsing:** The application automatically parses the uploaded CSV content.
* **Smart Data Extraction:**
    * For **CDIV** (Cash Dividend) transactions, `shares_owned` and `dividend_per_share_amount` will be extracted directly from the `Description` column.
    * **CUSIP** numbers will be extracted from the `Description` column if present.
    * "Recurring" information will be extracted from the `Description` column if present.
* **Data Transformation:**
    * Dates (`Activity Date`, `Process Date`, `Settle Date`) converted to "YYYY-MM-DD" format.
    * Numerical values (`Amount`, `Quantity`, `Price`) converted to raw floating-point numbers.
    * Empty CSV cells result in omitted JSON keys.
* **Categorized Output:** Generated output will be split into two logical groups:
    * **Standard Transactions:** All transaction types except CDIV.
    * **Dividend Transactions:** Specifically CDIV transactions.
* **Dual Output Formats:** For both transaction groups, users can download:
    * **JSON files:** Clean, structured JSON objects.
    * **CSV files:** CSV output mirroring the structure, data types, and column names of the JSON files.
* **Tiered Access / Monetization:**
    * **Free Tier:** Users can process a limited number of transactions (e.g., 25-100, to be finalized). If the limit is exceeded, a message prompts upgrade, but the most recent 'X' transactions are still provided. The limit applies to all transaction types.
    * **Paid Tier:** Users can process an unlimited number of transactions. Requires user authentication.
* **User Authentication (Paid Tier):** Secure login and registration functionality using Firebase Authentication.
* **Subscription Management:** Integration with a payment gateway (e.g., Stripe) for paid plan subscriptions.

### 6. Out of Scope for MVP

* Persistent storage of user transaction data on the server.
* Integration with other brokerage platforms.
* Advanced data analysis or visualization features.
* API for programmatic access (beyond the web app's internal use).
* Advanced user profile management beyond subscription status.

### 7. Technical Considerations (High-Level)

* **Frontend:** Angular v19, SASS, Angular Material.
* **Backend:** Firebase Cloud Functions, Firestore.
* **Hosting:** Firebase App Hosting.
* **Payment Gateway:** Stripe (or similar, supporting PayPal, Google Pay).

---

## Backend Documentation (backend.md)

---

### 1. Backend Framework and Language

* **Platform:** Google Cloud Platform (GCP) / Firebase Ecosystem.
* **Core Logic:** Firebase Cloud Functions (written in TypeScript) will handle all server-side processing, including file parsing, conversion, and payment gateway interactions.
* **Data Storage:** Firebase Firestore will be used for managing user accounts, subscription statuses, and tracking free-tier transaction limits.

### 2. Core Backend Services (via Firebase Cloud Functions)

* **File Upload & Storage Service:**
    * Receives the user's uploaded Robinhood CSV file.
    * Temporarily stores the file in Firebase Cloud Storage for processing.
* **CSV Parsing & Validation Function:**
    * Triggered when a new CSV is uploaded (or via an HTTP request).
    * Reads the CSV data from Cloud Storage.
    * Performs initial validation (e.g., checks for expected Robinhood headers).
    * Handles potential malformed lines gracefully.
* **Transaction Processing Function:**
    * Processes the validated CSV data.
    * Determines if a transaction is CDIV or a standard transaction.
    * Applies general parsing rules (dates, numbers, Description for CUSIP/Recurring).
    * For Non-CDIV: Maps CSV columns directly to JSON keys.
    * For CDIV: Parses Description for `shares_owned` and `dividend_per_share_amount`.
    * Filters out original `Quantity` and `Price` for CDIVs.
    * Handles empty CSV cells by omitting the corresponding JSON key.
* **Transaction Limit Enforcement Function (Revised):**
    * **For unauthenticated (free tier) users:**
        * Checks the total number of transactions processed against the free tier limit (e.g., 25-100, to be finalized). The limit applies to all transaction types.
        * If the total transactions are within the limit: All processed transactions are returned.
        * If the total transactions exceed the limit:
            * A specific error message (`LIMIT_EXCEEDED`) is returned to the frontend.
            * Crucially, the function will still return the most recent X transactions (e.g., the exact limit number, 25 or 100) from the processed data in both JSON and CSV formats. This provides a partial, usable output.
    * **For authenticated (paid tier) users:** Allows unlimited transactions.
    * This logic will integrate with Firestore to manage and track limits.
* **Output Generation Function:**
    * Separates processed transactions into two distinct lists: standard and dividend.
    * Generates JSON output for both lists (two separate structures).
    * Generates CSV output for both lists (mirroring JSON structure).
    * Returns the generated JSON/CSV data to the frontend for display and download.

### 3. Database Schema (Firestore)

* **Purpose:** To manage user data for paid tiers and track free-tier usage limits.
* **Collections:**
    * `users`:
        * `userId` (Document ID, from Firebase Auth UID)
        * `email`
        * `subscriptionStatus` (e.g., 'free', 'paid', 'trial')
        * `transactionsProcessedCount` (for free tier tracking)
        * `lastConversionDate` (optional, for rate limiting/usage tracking)

### 4. Authentication & Authorization

* **Mechanism:** Firebase Authentication will be used.
* **Free Tier Access:** Users can access the basic conversion functionality (up to limit) without signing in.
* **Paid Tier Access:** Users must sign in via Firebase Authentication to access unlimited conversions and payment features.
* **Authorization:** Cloud Functions will check the user's `subscriptionStatus` from Firestore to enforce unlimited vs. limited access.

### 5. Third-Party Integrations

* **Firebase Hosting:** For deploying the frontend.
* **Firebase Authentication:** User management.
* **Firebase Cloud Storage:** Temporary file storage.
* **Firebase Firestore:** Database for user/limit management.
* **Payment Gateway Integration:**
    * We'll integrate with a specific payment gateway via Cloud Functions. Stripe is a common and robust choice that supports Google Pay and Apple Pay, and can integrate with PayPal via custom payment methods. Focusing on Stripe as the primary integration for the MVP, as it provides a comprehensive solution for subscriptions and various payment methods.

---

## API Communication (api.md)

---

### 1. API Design Principles

* **RESTful Approach:** We'll primarily use a RESTful approach for clear and consistent communication with Firebase Cloud Functions, invoked via HTTP requests.
* **Data Format:** JSON for request bodies and responses.
* **Error Handling:** Standard HTTP status codes (e.g., 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error) with descriptive JSON error messages.

### 2. API Endpoints

We'll define specific HTTP-triggered Cloud Functions for each core operation:

#### A. Conversion Endpoints

* **POST /convert**
    * **Purpose:** To upload a Robinhood CSV file, trigger its conversion to JSON and CSV, and return the processed data.
    * **Authentication:**
        * **Optional:** For free-tier users (no authentication needed).
        * **Required:** For paid-tier users (Firebase Authentication token in `Authorization` header).
    * **Request:** `multipart/form-data` containing the CSV file.
    * **Request Body Example:** (File upload)

        ```
        Content-Disposition: form-data; name="robinhoodCsv"; filename="transactions.csv"
        Content-Type: text/csv

        <CSV File Content Here>
        ```

    * **Response (Success - 200 OK):**

        ```json
        {
          "message": "Conversion successful",
          "standardTransactionsJson": [
            // Array of standard transaction JSON objects (Option A structure)
          ],
          "dividendTransactionsJson": [
            // Array of dividend transaction JSON objects (Option A structure)
          ],
          "standardTransactionsCsv": "data:text/csv;base64,...", // Base64 encoded CSV string
          "dividendTransactionsCsv": "data:text/csv;base64,..." // Base64 encoded CSV string
        }
        ```

        *Note: Returning base64 encoded CSVs allows the frontend to easily create downloadable files.*
    * **Response (Error - 400 Bad Request / 403 Forbidden / 500 Internal Server Error):**

        ```json
        {
          "error": "Descriptive error message here.",
          "code": "specific_error_code" // e.g., "INVALID_CSV_FORMAT", "LIMIT_EXCEEDED"
        }
        ```

        *Error Handling Specifics:*
        * If the free-tier limit is exceeded for an unauthenticated user, a specific error code (`LIMIT_EXCEEDED`) will be returned, prompting an upgrade, but also providing the partial output.
        * Validation errors (e.g., invalid CSV format) will result in a 400 Bad Request.

#### B. Authentication & Subscription Endpoints (for Paid Tier)

* **POST /auth/login** (via Firebase SDK, not direct HTTP)
    * **Purpose:** Handled by Firebase Client SDK directly. The frontend will use Firebase Authentication SDKs for user sign-up and login. This endpoint primarily represents the backend verification of tokens.
* **POST /subscribe**
    * **Purpose:** Initiates the subscription process via the payment gateway (e.g., Stripe Checkout session creation).
    * **Authentication:** Required (Firebase Auth token).
    * **Request Body Example:** (Minimal, might just trigger a redirect)

        ```json
        {
          "planId": "premium_plan_id" // if multiple plans
        }
        ```

    * **Response (Success - 200 OK):**

        ```json
        {
          "checkoutUrl": "[https://checkout.stripe.com/](https://checkout.stripe.com/)..." // URL to redirect user to payment gateway
        }
        ```

* **POST /webhook/stripe**
    * **Purpose:** Stripe (or other payment gateway) will send webhook notifications to this Cloud Function when payment events occur (e.g., subscription created, payment failed, subscription cancelled).
    * **Authentication:** Handled by webhook signature verification (internal to Cloud Function).
    * **Request Body:** Payment gateway specific webhook payload.
    * **Response (Success - 200 OK):** Empty response expected by webhook sender.
    * **Backend Action:** Updates user's `subscriptionStatus` in Firestore based on webhook events.
* **GET /user/status**
    * **Purpose:** Retrieves the authenticated user's current subscription status and remaining free-tier transactions (if applicable).
    * **Authentication:** Required (Firebase Auth token).
    * **Response (Success - 200 OK):**

        ```json
        {
          "subscriptionStatus": "free" | "paid" | "trial",
          "transactionsProcessedCount": 75, // Only for free tier
          "freeTierLimit": 100
        }
        ```

### 3. Rate Limiting

* **Implementation:** Firebase Cloud Functions can be configured with basic rate limiting, and more advanced solutions can be built using Firestore for tracking request counts per IP or user ID.
* **Purpose:** To prevent abuse and manage resource usage, especially for the free tier.

### 4. Security Considerations

* **Input Validation:** All incoming data (especially file uploads) will be rigorously validated on the backend.
* **Authentication:** Firebase Auth tokens will be verified for every protected endpoint.
* **Authorization:** User roles/subscription status checked before processing requests.
* **Sensitive Data:** No sensitive financial data from the CSV is stored persistently. Payment processing handled by secure third-party gateway.
* **Webhook Security:** Stripe webhooks will be verified using their shared secret to ensure authenticity.

---

## Database Schema (database-schema.md)

---

### 1. Database Platform

* **Platform:** Firebase Firestore (NoSQL, document-oriented database).

### 2. Core Collections and Documents

The primary purpose of the database in this application is to manage user accounts, track free-tier usage, and store subscription statuses. Given the app's initial focus on conversion and the user's decision not to store transaction data persistently, the schema will be relatively simple.

* **Collection: `users`**
    * **Purpose:** Stores information about each user, primarily for managing authentication and subscription tiers. Each document in this collection corresponds to a unique user authenticated via Firebase Authentication.
    * **Document ID:** Corresponds directly to the `uid` (User ID) provided by Firebase Authentication.
    * **Fields:**
        * `email` (string): The user's email address.
        * `subscriptionStatus` (string): The current subscription status of the user.
            * Possible values: `free`, `paid`, `trial`, `cancelled`.
            * Default for new users: `free`.
        * `transactionsProcessedCount` (number):
            * **Purpose:** Tracks the number of transactions processed by the user within the free tier limit.
            * **Applicability:** Only relevant for users on the free tier. This counter would reset periodically (e.g., monthly) or upon upgrade to a paid tier. (We'll define reset logic later).
            * Default: 0.
        * `stripeCustomerId` (string, optional): Stripe's customer ID, linked to this user for payment processing and subscription management. This field will only exist for users who have interacted with the payment gateway.
        * `stripeSubscriptionId` (string, optional): Stripe's subscription ID, if the user has an active paid subscription.
        * `createdAt` (timestamp): The timestamp when the user account was created.
        * `lastLoginAt` (timestamp, optional): The timestamp of the user's last login.

### 3. Security Rules (Conceptual)

* **Purpose:** To ensure data integrity and prevent unauthorized access to user data.
* **High-Level Rules:**
    * Users can only read and write their own document in the `users` collection.
    * Only Firebase Cloud Functions (acting as an admin) can modify sensitive fields like `subscriptionStatus` and `transactionsProcessedCount` (especially when tied to payment webhooks).

### 4. Data Relationships

The `users` collection is a top-level collection. There are no immediate sub-collections or complex relationships within this initial schema. Relationships to external payment data (Stripe) are managed by `stripeCustomerId` and `stripeSubscriptionId`.

---

## User Flow Documentation (user-flow.md)

---

### 1. User Onboarding Flow

This flow details how users interact with the app upon their first visit, distinguishing between free and paid tier access.

#### Scenario 1: Free Tier User (No Authentication)

1.  **Arrive at App:** User lands on the main application page.
2.  **Prompt to Upload CSV:** App displays an interface to upload the Robinhood CSV.
3.  **Upload CSV:** User selects and uploads their CSV file.
4.  **Initiate Conversion:** User clicks a "Convert" button.
5.  **Process & Display:** App processes the CSV.
6.  **Check Free Tier Limit:** Backend (Cloud Function) checks if the total number of transactions in the uploaded file exceeds the free tier limit (e.g., 25-100, applying to all transaction types).
    * **If within Limit:** JSON and CSV outputs for all transactions are displayed on screen.
    * **If Exceeded Limit:** App displays a message indicating the limit has been reached and prompts the user to upgrade to a paid plan for unlimited conversions. Simultaneously, the app will display and allow download of the most recent 'X' transactions (where 'X' is the free tier limit) from the uploaded file, split into their respective standard and dividend outputs.
7.  **Download Output (Optional):** User can click buttons to download the `standard.json`, `dividend.json`, `standard.csv`, and `dividend.csv` files.
8.  **Repeat (within limit):** User can repeat the process as long as their free tier transaction count is not exceeded (or until they upgrade).

#### Scenario 2: Paid Tier User (Authentication Required)

1.  **Arrive at App:** User lands on the main application page.
2.  **Login/Sign Up Prompt:** App displays options to "Login" or "Sign Up".
3.  **Authentication:** User signs up or logs in using Firebase Authentication (e.g., Email/Password).
4.  **Redirect to App/Dashboard:** Upon successful login, the user is directed to the main conversion interface (or a simple dashboard).
5.  **Prompt to Upload CSV:** App displays an interface to upload the Robinhood CSV.
6.  **Upload CSV:** User selects and uploads their CSV file.
7.  **Initiate Conversion:** User clicks a "Convert" button.
8.  **Process & Display (Unlimited):** App processes the CSV. Backend recognizes the user as a paid subscriber and allows unlimited transactions. JSON and CSV outputs are displayed on screen.
9.  **Download Output (Optional):** User can click buttons to download the `standard.json`, `dividend.json`, `standard.csv`, and `dividend.csv` files.

### 2. Core User Journey: CSV Conversion

This is the primary journey for both free and paid users after initial access.

1.  **Access Conversion Interface:** User is on the main app screen.
2.  **Upload File:** User clicks an upload button and selects their Robinhood transaction CSV file.
3.  **File Validation (Frontend):** Brief check on the frontend for file type (.csv) and initial size.
4.  **Initiate Conversion:** User clicks a clearly labeled "Convert Data" button.
5.  **Loading State:** App displays a loading indicator while the backend processes the file.
6.  **Backend Processing:**
    * File sent to Firebase Cloud Function.
    * Limit check performed (for free tier).
    * CSV parsed, validated, and converted to JSON/CSV data.
    * Data sent back to frontend.
7.  **Display Results:**
    * The JSON output is displayed on the screen, initially in a human-readable format.
    * A toggle or tab allows the user to switch to a table view for verification.
8.  **Download Options:** Clearly visible buttons or links are provided to download the generated `standard.json`, `dividend.json`, `standard.csv`, and `dividend.csv` files locally.
9.  **Error Display:** If an error occurs (e.g., invalid CSV, parsing error, limit exceeded), a clear, user-friendly error message is displayed, potentially with guidance (e.g., "Invalid CSV format, please check your file." or "Free tier limit reached. Please upgrade to continue.").

### 3. Subscription Management Flow (Paid Tier Only)

1.  **Initiate Upgrade:**
    * From Free Tier Limit Message: User clicks an "Upgrade" button after hitting the free tier limit.
    * From User Profile/Settings: Authenticated user navigates to a "Subscription" or "Upgrade" section in the app.
2.  **Display Pricing:** App displays pricing plans (if more than one) and features.
3.  **Select Plan & Proceed to Checkout:** User selects a plan and clicks "Subscribe" or "Checkout."
4.  **Redirect to Payment Gateway:** Frontend redirects the user to the secure payment gateway (e.g., Stripe Checkout page).
5.  **Payment Gateway Interaction:** User completes payment details on the secure third-party site.
6.  **Webhook Notification (Backend):** Payment gateway sends a webhook to the Firebase Cloud Function upon successful payment.
7.  **Update Subscription Status:** Cloud Function updates the user's `subscriptionStatus` in Firestore to `paid`.
8.  **Redirect Back to App:** Payment gateway redirects the user back to the application.
9.  **Confirmation:** App displays a success message ("Subscription activated!") and updates the UI to reflect unlimited access.

### 4. Error Handling During User Flows

* **Invalid File Upload:** Frontend validation prevents non-CSV files or excessively large files from being uploaded. Clear message to user.
* **CSV Parsing Errors:** If the backend encounters malformed CSV data, a specific error message (e.g., "CSV format error on line X") is returned and displayed to the user.
* **API Call Failures:** Network issues, server errors (Cloud Function errors) will trigger generic error messages to the user ("Something went wrong, please try again.") with logging for debugging.
* **Authentication Errors:** Incorrect credentials, account not found, etc., handled by Firebase Auth SDK with appropriate messages.
* **Limit Exceeded:** Specific error message and clear call to action to upgrade, along with the partial output.

---

## DevOps Documentation (devops.md)

---

### 1. Hosting Environment

* **Frontend (Angular):** Firebase App Hosting
    * This provides a fast, secure, and scalable hosting solution tailored for single-page applications. It includes CDN, SSL, and custom domain support.
* **Backend (Cloud Functions):** Google Cloud Functions (part of the Firebase ecosystem)
    * Serverless execution environment, automatically scales with demand, pay-per-execution model.
* **Database (Firestore):** Firebase Firestore
    * Managed NoSQL database, automatically scales.
* **File Storage (Cloud Storage):** Firebase Cloud Storage
    * Managed object storage for uploaded CSV files.

### 2. Continuous Integration / Continuous Deployment (CI/CD)

* **Tool:** GitHub Actions (recommended for integration with GitHub repositories).
* **Workflow:**
    * **Automated Testing (CI):** On every pull request or push to `main` branch (future task):
        * Run frontend unit tests.
        * Run backend (Cloud Functions) unit tests.
        * Linting and code style checks.
    * **Automated Deployment (CD):** On merge to `main` branch:
        * **Frontend:** Build Angular application, deploy to Firebase App Hosting.
        * **Backend:** Deploy Firebase Cloud Functions.
        * **Database Rules/Indexes:** Deploy Firestore security rules and indexes (if applicable, though simple for MVP).
        * **Storage Rules:** Deploy Cloud Storage security rules.
* **Environments:**
    * **Development:** Local development environment for developers.
    * **Staging (Optional for MVP, but good practice):** A separate Firebase project or dedicated branch deployment for testing new features before production release.
    * **Production:** The live Firebase project for end-users.

### 3. Monitoring and Logging

* **Logging:**
    * **Firebase Cloud Functions Logs:** Automatically integrated with Google Cloud Logging. Will capture console logs, errors, and execution details for Cloud Functions.
    * **Frontend Logging:** Implement client-side logging (e.g., using a simple `console.log` for MVP, or a tool like Sentry for more robust error tracking in the future) to capture frontend errors and user behavior.
* **Error Tracking:**
    * **Cloud Monitoring / Error Reporting:** Automatic for Cloud Functions errors.
    * **Sentry (or similar):** Recommended for proactive error tracking and alerting for both frontend and backend (Cloud Functions) errors. This allows for real-time alerts on production issues.
* **Performance Monitoring:**
    * **Firebase Performance Monitoring:** Can be integrated into the Angular app to track load times, network requests, and other client-side performance metrics.
    * **Cloud Monitoring:** For Cloud Functions performance (latency, invocations, errors).

### 4. Scaling Strategy

* **Serverless by Default:** Firebase Cloud Functions, Firestore, Cloud Storage, and App Hosting are all serverless services, meaning they automatically scale to meet demand without manual intervention.
* **Cloud Functions Scaling:** Automatically scales instances based on incoming request load.
* **Firestore Scaling:** Scales automatically with data storage and read/write operations.
* **Cloud Storage Scaling:** Handles arbitrary amounts of data.
* **CDN (App Hosting):** Content Delivery Network ensures fast content delivery globally, reducing load on origin servers.
* **Load Balancing:** Implicitly handled by Firebase/GCP for serverless components.

### 5. Security Considerations (DevOps Specific)

* **Firebase Security Rules:** Secure Firestore and Cloud Storage data access.
* **Environment Variables:** Sensitive information (e.g., API keys, payment gateway secrets) securely managed using Firebase Environment Configuration for Cloud Functions, not hardcoded.
* **Service Accounts:** Fine-grained permissions for CI/CD pipelines to deploy resources.
* **Webhook Security:** Ensure Stripe webhooks are verified using their shared secret.

---

## Testing Plan Documentation (testing-plan.md)

---

### 1. Current Scope

For the initial version of this simple application (MVP), a formal, automated testing suite (unit, integration, end-to-end) is **not in scope**.

Testing will primarily consist of **manual, exploratory testing** by the developers to ensure core functionality, user flows, and conversion accuracy.

### 2. Manual Testing Focus

* **Core Conversion Flow:**
    * Upload various Robinhood CSV files (including the provided sample and potentially edge cases like empty files, very large files, files with unusual characters if available).
    * Verify correct JSON and CSV output generation for both standard and dividend transactions.
    * Ensure numerical values are correctly parsed and formatted.
    * Verify dates are correctly formatted.
    * Check `cusip_number` and `is_recurring_transaction` extraction.
    * Confirm correct handling of empty cells (omission).
* **Free Tier Limit Logic:**
    * Test conversion with files under the free tier limit.
    * Test conversion with files exceeding the free tier limit, verifying the correct message is displayed and only the most recent X transactions are returned.
* **Authentication (Paid Tier):**
    * Test user sign-up, login, and logout.
    * Verify access to unlimited conversions for authenticated users.
* **Payment Gateway Integration:**
    * Simulate subscription flow (using test credentials for Stripe/payment gateway).
    * Verify user's `subscriptionStatus` updates correctly in Firestore after payment/webhook events.
* **Error Handling:**
    * Test invalid file uploads (non-CSV).
    * Simulate network errors during API calls (if possible in dev environment).
    * Verify clear error messages are displayed to the user.

### 3. Future Testing Tasks

* **Unit Testing:** Implement unit tests for critical business logic in Firebase Cloud Functions (e.g., CSV parsing, data transformation rules, limit enforcement) and for key Angular components and services (e.g., file upload handler, data display components).
* **Integration Testing:** Develop tests to ensure seamless interaction between frontend components, Cloud Functions, and Firebase services (Firestore, Auth, Storage).
* **End-to-End (E2E) Testing:** Implement E2E tests (e.g., using Cypress or Playwright) to simulate complete user journeys from CSV upload to JSON/CSV download, covering both free and paid tier flows.
* **Performance Testing:** Conduct load testing on Cloud Functions to ensure they can handle expected user concurrency and large CSV files efficiently.
* **Security Testing:** Perform basic security audits and vulnerability scanning.

---

## State Management Documentation (state-management.md)

---

### 1. Approach Overview (Revised for Angular v19)

With Angular v19, the framework significantly enhances its native reactivity capabilities through **Signals**. This allows for a more streamlined, performant, and often simpler approach to state management compared to relying solely on RxJS or external state management libraries for this application's needs.

**Strategy:** Primarily leverage Angular Signals for both local component state and shared application state within Angular Services. RxJS will still be used where complex stream orchestration is beneficial (e.g., for `resource`/`rxResource` APIs, or specific scenarios that require RxJS operators).

**Default:** All new Angular components, directives, and pipes will be standalone by default.

### 2. Local Component State (Revised)

* **Purpose:** Manages data specific to a single component that doesn't need to be broadly shared.
* **Implementation:**
    * Use `signal()` for mutable local state (e.g., `loading = signal(false);`).
    * Use `computed()` for derived state that depends on other signals (e.g., `canSubmit = computed(() => !this.isLoading() && this.fileSelected());`).
    * Utilize the new signal-based `input()` for component inputs (e.g., `fileName = input<string>();`).
    * Utilize the new signal-based `output()` for component outputs (e.g., `fileUploaded = output<File>();`).
    * Use signal-based queries (`viewChild`, `viewChildren`, `contentChild`, `contentChildren`) for accessing child components or elements reactively.
    * Leverage `effect()` for side effects that react to signal changes (e.g., logging, interacting with the DOM outside of templates).
* **Examples:**
    * Form input values (e.g., file selection input stored as a signal).
    * UI state (e.g., loading signal, errorMessage signal).
    * Tab/view selection for displaying JSON/table output (stored as a signal).

### 3. Global (Shared) Application State via Angular Services (Revised)

* **Purpose:** Manages data that needs to be accessed and shared across multiple components or maintained throughout the user session (e.g., authentication status, conversion results, user subscription details).
* **Implementation:** Singleton Angular services (`providedIn: 'root'`) will host `signal()` or `computed()` values for shared state. Components will inject these services and read the signals directly.
* **Examples:**
    * **AuthService:** Manages user authentication status and subscription tier.
        * Wraps Firebase Authentication.
        * Exposes `currentUser = signal<User | null>(null);`
        * Exposes `subscriptionStatus = signal<'free' | 'paid' | 'trial'>('free');`
        * Can use `effect()` to react to Firebase Auth state changes and update the `currentUser` signal.
    * **ConversionService:** Handles interaction with the backend `/convert` API, stores the latest conversion results, and manages conversion-specific loading/error states.
        * Exposes `conversionResults = signal<ConversionData | null>(null);`
        * Exposes `isLoadingConversion = signal(false);`
        * Exposes `conversionError = signal<string | null>(null);`
        * Consider using Angular v19's experimental `resource()` or `rxResource()` APIs for asynchronous data fetching to automatically manage loading, error, and value states directly with signals. This simplifies data fetching logic:

        ```typescript
        // Example using resource() (experimental)
        import { resource } from '@angular/core/rxjs-interop'; // Or just '@angular/core' if direct

        @Injectable({ providedIn: 'root' })
        export class ConversionService {
          // ...
          // Assuming this.http is HttpClient
          // This is a conceptual example, actual implementation would involve file upload
          readonly conversionResource = resource((id: string) =>
            this.http.post<ConversionData>('/api/convert', { fileId: id }).pipe(
              // ... error handling, etc.
            )
          );
          // Access states: this.conversionResource.loading(), this.conversionResource.value(), this.conversionResource.error()
        }
        ```

        (Note: `resource()` and `rxResource()` are experimental in v19. If stability is paramount for the MVP, a combination of `signal()` and manual `HttpClient` calls with `set()`/`update()` on signals can be used.)
    * **UIService (Optional):** For managing global UI concerns like snackbar messages or app-wide loading spinners, also using signals.

### 4. Server State Management

* **Approach:** The `ConversionService` and `AuthService` will serve as the primary sources for server-side state.
* **Data Freshness:** Firebase SDKs for Authentication and Firestore inherently provide real-time updates or efficient caching. For conversion results, the data is transient (fetched on demand). The `resource()` API, if used, aids in managing the lifecycle and freshness of this asynchronous data.

### 5. Persistence

* **Authentication State:** Firebase Authentication continues to handle the persistence of user login sessions (e.g., in `localStorage`), ensuring users remain logged in across browser sessions.
* **App Preferences/Settings:** No custom client-side persistence is planned for the MVP.
* **Conversion Results:** Generated data is for immediate display and download, not persistent client-side storage.

---

## Performance Optimization Documentation (performance-optimization.md)

---

### 1. General Principles

* **Prioritize User Experience:** Focus on optimizations that directly impact perceived performance (e.g., fast loading times, responsive UI).
* **Balance with Development Speed:** For an MVP with a rapid GA timeline, avoid premature optimization. Implement common best practices first, then optimize further based on observed bottlenecks.
* **Leverage Cloud Native Optimizations:** Rely on Firebase/GCP's inherent performance benefits (serverless scaling, CDNs).

### 2. Frontend (Angular) Optimizations

* **Lazy Loading:**
    * **Modules/Routes:** Implement lazy loading for feature modules (e.g., if a dashboard or subscription management section becomes a separate module) to reduce the initial bundle size and load only what's necessary.
    * **Components:** Consider lazy loading specific, large components that are not immediately visible on page load.
* **Change Detection Strategy:**
    * Utilize `OnPush` change detection strategy for components where possible. This improves perf
```