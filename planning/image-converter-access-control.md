# Image Converter Access Control - Planning Document

**Created:** April 26, 2026  
**Status:** Planning Phase - ON HOLD  
**Objective:** Restrict image converter access to 2 specific Gmail addresses while maintaining "no login required" for public CSV conversion feature

---

## ⚠️ PRODUCTION ISSUES DISCOVERED - PRIORITY FIX REQUIRED

**Status:** Access control implementation paused due to critical production issues with image converter

### Issues Identified

**Issue 1: Slow Performance (30+ seconds)**
- **Problem:** Single PNG→BMP conversion taking 30+ seconds in production
- **Root Cause:** Cold start latency (Cloud Run spinning up new instances)
- **Impact:** Poor user experience, appears broken

**Issue 2: 413 Content Too Large Error**
- **Problem:** Multiple BMP files (3 × 12MB = 36MB) failing with HTTP 413
- **Root Cause:** Cloud Run has 32MB request body limit (cannot be increased)
- **Impact:** Cannot process multiple large files, core feature broken
- **Note:** Converted PNGs are ~8MB each, so response size is also problematic

### Solutions Implemented/Planned

**Backend Optimization (Completed):**
- Memory: `2GiB` → `512MiB` (faster cold starts)
- Timeout: `540s` → `120s` (more reasonable)
- **minInstances: `0` → `1`** (keeps function warm, eliminates cold starts)
- Status: Code updated, ready to deploy

**Cloud Storage Solution (Required):**
- **Why:** 32MB HTTP limit cannot be bypassed, converted files are 8MB each
- **Approach:** Upload files to Cloud Storage, process via storage paths, return download URLs
- **Benefits:** No size limits, handles any number of files, more scalable
- **Timeline:** 3-4 hours implementation
- **Priority:** CRITICAL - must be done before access control

### Decision

**Pausing access control work** to implement Cloud Storage solution first. Access control is useless if the core feature doesn't work reliably.

**Next Steps:**
1. Deploy backend optimization (minInstances: 1)
2. Implement full Cloud Storage upload/download flow
3. Test in production with large batches
4. Resume access control implementation once stable

---

## Requirements

### Business Requirements
- **Public Access:** CSV converter remains accessible without login (marketing promise: "no login required")
- **Restricted Access:** Image converter only accessible to 2 whitelisted Gmail addresses
- **User Experience:** Seamless for authorized users, invisible to unauthorized users
- **Security:** Backend verification to prevent unauthorized access

### Technical Requirements
- Use Firebase Authentication (Google Sign-In)
- Whitelist management for authorized emails
- Frontend conditional UI rendering
- Backend request verification
- No breaking changes to existing CSV converter functionality

---

## Architecture Overview

### Access Levels

**Level 1: Public Users (No Authentication)**
- Can access CSV converter immediately
- No sign-in required
- Cannot see or access image converter
- "Convert Images" button hidden

**Level 2: Authenticated Users (Whitelisted)**
- Optional sign-in with Google
- Email verified against whitelist
- Can access both CSV and image converters
- "Convert Images" button visible after sign-in

**Level 3: Authenticated Users (Not Whitelisted)**
- Can sign in but email not in whitelist
- Can access CSV converter
- Cannot access image converter
- Friendly message: "Image converter access is restricted"

---

## Implementation Plan

### Phase 1: Backend Security

#### 1.1 Environment Configuration
**File:** `functions/.env` or Firebase Functions config

```
ALLOWED_IMAGE_CONVERTER_EMAILS=your-email@gmail.com,teammate-email@gmail.com
```

**Alternative:** Firestore collection for easier management
- Collection: `imageConverterAccess`
- Documents: `{ email: string, granted: boolean, grantedAt: timestamp }`

#### 1.2 Update `convertImage` Cloud Function
**File:** `functions/src/convert-image.ts`

**Changes:**
1. Import Firebase Admin SDK for auth verification
2. Add function to verify auth token from request header
3. Extract user email from verified token
4. Check if email is in whitelist (env var or Firestore)
5. Return 403 Forbidden if unauthorized
6. Proceed with conversion if authorized

**Error Responses:**
- 401: No auth token provided
- 403: Email not whitelisted
- Existing error codes remain unchanged

