# Project Documentation Review: Troubleshooting Guide

## Overview

This document summarizes the comprehensive review conducted on the AI Personal Document Parser MVP project documentation and the critical issues that were identified and resolved.

## 🚨 Critical Issues Found & Fixed

### 1. Database Schema Conflicts

**Problem**: Multiple phases had conflicting database schema definitions, causing integration failures.

**Symptoms**:
- Phase 2 defined `users.id` as primary key, but Phase 3 used `users.clerkId`
- Phase 5 referenced `DocumentFile` model not defined in Phase 2
- Inconsistent field naming (`clerk_user_id` vs `clerkId`)
- Missing relationships between models

**Root Cause**: Schema was defined piecemeal across phases without central coordination.

**Solution Applied**:
- ✅ Consolidated complete Prisma schema in Phase 2
- ✅ Used `clerkId` as consistent user reference field
- ✅ Added missing `DocumentFile` model with proper relationships
- ✅ Implemented proper indexing strategy for performance
- ✅ Added cascade delete behavior for data integrity

**Prevention**: Always define complete database schema in one phase before referencing it in others.

---

### 2. Missing Dependencies

**Problem**: Dependencies were scattered across phases, causing build failures when following implementation order.

**Symptoms**:
- Build errors when starting later phases
- Missing TypeScript types for imported packages
- Runtime errors for undefined modules

**Root Cause**: Dependencies were installed "just-in-time" rather than upfront.

**Solution Applied**:
- ✅ Added comprehensive dependency list to Phase 1
- ✅ Included all packages needed across all phases:
  - `svix` for Clerk webhooks
  - `nanoid` for ID generation
  - `sonner` for toast notifications
  - `zod` for input validation
  - All AI SDK packages
  - R2/S3 SDK packages

**Prevention**: Install all project dependencies in the foundation phase.

---

### 3. Phase Integration Gaps

**Problem**: Phases were designed in isolation without clear integration points.

**Symptoms**:
- Phase 4 (Camera) didn't connect to Phase 5 (Upload)
- No database entry creation during document capture
- Missing authentication integration in camera flow

**Root Cause**: Each phase was written independently without considering handoff requirements.

**Solution Applied**:
- ✅ Added comprehensive integration section to Phase 4
- ✅ Created `captureAndUpload` function bridging camera to upload
- ✅ Added document database entry creation during capture
- ✅ Integrated authentication checks in camera components
- ✅ Updated Phase 5 with integration references

**Prevention**: Define integration points and data flow between phases upfront.

---

### 4. Incomplete AI Integration

**Problem**: Phase 6 only covered basic AI setup without production-ready features.

**Symptoms**:
- No error handling for AI API failures
- Missing rate limiting and quota management
- Incomplete dual-model verification logic
- No retry mechanisms for failed extractions

**Root Cause**: Focus on basic functionality without production considerations.

**Solution Applied**:
- ✅ Added comprehensive error handling with specific error types
- ✅ Implemented retry logic with exponential backoff
- ✅ Created rate limiting system with provider-specific limits
- ✅ Added monitoring and logging capabilities
- ✅ Built robust API endpoints with proper validation
- ✅ Completed dual-model verification with conflict resolution

**Prevention**: Plan for production requirements from the beginning.

---

### 5. Cloudflare R2 Configuration Issues

**Problem**: Multiple R2 configuration issues including authentication, CORS, and regional endpoints.

**Symptoms**:
- `SignatureDoesNotMatch` errors
- `NoSuchBucket` errors despite bucket existing
- `InvalidAccessKeyId` errors  
- CORS errors on direct uploads
- Images loading as "undefined.r2.cloudflarestorage.com/undefined/..."
- Upload failures to R2 buckets

**Root Causes**: 
1. **Regional Endpoint Mismatch**: EU buckets need `.eu.` in endpoint
2. **CORS Complexity**: Dashboard CORS ≠ API endpoint CORS
3. **Environment Variable Issues**: Missing `NEXT_PUBLIC_` prefixes
4. **Authentication Method**: Older docs mentioned SHA-256 hashing (no longer needed)

**Solution Applied**:
- ✅ Added regional endpoint detection based on bucket region
- ✅ Implemented server-side upload flow to bypass CORS entirely
- ✅ Added dual environment variables (server + client-side)
- ✅ Created comprehensive CORS troubleshooting guide
- ✅ Added connection testing and debugging tools
- ✅ Created specific error handling for all R2 error types
- ✅ Added Wrangler CLI instructions for API CORS configuration
- ✅ Added performance optimizations (multipart upload)

