# R2 CORS Configuration Guide

## Overview
This document explains the CORS configuration required for direct client uploads to Cloudflare R2 using presigned URLs.

## Required CORS Policy

The following CORS policy must be configured in your R2 bucket to allow direct client uploads:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Length",
      "Authorization",
      "x-amz-*",
      "x-amz-meta-*",
      "x-amz-content-sha256",
      "x-amz-date",
      "x-amz-security-token",
      "x-amz-user-agent",
      "x-amz-checksum-*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-meta-*",
      "x-amz-version-id"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

## Configuration Steps

1. **Access R2 Dashboard**
   - Go to Cloudflare Dashboard
   - Navigate to R2 → Your Bucket → Settings

2. **Update CORS Policy**
   - Under "CORS Policy", click "Edit"
   - Replace existing policy with the configuration above
   - Update `"https://your-production-domain.com"` with your actual domain

3. **Save and Wait**
   - Save the changes
   - Wait 30 seconds for propagation

## Key Configuration Details

### AllowedOrigins
- **Development**: `http://localhost:3000`
- **Production**: Your actual domain (e.g., `https://myapp.com`)
- **Important**: No trailing slashes or paths

### AllowedMethods
- **PUT**: Required for file uploads via presigned URLs
- **GET**: Required for file downloads
- **POST/DELETE**: Optional, for future operations

### AllowedHeaders
- **x-amz-***: All AWS S3-compatible headers
- **x-amz-meta-***: Custom metadata headers
- **Content-Type**: Required for file uploads
- **Content-Length**: Required for file uploads

### ExposeHeaders
- **ETag**: File integrity verification
- **x-amz-meta-***: Access to custom metadata
- **x-amz-version-id**: Version information

## Common Issues and Solutions

### 1. CORS Error (Status 0)
**Problem**: Direct uploads fail with CORS error
**Solution**: 
- Verify CORS policy includes `PUT` method
- Ensure all `x-amz-*` headers are allowed
- Check origin matches exactly (no trailing slash)

### 2. Preflight Request Failure
**Problem**: OPTIONS request fails
**Solution**:
- Verify `AllowedMethods` includes the request method
- Check `AllowedHeaders` includes all request headers
- Ensure `AllowedOrigins` matches the requesting origin

### 3. Missing Headers
**Problem**: Custom headers not accessible in JavaScript
**Solution**:
- Add required headers to `ExposeHeaders`
- Ensure headers are in `AllowedHeaders`

## Testing CORS Configuration

### Manual Testing
1. Open browser dev tools → Network tab
2. Try uploading a file from your app
3. Check OPTIONS preflight request (should return 200)
4. Check PUT request (should return 200)
5. Verify no CORS errors in console

### Automated Testing
```bash
# Test preflight request
curl -X OPTIONS "https://your-bucket.r2.cloudflarestorage.com/test" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type,x-amz-meta-userid"
```

Should return CORS headers in response.

## Deployment Checklist

### Development Environment
- [ ] CORS policy includes `http://localhost:3000`
- [ ] All required methods and headers configured
- [ ] Test upload works without CORS errors

### Production Environment
- [ ] CORS policy includes production domain
- [ ] SSL certificate is valid
- [ ] Domain matches exactly (no www mismatch)
- [ ] Test upload works from production

## Security Considerations

1. **Origin Validation**: Only include trusted domains in `AllowedOrigins`
2. **Method Restrictions**: Only allow necessary HTTP methods
3. **Header Limitations**: Only expose required headers
4. **Cache Control**: Set appropriate `MaxAgeSeconds` for caching

## Error Handling

The application includes specific error handling for CORS issues:

- **Status 0**: Indicates CORS blocking
- **Specific Error Messages**: User-friendly error messages
- **Retry Logic**: Automatic retry for transient errors
- **Logging**: Detailed error logging for debugging

## Related Files

- `/src/hooks/useFileUpload.ts` - Main upload logic
- `/src/lib/upload-retry.ts` - Retry and error handling
- `/src/app/api/upload/presigned-url/route.ts` - Presigned URL generation

## Support

For CORS-related issues:
1. Check browser console for specific error messages
2. Verify network tab shows OPTIONS and PUT requests
3. Confirm CORS policy matches requirements exactly
4. Test with different browsers if needed