#### 1.3 Keep `uploadCsv` Public
**File:** `functions/src/upload-csv.ts`

**Changes:** None - remains publicly accessible without authentication

---

### Phase 2: Frontend Authentication

#### 2.1 Auth Service
**File:** `src/app/core/services/auth.service.ts` (new)

**Responsibilities:**
- Initialize Firebase Auth
- Handle Google sign-in/sign-out
- Manage auth state (signal-based)
- Check if user email is whitelisted
- Provide auth token for API requests

**Signals:**
- `isAuthenticated`: boolean
- `currentUser`: User | null
- `hasImageConverterAccess`: boolean
- `isCheckingAccess`: boolean

**Methods:**
- `signInWithGoogle()`: Trigger Google sign-in
- `signOut()`: Sign out user
- `checkImageConverterAccess()`: Verify email against whitelist
- `getAuthToken()`: Get ID token for API requests

#### 2.2 Update ImageConversionService
**File:** `src/app/core/services/image-conversion.service.ts`

**Changes:**
1. Inject AuthService
2. Add auth token to HTTP request headers
3. Handle 401/403 errors gracefully
4. Show appropriate error messages

**Header Format:**
```
Authorization: Bearer <firebase-id-token>
```

#### 2.3 Update Main Layout/Header
**File:** `src/app/features/file-converter-v1/file-converter-v1.component.ts/html`

**Changes:**
1. Inject AuthService
2. Add small "Sign In" button (top-right corner)
3. Show user email when signed in
4. Add "Sign Out" option
5. Conditionally show "Convert Images" button based on `hasImageConverterAccess`

**UI States:**
- **Not signed in:** Show "Sign In" button, hide "Convert Images" button
- **Signed in + whitelisted:** Show user email, "Sign Out", and "Convert Images" button
- **Signed in + not whitelisted:** Show user email, "Sign Out", hide "Convert Images" button

#### 2.4 Image Converter Component Guard
**File:** `src/app/features/image-converter/image-file-converter.component.ts`

**Changes:**
1. Check auth state on component init
2. If not authenticated or not whitelisted, show message:
   - "Please sign in to access the image converter"
   - Or redirect back to main page
3. Disable conversion if auth token expires

---

### Phase 3: Whitelist Management

**REQUIREMENT:** Must be able to add/remove emails without code changes or redeployment

#### Recommended Solution: Firestore Collection + Admin Script

**Why Firestore:**
- ✅ Add/remove users without redeployment
- ✅ Audit trail (who added, when)
- ✅ Can add metadata (notes, expiration dates)
- ✅ Can build admin UI later if needed
- ✅ Fast with in-memory caching

**Firestore Schema:**
```
Collection: imageConverterAccess
Document ID: {email} (e.g., "user@gmail.com")
Fields:
  - email: string (user's Gmail address)
  - granted: boolean (access granted/revoked)
  - grantedBy: string (admin who granted access)
  - grantedAt: timestamp
  - notes: string (optional - reason for access)
  - lastUsed: timestamp (optional - track usage)
```

#### Admin Management Options

**Option A: Firebase Console (Simplest)**
- Manually add/edit documents in Firestore console
- No code needed
- Good for infrequent changes
- **Time:** 0 minutes (use existing Firebase console)

**Option B: Admin Script (Recommended)**
**File:** `functions/scripts/manage-access.ts`

Create simple Node.js script to run locally:
```bash
# Add user
npm run manage-access -- add user@gmail.com "Team member - design work"

# Remove user
npm run manage-access -- remove user@gmail.com

# List all users
npm run manage-access -- list

# Check specific user
npm run manage-access -- check user@gmail.com
```

**Pros:**
- Fast, command-line based
- Can be run from any machine with Firebase credentials
- Audit trail built-in
- Type-safe with TypeScript

**Implementation:**
- Create script in `functions/scripts/`
- Use Firebase Admin SDK
- Add npm scripts for easy execution
- **Time:** 1 hour to build

**Option C: Admin Web UI (Future Enhancement)**
**File:** `src/app/features/admin/access-management/`

Simple authenticated admin panel:
- List all whitelisted emails
- Add new email with notes
- Revoke access
- View usage stats
- Only accessible to specific admin emails

**Pros:**
- User-friendly
- No command line needed
- Can delegate to team members

