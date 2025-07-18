Perfect! Thanks for the clarifications. Based on your answers, I can now create a detailed implementation plan for Phase 2. Let me break this down into clear, actionable tasks.

## Phase 2: Database Schema & Setup - Detailed Implementation Plan

### **Prerequisites Check:**
- Phase 1 completed (Next.js project setup, environment variables configured)
- Neon database instance created and connection string available
- Basic project structure in place

### **Task 1: Research Clerk.io Database Integration**
**Goal**: Understand how Clerk handles user data and determine what we need to store locally

**Steps**:
1. Research Clerk.io documentation for:
   - User data structure and available fields
   - How to sync user data with external databases
   - Whether Clerk user IDs can be used as primary keys
   - What user data Clerk stores vs. what we need to store locally
   - Best practices for user data synchronization
2. Document findings in a simple markdown file
3. Decide on user table structure based on research

**Expected Outcome**: Clear understanding of Clerk integration and user table design

---

### **Task 2: Install and Configure Prisma**
**Goal**: Set up Prisma ORM for database operations

**Steps**:
1. Install Prisma dependencies:
   ```bash
   npm install prisma @prisma/client
   npm install -D prisma
   ```
2. Initialize Prisma: `npx prisma init`
3. Configure `prisma/schema.prisma`:
   - Set PostgreSQL as database provider
   - Configure Neon connection string from environment variables
4. Create basic Prisma configuration in `lib/prisma.ts`
5. Test database connection with a simple query

**Expected Outcome**: Prisma is installed and can connect to Neon database

---

### **Task 3: Design Core Database Schema**
**Goal**: Create the main database tables structure

**Complete Prisma Schema Design**:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  clerkId     String   @unique
  email       String   @unique
  name        String?
  imageUrl    String?
  preferences Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  documents     Document[]
  documentFiles DocumentFile[]
  
  @@map("users")
}

model Document {
  id            String    @id @default(cuid())
  userId        String
  documentType  String    // "driving_license", "passport", etc.
  status        String    @default("processing") // "processing", "completed", "failed"
  retentionDays Int?      // null = keep forever, number = days to keep
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // soft delete for retention logic
  
  // Relations
  user          User            @relation(fields: [userId], references: [clerkId], onDelete: Cascade)
  files         DocumentFile[]
  extractions   Extraction[]
  errors        ProcessingError[]
  
  @@index([userId])
  @@index([createdAt])
  @@index([status])
  @@index([retentionDays])
  @@map("documents")
}

model DocumentFile {
  id               String   @id @default(cuid())
  documentId       String
  userId           String
  fileKey          String   @unique
  filePath         String
  fileType         String   // "front", "back"
  originalFileName String
  compressedSize   Int
  originalSize     Int
  mimeType         String
  uploadedAt       DateTime @default(now())
  
  // Relations
  document         Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user             User     @relation(fields: [userId], references: [clerkId], onDelete: Cascade)
  
  @@index([documentId])
  @@index([userId])
  @@index([uploadedAt])
  @@map("document_files")
}

model Extraction {
  id                   String   @id @default(cuid())
  documentId           String
  modelName            String   // "gemini-flash", "gpt-4o-mini", etc.
  extractionData       Json     // the actual extracted fields
  fieldsForReview      Json?    // array of field names that need review
  confidenceScore      Float?
  processingTimeMs     Int?
  isManuallyCorrected  Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  // Relations
  document             Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@index([documentId])
  @@map("extractions")
}

