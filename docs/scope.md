# Document Transcription MVP - Project Plan

## EXECUTIVE SUMMARY

**Problem Being Solved**: 
Manual data entry from personal documents (driving licenses, passports) is time-consuming and error-prone. Users need a quick, accurate way to digitize and extract information from their documents using AI.

**Solution**: 
A mobile-first Next.js web app that allows users to photograph their documents and automatically extract key information using AI models. The system provides optional dual-model verification for higher accuracy and flexible document retention policies.

**Target User**: 
Anyone who needs to quickly digitize personal documents for form filling, record keeping, or data entry purposes.

**Core Value Proposition**: 
- Instant document digitization via phone camera
- AI-powered information extraction
- Optional dual-model verification for accuracy
- Flexible storage options
- Open-source with bring-your-own-keys principle

## MAIN GOAL
Build a functional MVP that can successfully extract text from driving licenses and passports using AI, with a focus on accuracy and user experience. The app should be production-ready for public deployment on Vercel.

## TECH STACK
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Authentication**: Clerk.io
- **Database**: Neon PostgreSQL with Prisma ORM
- **Storage**: Cloudflare R2
- **AI Models**: Gemini Flash (primary), GPT-4o mini (optional verification)
- **Deployment**: Vercel
- **Image Processing**: Browser native APIs, compression libraries

## SUCCESS METRICS
- **Technical**: App deploys successfully, all core features work end-to-end
- **User Experience**: User can capture, process, and view extracted document data in under 2 minutes
- **Accuracy**: AI extraction works reliably for common document types
- **Performance**: Image processing completes within 30 seconds

## USER FLOW
1. **Authentication**: User signs up/logs in via Clerk
2. **Document Capture**: User selects "New Document" → Camera opens
3. **Photo Taking**: User photographs document front → System checks image quality → User confirms or retakes
4. **Back Side Prompt**: System asks if document has important info on back → User photographs back side (if needed)
5. **Processing**: AI processes images and extracts information → Optional second model verification
6. **Results Review**: User reviews extracted data → Can manually correct any errors
7. **Storage Decision**: User chooses retention period (delete now, keep for X days, keep forever)
8. **Completion**: Document saved to user's history with extraction results

## MAIN SCREENS
1. **Landing/Auth Screen**: Welcome + Sign in with Clerk
2. **Dashboard**: List of processed documents + "New Document" button
3. **Camera Capture Screen**: Live camera feed with capture button and quality indicators
4. **Image Review Screen**: Captured image with "Retake" or "Process" options
5. **Processing Screen**: Loading state with progress indicator
6. **Results Screen**: Extracted information in editable form fields
7. **Storage Options Screen**: Retention period selection
8. **Settings Screen**: API keys configuration, app preferences
9. **Document History Screen**: Previously processed documents with search/filter

---

## DETAILED PHASES

### **Phase 1: Project Foundation & Setup**
**GOAL**: Establish a solid foundation with proper project structure, environment configuration, and deployment pipeline.

**WHAT NEEDS TO BE DONE**:
- Initialize Next.js 15 project with App Router
- Set up TypeScript configuration
- Configure Tailwind CSS
- Set up environment variables for API keys (Gemini, OpenAI, Clerk, Neon, Cloudflare R2)
- Create basic project structure (components, lib, utils folders)
- Set up Vercel deployment pipeline
- Create basic README with setup instructions

**MAIN TECH USED**: Next.js 15, TypeScript, Tailwind CSS, Vercel

**SUCCESS METRICS**: 
- Project builds without errors
- Deploys successfully to Vercel
- Environment variables properly configured
- Basic routing works

**MOVE TO NEXT PHASE WHEN**: 
- App deploys to Vercel successfully
- All environment variables are set up
- Basic file structure is in place
- TypeScript compilation works

---

### **Phase 2: Database Schema & Setup**
**GOAL**: Design and implement database schema that supports document storage, user data, extraction results, and error tracking.

**WHAT NEEDS TO BE DONE**:
- Set up Neon database connection
- Install and configure Prisma ORM
- Design database schema:
  - Users table (linked to Clerk)
  - Documents table (metadata, file paths, retention settings)
  - Extractions table (AI results, field mappings)
  - Processing_errors table (failure tracking)
- Create Prisma migrations
- Set up database seeding (optional)
- Create basic database utility functions

**MAIN TECH USED**: Neon PostgreSQL, Prisma ORM

**SUCCESS METRICS**:
- Database connection established
- All tables created successfully
- Prisma client generates without errors
- Can perform basic CRUD operations

**MOVE TO NEXT PHASE WHEN**:
- Database schema is finalized and migrated
- Prisma client is working
- Basic database queries work
- Connection to Neon is stable

---

### **Phase 3: Authentication Integration**
**GOAL**: Implement user authentication and session management that works seamlessly with Next.js 15 App Router.

**WHAT NEEDS TO BE DONE**:
- Install and configure Clerk.io
- Set up Clerk middleware for App Router
- Create authentication components (SignIn, SignUp, UserButton)
- Implement protected routes
- Set up user session management
- Create auth utilities and hooks
- Update database schema to sync with Clerk users
- Set up user profile management