**Cons:**
- More development time
- Needs its own access control

**Implementation:**
- Create admin route (protected)
- Build simple CRUD UI
- Call Cloud Function for operations
- **Time:** 3-4 hours to build

#### Recommended Approach: Firestore + Admin Script

**Phase 1:** Use Firestore with manual console edits (immediate)
**Phase 2:** Create admin script for convenience (1 hour)
**Phase 3:** Build admin UI if needed later (optional)

#### Caching Strategy

To avoid Firestore reads on every request:

```typescript
// In-memory cache in Cloud Function
let accessCache: Map<string, boolean> = new Map();
let cacheExpiry: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function checkAccess(email: string): Promise<boolean> {
  // Check cache first
  if (Date.now() < cacheExpiry && accessCache.has(email)) {
    return accessCache.get(email)!;
  }
  
  // Cache expired or miss - refresh from Firestore
  const snapshot = await db.collection('imageConverterAccess').get();
  accessCache.clear();
  snapshot.forEach(doc => {
    accessCache.set(doc.id, doc.data().granted === true);
  });
  cacheExpiry = Date.now() + CACHE_TTL;
  
  return accessCache.get(email) || false;
}
```

**Benefits:**
- Fast lookups (in-memory)
- Minimal Firestore reads (every 5 minutes max)
- Auto-refreshes on cache expiry
- Low cost

---

### Phase 4: User Experience Flow

#### First-Time Authorized User
1. Visit site → see CSV converter (no login prompt)
2. Notice small "Sign In" button in header
3. Click "Sign In" → Google sign-in popup
4. Sign in with whitelisted Gmail
5. System checks whitelist → grants access
6. "Convert Images" button appears
7. Can now use both CSV and image converters

#### Returning Authorized User
1. Visit site → automatically signed in (Firebase persistence)
2. "Convert Images" button visible immediately
3. Seamless experience

#### Unauthorized User
1. Visit site → see CSV converter
2. May or may not see "Sign In" button (design choice)
3. If they sign in with non-whitelisted email:
   - No "Convert Images" button appears
   - Optional: Show subtle message "Image converter access restricted"
4. Can still use CSV converter normally

#### Public User (Never Signs In)
1. Visit site → see CSV converter
2. Use CSV converter without any login
3. Never sees image converter feature
4. Marketing promise maintained: "No login required"

---

## Security Considerations

### Backend Security
- ✅ Auth token verification on every request
- ✅ Email whitelist check before processing
- ✅ No client-side bypass possible
- ✅ Proper error codes (401, 403)
- ✅ Rate limiting (existing Firebase Functions limits)

### Frontend Security
- ✅ UI hiding is UX convenience only
- ✅ Real security enforced in backend
- ✅ Auth token included in all image conversion requests
- ✅ Token refresh handled automatically by Firebase

### Data Privacy
- ✅ No PII stored beyond Firebase Auth
- ✅ Email only used for access verification
- ✅ No tracking of unauthorized users

---

## Testing Plan

### Test Cases

**TC1: Public User - CSV Converter**
- Action: Visit site without signing in
- Expected: Can use CSV converter normally
- Expected: "Convert Images" button not visible

**TC2: Whitelisted User - Sign In**
- Action: Sign in with whitelisted Gmail
- Expected: "Convert Images" button appears
- Expected: Can convert images successfully

**TC3: Non-Whitelisted User - Sign In**
- Action: Sign in with non-whitelisted Gmail
- Expected: "Convert Images" button remains hidden
- Expected: Can still use CSV converter

**TC4: Whitelisted User - Direct API Call**
- Action: Make API call to convertImage with valid token
- Expected: Conversion succeeds

**TC5: Non-Whitelisted User - Direct API Call**
- Action: Make API call to convertImage with valid token (non-whitelisted email)
- Expected: 403 Forbidden error

**TC6: Unauthenticated - Direct API Call**
- Action: Make API call to convertImage without auth token
- Expected: 401 Unauthorized error

**TC7: Token Expiration**
- Action: Use app after token expires
- Expected: Firebase auto-refreshes token, or prompts re-auth

**TC8: Sign Out**
- Action: Signed-in user clicks "Sign Out"
- Expected: "Convert Images" button disappears
- Expected: CSV converter still works

---

## Deployment Strategy