**Prevention**: 
1. Always check bucket region in dashboard URL first
2. Use server-side uploads for production reliability
3. Set up both server and client environment variables from start
4. Follow latest Cloudflare R2 documentation, not outdated guides

---

### 6. Missing Production Features

**Problem**: Several production-critical features were not implemented.

**Missing Features**:
- Document retention and automatic cleanup
- Input validation and security layers
- Error tracking and monitoring
- Performance optimization

**Solution Applied**:
- ✅ Implemented complete document retention system
- ✅ Added automatic cleanup with cron jobs
- ✅ Created input validation schemas using Zod
- ✅ Added security headers and sanitization
- ✅ Implemented rate limiting utilities
- ✅ Added performance monitoring hooks

**Prevention**: Include production requirements in initial planning.

---

## 🔧 Troubleshooting Common Issues

### Database Connection Issues

**Q**: Getting "relation does not exist" errors?
**A**: Run database migrations after updating schema:
```bash
npx prisma migrate dev --name your_migration_name
npx prisma generate
```

### R2 Upload Failures

**Q**: Getting "NoSuchBucket" error (most common)?
**A**: 99% of the time this is a **region endpoint mismatch**:
1. Check your R2 dashboard URL:
   - EU region: `/r2/eu/buckets/` → use `.eu.r2.cloudflarestorage.com` 
   - Auto region: `/r2/buckets/` → use `.r2.cloudflarestorage.com`
2. Update your endpoint configuration accordingly
3. Verify bucket exists and API token has access

**Q**: Getting "SignatureDoesNotMatch" error?
**A**: This was historically caused by missing SHA-256 hashing, but modern AWS SDK handles this automatically. Check:
1. Correct access key and secret key
2. Proper endpoint URL (region-specific)
3. Valid API token permissions

**Q**: Getting CORS errors on direct uploads?
**A**: Dashboard CORS ≠ API CORS. Solutions:
1. **Recommended**: Use server-side uploads to bypass CORS entirely
2. **If needed**: Configure API CORS via Wrangler CLI:
   ```bash
   wrangler r2 bucket cors put your-bucket --rules '[{"AllowedOrigins":["http://localhost:3000"],"AllowedMethods":["PUT","POST","OPTIONS"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]'
   ```

**Q**: Images showing "undefined" in URLs?
**A**: Missing client-side environment variables:
```bash
# Add to .env
NEXT_PUBLIC_R2_ACCOUNT_ID=your_account_id
NEXT_PUBLIC_R2_BUCKET_NAME=your_bucket_name
NEXT_PUBLIC_R2_PUBLIC_URL=your_public_url
```
Restart your dev server after adding these.

### Authentication Issues

**Q**: Middleware not protecting routes?
**A**: Check middleware matcher configuration:
```javascript
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Camera/Upload Integration

**Q**: Camera capture not triggering upload?
**A**: Ensure camera component uses integrated flow:
```typescript
const { captureAndUpload, uploadState } = useCamera();
```

### AI Processing Failures

**Q**: AI extraction failing with rate limits?
**A**: Check rate limiting configuration and implement retry logic:
```typescript
await withRetry(
  () => aiProvider.extractData(...),
  { maxRetries: 3, backoffFactor: 2 }
);
```

## 📋 Implementation Checklist

When implementing this project, ensure you complete these items in order:

### Phase 1: Foundation
- [ ] Install all dependencies from updated list
- [ ] Configure all environment variables
- [ ] Set up security headers and validation schemas
- [ ] Verify TypeScript compilation

### Phase 2: Database
- [ ] Use the complete Prisma schema provided
- [ ] Run migrations successfully
- [ ] Test all database utility functions
- [ ] Verify foreign key relationships work

### Phase 3: Authentication
- [ ] Install Clerk with webhook dependencies
- [ ] Configure middleware with correct matcher
- [ ] Test user creation and synchronization
- [ ] Verify protected routes work

### Phase 4: Camera & Integration
- [ ] Implement camera capture functionality
- [ ] Add integration with Phase 5 upload system
- [ ] Create document database entries during capture
- [ ] Test end-to-end camera → upload → database flow

### Phase 5: R2 Upload & Storage
- [ ] Configure R2 client with proper authentication
- [ ] Test R2 connection using debug utilities
- [ ] Implement presigned URL generation
- [ ] Add document retention system
- [ ] Test file upload end-to-end

### Phase 6: AI Integration
- [ ] Set up AI providers with error handling
- [ ] Implement rate limiting and retry logic
- [ ] Add monitoring and logging
- [ ] Test dual-model verification
- [ ] Handle all error scenarios

### Phase 7: Results Display
- [ ] Build document results interface
- [ ] Implement edit functionality
- [ ] Add export capabilities
- [ ] Test all user interactions

## 🚀 Success Metrics

Your implementation is successful when:

- [ ] All phases integrate seamlessly without gaps
- [ ] Database schema is consistent across all phases
- [ ] R2 uploads work without authentication errors
- [ ] AI processing handles errors gracefully
- [ ] Document retention system cleans up expired files
- [ ] All user flows work end-to-end
- [ ] Security validations prevent malicious input
- [ ] Performance is acceptable on mobile devices

## 📞 Getting Help

If you encounter issues not covered in this guide:

1. Check the specific phase documentation for detailed implementation steps
2. Use the debugging utilities provided (R2 connection test, etc.)
3. Verify environment variables are correctly set
4. Check console/logs for specific error messages
5. Ensure all dependencies are installed and up-to-date

## 🔧 R2-Specific Debug Commands

### Quick Diagnostics
```bash
# Check environment variables are loaded
echo "Account ID: $R2_ACCOUNT_ID"
echo "Bucket: $R2_BUCKET_NAME"
echo "Public vars: $NEXT_PUBLIC_R2_ACCOUNT_ID"