**MAIN TECH USED**: Clerk.io, Next.js middleware, React hooks

**SUCCESS METRICS**:
- Users can sign up and sign in successfully
- Protected routes work properly
- User sessions persist across page refreshes
- User data syncs with database

**MOVE TO NEXT PHASE WHEN**:
- Authentication flow is fully functional
- Protected routes are working
- User sessions are properly managed
- Database user sync is working

---

### **Phase 4: Camera & Image Capture**
**GOAL**: Build a mobile-first camera interface that captures high-quality images suitable for AI processing.

**WHAT NEEDS TO BE DONE**:
- Implement camera access using getUserMedia API
- Create mobile-responsive camera interface
- Build image quality validation (blur detection)
- Implement front/back document capture flow
- Add image compression before upload
- Create capture confirmation screens
- Handle camera permissions and errors
- Add image preview and retake functionality

**MAIN TECH USED**: Browser Camera API, Canvas API, JavaScript image compression

**SUCCESS METRICS**:
- Camera opens successfully on mobile devices
- Can capture and compress images
- Image quality validation works
- User can retake photos if needed

**MOVE TO NEXT PHASE WHEN**:
- Camera interface works on mobile
- Image capture and compression functional
- Quality validation is working
- User can capture both document sides

---

### **Phase 5: File Upload & Storage**
**GOAL**: Implement secure file upload pipeline from frontend to Cloudflare R2 storage.

**WHAT NEEDS TO BE DONE**:
- Set up Cloudflare R2 bucket and credentials
- Create API routes for file upload
- Implement secure file upload (presigned URLs or direct upload)
- Handle base64 to blob conversion
- Create file deletion functionality
- Implement file size limits and validation
- Add upload progress indicators
- Handle upload errors and retries

**MAIN TECH USED**: Cloudflare R2, Next.js API routes, File API

**SUCCESS METRICS**:
- Images upload successfully to R2
- File URLs are accessible
- Upload progress is shown to user
- Error handling works properly

**MOVE TO NEXT PHASE WHEN**:
- File upload pipeline is working
- Images are stored in R2 successfully
- File URLs are generated properly
- Upload error handling is functional

---

### **Phase 6: AI Integration & Document Processing**
**GOAL**: Integrate AI models to extract structured data from document images with high accuracy.

**WHAT NEEDS TO BE DONE**:
- Set up Gemini Flash API integration
- Create document type detection logic
- Implement field extraction prompts
- Build structured data parsing
- Add GPT-4o mini as optional second model
- Create field comparison logic for dual verification
- Implement retry mechanisms for failed extractions
- Add extraction result validation
- Store extraction results in database

**MAIN TECH USED**: Gemini Flash API, OpenAI GPT-4o mini or even nano (IDK if it supports multi modal inputs for images), lets make it flexible to add more models and spap it easily for different ones (like chinese ones, TENCENT, ideally via OperRouter API) API integration

**SUCCESS METRICS**:
- AI can identify document types correctly
- Key fields are extracted accurately (>80% success rate)
- Dual model verification works when enabled
- Extraction results are stored properly

**MOVE TO NEXT PHASE WHEN**:
- AI extraction is working reliably
- Dual model verification is functional
- Extraction results are properly structured
- Error handling for AI failures is in place

---

### **Phase 7: Results Display & Management**
**GOAL**: Create intuitive interfaces for users to review, edit, and manage extracted document data.

**WHAT NEEDS TO BE DONE**:
- Build extraction results display UI
- Create editable form fields for corrections
- Implement document retention settings
- Add document history/dashboard
- Create search and filter functionality
- Build document deletion workflow
- Add export functionality (JSON, CSV)
- Implement data correction tracking

**MAIN TECH USED**: React forms, Next.js components, UI libraries

**SUCCESS METRICS**:
- Users can view and edit extraction results
- Document retention settings work properly
- Document history is accessible and searchable
- Data export functions correctly

**MOVE TO NEXT PHASE WHEN**:
- Results display is user-friendly
- Edit functionality works properly
- Document management is complete
- History and search are functional

---

### **Phase 8: Polish & Error Handling**
**GOAL**: Refine the user experience with comprehensive error handling, loading states, and configuration options.

**WHAT NEEDS TO BE DONE**:
- Create comprehensive error pages and messages
- Add loading states for all async operations
- Build settings page for API key configuration
- Implement proper error logging and tracking
- Add user feedback mechanisms
- Create help documentation
- Optimize performance and bundle size
- Add accessibility features
- Implement rate limiting
- Final testing and bug fixes

**MAIN TECH USED**: React error boundaries, loading states, performance optimization

**SUCCESS METRICS**:
- All error cases are handled gracefully
- Loading states provide clear feedback
- Settings page is fully functional
- App performance is optimized

**MOVE TO NEXT PHASE WHEN**:
- All major bugs are fixed
- Error handling is comprehensive
- Performance is acceptable
- App is ready for production use