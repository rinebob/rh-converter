# Image Converter - Cloud Storage Implementation Plan

**Created:** April 26, 2026  
**Status:** Planning Phase  
**Priority:** CRITICAL - Production blocker  
**Objective:** Implement Cloud Storage upload/download flow to bypass 32MB HTTP request/response limits

---

## Problem Statement

### Current Architecture (Broken)
```
User → HTTP POST (multipart files) → Cloud Function → HTTP Response (converted files) → User
```

**Limitations:**
- HTTP request limit: 32MB (Cloud Run hard limit)
- HTTP response limit: 32MB (Cloud Run hard limit)
- User files: 12MB BMP each
- Converted files: 8MB PNG each
- **3 files = 36MB request → 413 error**
- **3 converted = 24MB response → 413 error**
- **Result:** Cannot handle multiple large files

### New Architecture (Cloud Storage)
```
User → Upload to Storage → HTTP POST (storage paths) → Cloud Function → 
  Read from Storage → Convert → Write to Storage → 
  HTTP Response (download URLs) → User downloads from Storage
```

**Benefits:**
- ✅ No file size limits
- ✅ No batch size limits
- ✅ Scalable to hundreds of files
- ✅ Better performance (parallel uploads/downloads)
- ✅ Can add features (progress tracking, resume, etc.)

---

## Architecture Design

### Cloud Storage Bucket Structure

```
gs://rh-converter-temp-images/
  ├── uploads/
  │   └── {userId}/{sessionId}/
  │       ├── file1.bmp
  │       ├── file2.bmp
  │       └── file3.png
  └── converted/
      └── {userId}/{sessionId}/
          ├── file1.png
          ├── file2.png
          └── file3.bmp
```

**Naming Convention:**
- `userId`: Anonymous user ID (generated client-side, stored in localStorage)
- `sessionId`: Unique ID per conversion batch (UUID)
- Keeps files organized and prevents collisions

**Lifecycle:**
- Files auto-delete after 24 hours (Storage lifecycle rule)
- Or delete immediately after successful download

### Request/Response Flow

**Step 1: Frontend Upload**
```typescript
1. User selects files
2. Generate sessionId (UUID)
3. Upload files to Storage in parallel
   - Path: uploads/{userId}/{sessionId}/{filename}
   - Show progress bar per file
4. Collect storage paths
```

**Step 2: Cloud Function Call**
```typescript
POST /convertImage
Body: {
  sessionId: "abc-123",
  files: [
    { storagePath: "uploads/user1/abc-123/file1.bmp", originalName: "file1.bmp" },
    { storagePath: "uploads/user1/abc-123/file2.bmp", originalName: "file2.bmp" }
  ],
  targetFormat: "png",
  quality: 100
}
```

**Step 3: Cloud Function Processing**
```typescript
1. Validate request
2. For each file:
   - Download from Storage
   - Convert image
   - Upload to Storage (converted/{userId}/{sessionId}/{filename})
3. Generate signed download URLs (valid 1 hour)
4. Return URLs to frontend
```

**Step 4: Frontend Download**
```typescript
1. Receive download URLs
2. If single file: direct download
3. If multiple files: 
   - Download all files in parallel
   - Create ZIP on client-side
   - Trigger download
4. Optional: Delete temp files from Storage
```

---

## Implementation Plan

### Phase 1: Firebase Storage Setup (15 minutes)

**1.1 Storage Bucket Configuration**
- Create/verify default Storage bucket exists
- Set up lifecycle rules (auto-delete after 24 hours)
- Configure CORS for browser uploads

**1.2 Security Rules**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow uploads to user's own folder
    match /uploads/{userId}/{sessionId}/{filename} {
      allow write: if true; // Public upload (temp files)
      allow read: if true;  // Public read (needed for Cloud Function)
    }
    
    // Allow downloads from converted folder
    match /converted/{userId}/{sessionId}/{filename} {
      allow read: if true;  // Public read (download URLs)
      allow write: if false; // Only Cloud Function can write
    }
  }
}
```

**Files:**
- `storage.rules` (update)
- Firebase Console (verify bucket, set lifecycle)

---

### Phase 2: Backend Changes (1.5 hours)

**2.1 Update Cloud Function Interface**

**Current:**
- Input: Multipart form data with files
- Output: Blob or ZIP

**New:**
- Input: JSON with storage paths
- Output: JSON with download URLs

**2.2 Add Storage Dependencies**
```typescript
import { getStorage } from 'firebase-admin/storage';
```

**2.3 Create Helper Functions**

**File:** `functions/src/storage-helpers.ts` (new)
```typescript
- downloadFromStorage(path: string): Promise<Buffer>
- uploadToStorage(path: string, data: Buffer): Promise<void>
- generateSignedUrl(path: string, expiresIn: number): Promise<string>
- deleteFile(path: string): Promise<void>
```

**2.4 Update convertImage Function**

**Changes:**
1. Accept JSON body instead of multipart
2. Download files from Storage
3. Convert images (existing logic)
4. Upload converted files to Storage
5. Generate signed URLs
6. Return URLs in JSON response

**New Response Format:**
```json
{
  "success": true,
  "files": [
    {
      "originalName": "file1.bmp",
      "convertedName": "file1.png",
      "downloadUrl": "https://storage.googleapis.com/...",
      "expiresAt": "2026-04-27T00:00:00Z"
    }
  ],
  "sessionId": "abc-123"
}
```

**Files:**
- `functions/src/convert-image.ts` (major refactor)
- `functions/src/storage-helpers.ts` (new)
- `functions/src/interfaces-fn.ts` (update interfaces)

---

### Phase 3: Frontend Changes (2 hours)

**3.1 Add Firebase Storage SDK**

**File:** `package.json`
```json
"@angular/fire": "^18.x.x" (likely already installed)
```

**File:** `src/app/app.config.ts`
```typescript
import { provideStorage, getStorage } from '@angular/fire/storage';

