# R2 Storage Troubleshooting

## Common Issues and Solutions

### Q: Images not loading with error "undefined.r2.cloudflarestorage.com/undefined/..."

**Problem:** Images fail to load and the URL shows `undefined.r2.cloudflarestorage.com/undefined/` indicating missing environment variables.

**Symptoms:**
- Console error: `GET https://undefined.r2.cloudflarestorage.com/undefined/user_*/document_*.blob net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
- Images appear as broken or show fallback placeholder

**Root Cause:** Missing `NEXT_PUBLIC_` prefixed environment variables for client-side access.

**Solution:** 
Add the following environment variables to your `.env` file:

```env
# Server-side variables
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-url.r2.dev

# Client-side accessible variables (NEXT_PUBLIC_ prefix required)
NEXT_PUBLIC_R2_ACCOUNT_ID=your_account_id
NEXT_PUBLIC_R2_BUCKET_NAME=your_bucket_name
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-public-url.r2.dev
```

**Important Notes:**
- Next.js requires `NEXT_PUBLIC_` prefix for environment variables accessed in browser/client components
- Server-side code can access regular environment variables without the prefix
- After adding variables, restart your development server

---

### Q: Why do I need both prefixed and non-prefixed environment variables?

**Answer:** 
- **Server-side code** (API routes, server components): Uses `process.env.R2_ACCOUNT_ID`
- **Client-side code** (React components, browser): Uses `process.env.NEXT_PUBLIC_R2_ACCOUNT_ID`

This separation ensures sensitive data stays on the server while allowing necessary public data to be accessible to the frontend.

---

### Q: Environment variables not updating after changes

**Problem:** Changes to `.env` file don't take effect.

**Solution:**
1. Restart your development server completely
2. Kill existing processes: `pkill -f "next dev"`
3. Start fresh: `npm run dev` or `pnpm dev`

---

### Q: How to verify R2 configuration is working

**Steps:**
1. Check environment variables are loaded: Add `console.log(process.env.NEXT_PUBLIC_R2_ACCOUNT_ID)` in a client component
2. Verify URLs are constructed correctly in browser network tab
3. Test image loading in browser developer tools

---

### Q: Images still not loading after fixing environment variables

**Potential Issues:**
1. **CORS Configuration:** Ensure your R2 bucket allows requests from your domain
2. **Public Access:** Verify bucket has appropriate public read permissions
3. **File Paths:** Check that file keys match exactly what's stored in R2
4. **Network Issues:** Test direct R2 URLs in browser