# Test bucket region (check dashboard URL)
# EU: https://dash.cloudflare.com/.../r2/eu/buckets/...
# Auto: https://dash.cloudflare.com/.../r2/buckets/...
```

### CORS Testing
```bash
# Test public URL CORS (should work)
curl -X OPTIONS "https://pub-xxx.r2.dev/test" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT"

# Test API CORS (likely won't work without Wrangler config)
curl -X OPTIONS "https://account.r2.cloudflarestorage.com/bucket/test" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT"
```

### Wrangler CLI Setup
```bash
# Install and authenticate
npm install -g wrangler
wrangler auth login

# Check current CORS
wrangler r2 bucket cors get your-bucket-name

# Set CORS for API endpoints
wrangler r2 bucket cors put your-bucket-name --rules '[{"AllowedOrigins":["http://localhost:3000"],"AllowedMethods":["PUT","POST","OPTIONS"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]'
```

## 📚 Additional Resources

### Official Documentation
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 CORS Configuration](https://developers.cloudflare.com/r2/buckets/cors/)
- [Wrangler CLI Guide](https://developers.cloudflare.com/workers/wrangler/)

### Project-Specific Guides
- [R2 CORS Configuration Guide](./r2-cors-configuration.md)
- [R2 Upload & CORS Troubleshooting](./troubleshooting-cors-uploads.md) 
- [R2 Environment Variables Guide](./r2-troubleshooting.md)
- [Complete R2 Integration How-to](./nextjs-r2-integration-guide.md)

### Other Resources
- [Clerk Authentication Guide](https://clerk.com/docs)
- [Prisma Database Toolkit](https://www.prisma.io/docs)
- [Next.js App Router Guide](https://nextjs.org/docs/app)

## 🎯 Key Takeaways from Real Implementation

### Most Common Issues (in order of frequency):
1. **Region endpoint mismatch** (90% of "NoSuchBucket" errors)
2. **Missing NEXT_PUBLIC_ environment variables** (client-side access)
3. **CORS complexity** (dashboard vs API endpoints)
4. **Environment variable caching** (not restarting dev server)
5. **Upload method choice** (client-side vs server-side)

### Production Recommendations:
✅ **Use server-side uploads** - more reliable than fighting CORS  
✅ **Check bucket region first** - saves hours of debugging  
✅ **Set up dual environment variables** - both server and client  
✅ **Implement retry logic** - handle transient failures gracefully  
✅ **Add comprehensive error handling** - specific messages for each error type  

### What Doesn't Work Well:
❌ **Dashboard CORS for presigned URLs** - limited and unreliable  
❌ **Client-side uploads in production** - too many edge cases  
❌ **Wildcard CORS headers** - not properly supported  
❌ **Assuming "auto" region** - many buckets are actually EU region  

---

*This troubleshooting guide was created as part of a comprehensive documentation review that identified and resolved 6 critical issues in the project architecture and implementation, with special focus on the numerous R2 configuration gotchas encountered during real implementation.*