providers: [
  provideStorage(() => getStorage())
]
```

**3.2 Create Storage Service**

**File:** `src/app/core/services/storage.service.ts` (new)

**Responsibilities:**
- Upload files to Storage with progress tracking
- Generate userId (localStorage)
- Generate sessionId (UUID)
- Delete temp files after download

**Methods:**
```typescript
- uploadFiles(files: File[], sessionId: string): Observable<UploadProgress>
- deleteSession(sessionId: string): Promise<void>
- getUserId(): string
```

**3.3 Update ImageConversionService**

**Changes:**
1. Remove multipart form upload logic
2. Add JSON request with storage paths
3. Handle new response format (download URLs)
4. Download files from URLs
5. Create ZIP on client-side if multiple files

**New Flow:**
```typescript
convertImages(files: File[], options: ImageConversionOptions): Observable<ConversionProgress> {
  1. Generate sessionId
  2. Upload files to Storage (show progress)
  3. Call Cloud Function with storage paths
  4. Receive download URLs
  5. Download converted files
  6. Create ZIP if needed
  7. Trigger browser download
  8. Cleanup temp files
}
```

**3.4 Update ImageFileConverterComponent**

**Changes:**
1. Show upload progress (new UI)
2. Show conversion progress
3. Show download progress
4. Handle errors at each stage

**New UI States:**
- Uploading files... (X/Y uploaded)
- Converting images... (processing)
- Downloading results... (X/Y downloaded)
- Complete! (download triggered)

**Files:**
- `src/app/core/services/storage.service.ts` (new)
- `src/app/core/services/image-conversion.service.ts` (major refactor)
- `src/app/features/image-converter/image-file-converter.component.ts` (update)
- `src/app/features/image-converter/image-file-converter.component.html` (add progress UI)

---

### Phase 4: Client-Side ZIP Creation (30 minutes)

**Why:** Can't return ZIP from Cloud Function (response size limit)

**Solution:** Create ZIP on client-side after downloading files

**Library:** JSZip (lightweight, browser-compatible)

**Installation:**
```bash
npm install jszip
npm install --save-dev @types/jszip
```

**Implementation:**
```typescript
import JSZip from 'jszip';

async createZip(files: Array<{name: string, blob: Blob}>): Promise<Blob> {
  const zip = new JSZip();
  files.forEach(file => {
    zip.file(file.name, file.blob);
  });
  return await zip.generateAsync({ type: 'blob' });
}
```

**Files:**
- `package.json` (add jszip)
- `src/app/core/services/image-conversion.service.ts` (add ZIP logic)

---

## Detailed Implementation Steps

### Backend Implementation

**Step 1: Create storage-helpers.ts**
```typescript
// Helper functions for Storage operations
- downloadFromStorage()
- uploadToStorage()
- generateSignedUrl()
- deleteFile()
```

**Step 2: Update interfaces-fn.ts**
```typescript
// New interfaces
interface StorageFileReference {
  storagePath: string;
  originalName: string;
}

interface ConversionRequest {
  sessionId: string;
  files: StorageFileReference[];
  targetFormat: ImageFormat;
  quality: number;
}