model ProcessingError {
  id           String    @id @default(cuid())
  documentId   String?
  errorType    String    // "image_upload", "ai_processing", "validation", etc.
  errorMessage String
  errorDetails Json?
  stepFailed   String
  retryCount   Int       @default(0)
  resolved     Boolean   @default(false)
  createdAt    DateTime  @default(now())
  
  // Relations
  document     Document? @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@index([documentId])
  @@index([resolved])
  @@map("processing_errors")
}
```

**Steps**:
1. Create the complete schema in `prisma/schema.prisma` (as shown above)
2. Verify all indexes are properly defined for performance:
   - `documents.userId`
   - `documents.createdAt`
   - `documents.status`
   - `documents.retentionDays`
   - `document_files.documentId`
   - `document_files.userId`
   - `extractions.documentId`
   - `processing_errors.documentId`
3. Verify foreign key relationships and cascade deletes are correct
4. Generate Prisma client: `npx prisma generate`

**Expected Outcome**: Complete database schema defined in Prisma

---

### **Task 4: Create and Run Database Migrations**
**Goal**: Apply the schema to the actual database

**Steps**:
1. Create initial migration: `npx prisma migrate dev --name init`
2. Verify migration ran successfully in Neon console
3. Test that all tables were created correctly
4. Run `npx prisma generate` to update the client
5. Create a simple test script to verify database operations work

**Expected Outcome**: Database tables exist in Neon with correct structure

---

### **Task 5: Create Database Utility Functions**
**Goal**: Build reusable database operations for the application

**Create these utility files**:

**`lib/database/users.ts`**:
- `createUser(clerkId: string, email: string, name?: string, imageUrl?: string)`
- `getUserByClerkId(clerkId: string)`
- `updateUserPreferences(clerkId: string, preferences: object)`
- `deleteUser(clerkId: string)`

**`lib/database/documents.ts`**:
- `createDocument(userId: string, documentType: string, retentionDays?: number)`
- `getDocumentById(id: string)`
- `getUserDocuments(userId: string, limit?: number)`
- `updateDocumentStatus(id: string, status: string)`
- `updateDocumentRetention(id: string, retentionDays: number)`
- `getDocumentsForDeletion()` // for cron job based on retentionDays
- `softDeleteDocument(id: string)`

**`lib/database/document-files.ts`**:
- `createDocumentFile(documentId: string, userId: string, fileKey: string, filePath: string, fileType: string, originalFileName: string, compressedSize: number, originalSize: number, mimeType: string)`
- `getDocumentFiles(documentId: string)`
- `getDocumentFile(fileKey: string)`
- `deleteDocumentFile(fileKey: string)`
- `getOrphanedFiles(olderThan: Date)`

**`lib/database/extractions.ts`**:
- `createExtraction(documentId: string, modelName: string, extractionData: object, fieldsForReview?: string[], confidenceScore?: number, processingTimeMs?: number)`
- `getExtractionsByDocument(documentId: string)`
- `getLatestExtraction(documentId: string)`
- `updateExtractionData(id: string, extractionData: object, isManuallyCorrected: boolean)`
- `updateFieldsForReview(id: string, fieldsForReview: string[])`

**`lib/database/errors.ts`**:
- `logError(documentId: string | null, errorType: string, errorMessage: string, stepFailed: string, errorDetails?: object)`
- `getErrorsByDocument(documentId: string)`
- `markErrorResolved(id: string)`
- `getUnresolvedErrors()`
- `incrementRetryCount(id: string)`

**Steps**:
1. Create each utility file with proper TypeScript types
2. Add error handling for database operations
3. Create simple test functions to verify each utility works
4. Add proper JSDoc comments for each function

**Expected Outcome**: Complete set of database utilities ready for use

---

### **Task 6: Create Database Seeding (Optional)**
**Goal**: Add test data for development

**Steps**:
1. Create `prisma/seed.ts` with sample data:
   - Test users
   - Sample documents
   - Mock extractions
   - Sample error records
2. Update `package.json` with seed script
3. Run seeding: `npx prisma db seed`
4. Verify seed data appears in database

**Expected Outcome**: Database contains test data for development

---

### **Task 7: Set Up Database Connection Management**
**Goal**: Ensure proper database connection handling

**Create `lib/prisma.ts`**:
- Implement proper Prisma client singleton
- Add connection pooling configuration
- Handle connection errors gracefully
- Add database health check function

**Steps**:
1. Create the Prisma client wrapper
2. Add environment-specific configurations
3. Create a health check API route: `app/api/health/db/route.ts`
4. Test connection under load

**Expected Outcome**: Stable database connection management

---

### **Task 8: Testing and Validation**
**Goal**: Ensure all database operations work correctly

**Steps**:
1. Create test API routes for each database operation
2. Test all CRUD operations for each table
3. Test foreign key relationships work correctly
4. Test error handling for invalid data
5. Verify database constraints are enforced
6. Test connection recovery after network issues

**Expected Outcome**: All database operations tested and working

---

### **Success Criteria for Phase 2 Completion:**
- [ ] Database schema is finalized and migrated to Neon
- [ ] Prisma client generates without errors
- [ ] All database utility functions work correctly
- [ ] Can perform basic CRUD operations on all tables
- [ ] Connection to Neon is stable and properly managed
- [ ] Error handling is in place for database operations
- [ ] Database health check passes
- [ ] Ready to integrate with authentication in Phase 3

### **Time Estimate**: 3-4 days for a junior developer

### **Potential Issues to Watch For**:
1. Neon connection string configuration
2. Prisma client generation errors
3. Database permission issues
4. Foreign key constraint violations
5. JSON field handling in PostgreSQL

Does this detailed plan look good to you? Should I add more detail to any specific task or modify the database schema design?