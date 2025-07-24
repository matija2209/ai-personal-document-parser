# R2 Upload & CORS Troubleshooting Guide

## Problem Summary
Direct client uploads to Cloudflare R2 using presigned URLs were failing with CORS errors, followed by "NoSuchBucket" errors during server-side uploads.

---

## FAQ & Solutions

### Q: Why am I getting CORS errors when uploading to R2?

**A:** CORS errors with R2 presigned URLs occur because:

1. **R2 bucket CORS ≠ R2 public URL CORS**
   - Setting CORS in Cloudflare dashboard applies to public URLs only
   - Presigned URLs use the direct R2 API endpoint
   - Direct R2 API endpoints have separate CORS configuration

2. **Dashboard CORS configuration may not work for presigned URLs**
   - R2 API CORS needs to be set programmatically
   - Public URL CORS doesn't apply to authenticated requests

**Solution:** Use server-side uploads instead of direct client uploads to bypass CORS entirely.

---

### Q: I'm getting "NoSuchBucket" error - the bucket exists in my dashboard!

**A:** 99% of the time this is a **region endpoint mismatch**.

**Check your bucket region:**
1. Go to your R2 dashboard
2. Look at the URL: `https://dash.cloudflare.com/{account_id}/r2/eu/buckets/{bucket_name}`
3. If you see `/r2/eu/` in the path, your bucket is in EU region

**Fix the endpoint:**
- **EU region bucket**: `https://{account_id}.eu.r2.cloudflarestorage.com`
- **Auto region bucket**: `https://{account_id}.r2.cloudflarestorage.com`

**Example:**
```typescript
// ❌ Wrong - missing .eu for EU bucket
endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

// ✅ Correct - for EU region bucket
endpoint: `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`
```

---

### Q: Why doesn't presigned URL work with R2 public URLs?

**A:** Public URLs are for **reading files**, not **uploading** them.

- **Public URLs**: Read-only access to files already in the bucket
- **Presigned URLs**: Authenticated write access to upload files
- **They serve different purposes and use different endpoints**

**You cannot use presigned URL query parameters with public URLs.**

---

### Q: Should I use client-side or server-side uploads?

**A:** **Server-side uploads are recommended** for R2 because:

**Client-side uploads (presigned URLs):**
- ❌ Complex CORS configuration required
- ❌ CORS setup often fails or is inconsistent
- ❌ Security concerns with client-side credentials
- ❌ Difficult to implement progress tracking
- ❌ Browser limitations and edge cases

**Server-side uploads:**
- ✅ No CORS issues
- ✅ Better security (credentials stay on server)
- ✅ Easier error handling
- ✅ Can add validation, processing, compression
- ✅ Consistent behavior across browsers
- ✅ Better for production environments

---

### Q: How do I verify my R2 configuration is correct?

**A:** Follow this checklist:

1. **Check environment variables:**
   ```bash
   echo $R2_ACCOUNT_ID
   echo $R2_BUCKET_NAME
   echo $R2_ACCESS_KEY_ID  # Should not be empty
   ```

2. **Verify bucket region from dashboard URL:**
   ```
   EU region: /r2/eu/buckets/
   Auto region: /r2/buckets/
   ```

3. **Test connection with a simple API call:**
   ```typescript
   import { HeadBucketCommand } from '@aws-sdk/client-s3';
   
   try {
     await r2Client.send(new HeadBucketCommand({
       Bucket: R2_CONFIG.bucketName,
     }));
     console.log('✅ R2 connection successful');
   } catch (error) {
     console.log('❌ Connection failed:', error.message);
   }
   ```

---

### Q: My CORS configuration in the dashboard isn't working. Why?

**A:** Cloudflare R2 dashboard CORS configuration has limitations:

1. **Applies only to public URLs**, not API endpoints
2. **May not support all S3-compatible headers**
3. **Wildcard `*` doesn't work in `AllowedHeaders`**
4. **Propagation delays** can take several minutes

**Better approach:**
- Use server-side uploads to avoid CORS entirely
- If you must use client-side uploads, configure CORS via R2 API programmatically

### Q: How do I configure CORS for R2 API endpoints if needed?

**A:** If you must use client-side uploads, configure CORS using Cloudflare CLI:

**Install Cloudflare CLI:**
```bash
npm install -g wrangler
```

**Configure CORS for your bucket:**
```bash
wrangler r2 bucket cors put ai-personal-document-bucket --rules '[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "Authorization", "x-amz-*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]'
```

**For your specific bucket (ai-personal-document-bucket):**
```bash
# Development CORS
wrangler r2 bucket cors put ai-personal-document-bucket --rules '[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT", "POST", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]'

# Production CORS (replace with your domain)
wrangler r2 bucket cors put ai-personal-document-bucket --rules '[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["PUT", "POST", "OPTIONS"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "x-amz-*"],
    "MaxAgeSeconds": 3600
  }
]'
```

**Verify CORS configuration:**
```bash
wrangler r2 bucket cors get ai-personal-document-bucket
```

---

## Our Solution: Server-Side Upload Flow

Instead of fighting CORS, we implemented:

```
Client → Server API → R2 Bucket → Public URL for access
```

**Implementation:**
1. Client sends file to `/api/upload/direct`
2. Server uploads to R2 using proper region endpoint
3. Server returns public URL for file access
4. No CORS configuration needed

**Benefits:**
- No CORS issues
- Better security
- Easier maintenance
- More reliable

---

## Key Takeaways

1. **Always check bucket region first** when getting "NoSuchBucket" errors
2. **Server-side uploads are more reliable** than client-side for R2
3. **CORS configuration in dashboard may not work** for presigned URLs
4. **Public URLs are for reading**, presigned URLs are for writing
5. **EU region buckets need `.eu.` in the endpoint URL**

---

## Quick Debug Commands

```bash
# Test CORS on public URL (should work)
curl -X OPTIONS "https://pub-xxx.r2.dev/test" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT"

# Test CORS on R2 API (likely won't work)
curl -X OPTIONS "https://account.r2.cloudflarestorage.com/bucket/test" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT"

# Verify bucket exists and region
# Check your dashboard URL for the region indicator
```