interface ConversionResponse {
  success: boolean;
  files: Array<{
    originalName: string;
    convertedName: string;
    downloadUrl: string;
    expiresAt: string;
  }>;
  sessionId: string;
}
```

**Step 3: Refactor convert-image.ts**
```typescript
1. Change from onRequest with multipart to JSON body
2. Parse ConversionRequest from body
3. Download files from Storage
4. Convert images (existing logic)
5. Upload to Storage
6. Generate signed URLs
7. Return ConversionResponse
```

---

### Frontend Implementation

**Step 1: Create storage.service.ts**
```typescript
- Generate userId (localStorage)
- Upload files with progress
- Delete temp files
```

**Step 2: Refactor image-conversion.service.ts**
```typescript
1. Inject StorageService
2. Upload files to Storage
3. Call Cloud Function with paths
4. Download from URLs
5. Create ZIP if multiple files
6. Trigger download
7. Cleanup
```

**Step 3: Update component UI**
```typescript
- Add upload progress
- Add conversion progress
- Add download progress
- Update error handling
```

**Step 4: Add JSZip**
```typescript
- Install library
- Implement client-side ZIP creation
- Test with multiple files
```

---

## Testing Plan

### Unit Tests
- Storage helpers (upload, download, URL generation)
- Conversion service (new flow)
- ZIP creation

### Integration Tests
1. **Single small file:** PNG → BMP
2. **Single large file:** 12MB BMP → PNG
3. **Multiple small files:** 3 × 1MB PNG → BMP
4. **Multiple large files:** 10 × 12MB BMP → PNG
5. **Mixed sizes:** Various file sizes
6. **Error cases:**
   - Upload failure
   - Conversion failure
   - Download failure
   - Network interruption

### Performance Tests
- Measure upload time (parallel)
- Measure conversion time
- Measure download time
- Total time vs old implementation

---

## Deployment Strategy

### Step 1: Deploy Backend
```bash
cd functions
npm run build
firebase deploy --only functions:convertImage
```

### Step 2: Deploy Storage Rules
```bash
firebase deploy --only storage
```

### Step 3: Deploy Frontend
```bash
ng build --configuration production
firebase deploy --only hosting
```

### Step 4: Verify
1. Test with single file
2. Test with multiple files
3. Test with large files (12MB+)
4. Verify cleanup (files deleted after 24h)

---

## Rollback Plan

If Cloud Storage implementation fails:
1. Keep old `convertImage` function as `convertImageLegacy`
2. Deploy new function as `convertImageV2`
3. Frontend can switch between endpoints
4. Gradual migration or instant rollback

---

## Files to Create/Modify

### Backend (Functions)
- ✅ `functions/src/storage-helpers.ts` (new)
- ✅ `functions/src/convert-image.ts` (major refactor)
- ✅ `functions/src/interfaces-fn.ts` (update)
- ✅ `functions/package.json` (verify firebase-admin)

### Frontend
- ✅ `src/app/core/services/storage.service.ts` (new)
- ✅ `src/app/core/services/image-conversion.service.ts` (major refactor)
- ✅ `src/app/features/image-converter/image-file-converter.component.ts` (update)
- ✅ `src/app/features/image-converter/image-file-converter.component.html` (add progress UI)
- ✅ `package.json` (add jszip)

### Configuration
- ✅ `storage.rules` (update)
- ✅ Firebase Console (lifecycle rules)

---

## Estimated Timeline

- **Storage Setup:** 15 minutes
- **Backend Implementation:** 1.5 hours
- **Frontend Implementation:** 2 hours
- **Client-Side ZIP:** 30 minutes
- **Testing:** 1 hour
- **Deployment & Verification:** 30 minutes

**Total:** 5.5-6 hours

---

## Success Criteria

✅ Can upload files of any size to Storage  
✅ Can convert batches of 10+ large files (12MB each)  
✅ No 413 errors  
✅ Conversion completes in reasonable time (<30s for 10 files)  
✅ Download works for single and multiple files  
✅ ZIP creation works on client-side  
✅ Temp files cleaned up automatically  
✅ Error handling at each stage  
✅ Progress feedback for user  

---

## Future Enhancements

- Resume interrupted uploads
- Pause/cancel conversions
- Batch progress tracking
- Conversion history
- Share converted files (temporary links)
- Batch operations (convert all to PNG, etc.)

---

## Security Considerations

### Storage Rules
- Public upload to temp folder (acceptable for temp files)
- Auto-delete after 24 hours (minimize storage costs)
- Signed URLs expire after 1 hour (prevent long-term access)

### Cloud Function
- Validate sessionId format (prevent path traversal)
- Limit file count per request (prevent abuse)
- Validate file sizes (prevent storage exhaustion)
- Rate limiting (existing Cloud Functions limits)

### Frontend
- Generate unique userId (prevent collisions)
- Validate files before upload (size, type)
- Handle upload failures gracefully
- Clean up on errors

---

## Cost Considerations

### Storage Costs
- Temp files: ~12MB × 10 files × 2 (input + output) = 240MB per session
- Auto-delete after 24h minimizes costs
- Estimated: <$0.01 per conversion session

### Cloud Function Costs
- minInstances: 1 = ~$5/month (keeps function warm)
- Invocations: Same as before
- Network egress: Minimal (signed URLs)

### Total Additional Cost
- ~$5-10/month for improved reliability and scalability
- Worth it to avoid 413 errors and poor UX

---

## Next Steps

1. **Review this plan** - Confirm approach
2. **Deploy backend optimization** (minInstances: 1) - Quick win
3. **Implement Cloud Storage solution** - Follow phases above
4. **Test thoroughly** - All scenarios
5. **Deploy to production** - Monitor closely
6. **Resume access control work** - Once stable

---

**Questions for Review:**
1. Approve Cloud Storage architecture?
2. Client-side ZIP vs server-side ZIP preference?
3. Auto-delete after 24h or immediate cleanup?
4. Any additional features needed?