### Step 1: Backend Deployment
1. Add whitelist configuration (env vars or Firestore)
2. Update `convertImage` function with auth verification
3. Deploy functions: `firebase deploy --only functions:convertImage`
4. Test with Postman/curl using auth tokens

### Step 2: Frontend Deployment
1. Create AuthService
2. Update ImageConversionService with auth headers
3. Update UI components with conditional rendering
4. Test locally with Firebase emulators
5. Deploy: `firebase deploy --only hosting`

### Step 3: User Provisioning
1. Create Firestore collection `imageConverterAccess`
2. Add your 2 Gmail addresses to whitelist:
   - **Option 1:** Manually in Firebase Console
   - **Option 2:** Run admin script: `npm run manage-access -- add your@gmail.com`
3. Test sign-in with both accounts
4. Verify access control works as expected
5. Test adding/removing emails with admin script

### Step 4: Monitoring
1. Check Firebase Functions logs for auth errors
2. Monitor for unauthorized access attempts
3. Verify public CSV converter still works without auth

---

## Future Enhancements (Optional)

### Admin Panel
- Simple UI to add/remove whitelisted emails
- View access logs
- Manage user permissions

### Access Levels
- Different permission levels (viewer, converter, admin)
- Feature-specific access control
- Usage quotas per user

### Analytics
- Track image converter usage by user
- Monitor conversion patterns
- Cost attribution

---

## Files to Modify

### Backend
- ✅ `functions/src/convert-image.ts` - Add auth verification
- ✅ Firestore collection `imageConverterAccess` - Store whitelist
- ✅ `functions/scripts/manage-access.ts` - Admin script (new file)
- ✅ `functions/package.json` - Add script commands for access management
- ✅ `functions/package.json` - May need firebase-admin (likely already installed)

### Frontend
- ✅ `src/app/core/services/auth.service.ts` - New file
- ✅ `src/app/core/services/image-conversion.service.ts` - Add auth headers
- ✅ `src/app/features/file-converter-v1/file-converter-v1.component.ts` - Conditional UI
- ✅ `src/app/features/file-converter-v1/file-converter-v1.component.html` - Sign-in button
- ✅ `src/app/features/file-converter-v1/file-converter-v1.component.scss` - Sign-in button styles
- ✅ `src/app/features/image-converter/image-file-converter.component.ts` - Auth check
- ✅ `src/app/app.config.ts` - Firebase Auth initialization

### Configuration
- ✅ `firebase.json` - May need auth emulator config for local testing
- ✅ Firebase Console - Enable Google Sign-In provider

---

## Estimated Implementation Time

- **Backend:** 2-3 hours
  - Auth verification: 45 min
  - Firestore whitelist setup: 30 min
  - Admin script: 1 hour
  - Testing: 30 min

- **Frontend:** 2-3 hours
  - AuthService: 1 hour
  - UI updates: 1 hour
  - Integration & testing: 1 hour

- **Total:** 4-6 hours

**Note:** Admin script is optional for initial launch - can use Firebase Console manually and add script later if needed.

---

## Success Criteria

✅ Public users can use CSV converter without login  
✅ Whitelisted users can sign in and access image converter  
✅ Non-whitelisted users cannot access image converter (UI + backend)  
✅ Backend rejects unauthorized API calls with proper error codes  
✅ No breaking changes to existing CSV converter  
✅ Marketing promise maintained: "No login required" (for CSV)  
✅ Secure, scalable, maintainable solution  

---

## Next Steps

1. **Review this plan** - Confirm approach and requirements
2. **Choose whitelist storage** - Environment variables or Firestore?
3. **Implement backend** - Add auth verification to convertImage
4. **Implement frontend** - Create AuthService and update UI
5. **Test thoroughly** - All test cases above
6. **Deploy** - Backend first, then frontend
7. **Provision users** - Add 2 Gmail addresses to whitelist
8. **Monitor** - Verify everything works in production

---

**Questions for Review:**
1. ~~Whitelist storage preference: Environment variables or Firestore?~~ → **Firestore (for easy management)**
2. Admin script: Build now or use Firebase Console manually for now?
3. Should non-whitelisted signed-in users see any message, or just no button?
4. Should "Sign In" button always be visible, or only appear on hover/menu?
5. Any additional authorized emails to add in the future?
