# AI Personal Document Parser

A modern, secure web application that uses AI to extract and manage information from personal documents like passports and driver's licenses. Built with Next.js 15, Clerk authentication, Cloudflare R2 storage, and multiple AI providers.

## 🚀 Features

- **📱 Mobile-First Camera Capture** - Optimized document photography with quality validation
- **🤖 Multi-Provider AI Extraction** - Support for Gemini, OpenAI, and OpenRouter APIs
- **🔐 Secure Authentication** - Clerk.io integration with webhook synchronization
- **☁️ Cloud Storage** - Cloudflare R2 for secure, scalable file storage
- **📊 Smart Data Management** - Dual-model verification and manual correction capabilities
- **⏰ Automatic Retention** - Configurable document retention and cleanup policies
- **🛡️ Production Security** - Comprehensive input validation, rate limiting, and error handling

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Authentication**: Clerk.io with webhook integration
- **Database**: Neon (PostgreSQL) with Prisma ORM
- **Storage**: Cloudflare R2 (S3-compatible)
- **AI Providers**: Google Gemini, OpenAI, OpenRouter
- **Deployment**: Vercel

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (protected)/        # Authentication-protected routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── camera/           # Camera capture components
│   ├── upload/           # File upload components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── ai/              # AI provider adapters
│   ├── database/        # Database utilities
│   ├── security/        # Security utilities
│   └── validations/     # Zod validation schemas
└── types/               # TypeScript type definitions
```

## 🛠️ Setup & Development

### Prerequisites
- Node.js 18+ and npm
- Neon PostgreSQL database
- Cloudflare R2 storage account
- Clerk.io authentication account
- AI provider API keys (Gemini, OpenAI, etc.)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd ai-personal-document-parser
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="your_neon_database_url"
   
   # Authentication (Clerk.io)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   CLERK_SECRET_KEY="your_clerk_secret_key"
   CLERK_WEBHOOK_SECRET="your_clerk_webhook_secret"
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
   
   # AI Models
   GEMINI_API_KEY="your_gemini_api_key"
   OPENAI_API_KEY="your_openai_api_key"
   OPENROUTER_API_KEY="your_openrouter_api_key"
   
   # Storage (Cloudflare R2)
   R2_ACCOUNT_ID="your_r2_account_id"
   R2_ACCESS_KEY_ID="your_r2_access_key"
   R2_SECRET_ACCESS_KEY="your_r2_secret_key"
   R2_BUCKET_NAME="your_bucket_name"
   R2_PUBLIC_URL="https://your_custom_domain.com"
   
   # App Configuration
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   CRON_SECRET="your_random_cron_secret_here"
   ```

3. **Database Setup:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Development Server:**
   ```bash
   npm run dev
   ```

### Testing R2 Connection
Visit `/api/test/r2-connection` after setup to verify your Cloudflare R2 configuration.

## 📋 Implementation Phases

This project is designed for step-by-step implementation across 7 phases:

### Phase 1: Project Foundation
- Next.js 15 setup with App Router
- TypeScript configuration
- Environment variable setup
- Security patterns and input validation

### Phase 2: Database Schema & Setup
- Prisma ORM configuration
- Neon PostgreSQL integration
- Complete database schema design
- Utility functions for data operations

### Phase 3: Authentication Integration
- Clerk.io setup and configuration
- Webhook implementation for user synchronization
- Protected route middleware
- User session management

### Phase 4: Camera & Image Capture
- Mobile-first camera interface
- HTML5 input capture and getUserMedia API
- Image compression and quality validation
- Front/back document capture workflow

### Phase 5: File Upload & Storage
- Cloudflare R2 integration with proper authentication
- Presigned URL generation for secure uploads
- Client-side image compression
- Automatic cleanup and retention policies

### Phase 6: AI Integration & Document Processing
- Multi-provider AI adapter pattern (Gemini, OpenAI, OpenRouter)
- Comprehensive error handling and retry mechanisms
- Rate limiting and quota management
- Dual-model verification system

### Phase 7: Results Display & Management
- Document results viewing and editing interface
- Search and filter functionality
- Export capabilities
- Document management dashboard

## 🔒 Security Features

- **Input Validation**: Zod schemas for all API inputs
- **Authentication**: Clerk.io with secure webhook integration
- **File Security**: Type validation, size limits, sanitization
- **Rate Limiting**: Protection against API abuse
- **Security Headers**: XSS, CSRF, and content type protection
- **Data Retention**: Automatic cleanup of expired documents

## 🚦 API Endpoints

### Documents
- `POST /api/documents` - Create new document entry
- `GET /api/documents/[id]` - Get document details
- `PATCH /api/documents/[id]` - Update document
- `DELETE /api/documents/[id]` - Delete document
- `POST /api/documents/[id]/process` - Process document with AI
- `GET /api/documents/[id]/status` - Get processing status
- `PATCH /api/documents/[id]/retention` - Update retention settings

### File Upload
- `POST /api/upload/presigned-url` - Generate presigned upload URL
- `POST /api/upload/complete` - Complete upload process

### Maintenance
- `POST /api/cleanup/orphaned-files` - Clean up orphaned files
- `POST /api/admin/retention` - Run retention cleanup
- `GET /api/cron/cleanup` - Automated cleanup (cron job)

### Testing
- `GET /api/test/r2-connection` - Test R2 connectivity

## 📊 Database Schema

### Core Models
- **User**: Clerk.io user synchronization
- **Document**: Document metadata and status
- **DocumentFile**: File storage references
- **Extraction**: AI-extracted data with verification
- **ProcessingError**: Error tracking and resolution

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npx prisma migrate dev    # Run database migrations
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open Prisma Studio

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Setup
- **Development**: Uses development database and storage buckets
- **Production**: Uses production credentials and optimized settings

## 📖 Documentation

Detailed implementation documentation is available in:
- `scope.md` - Project overview and requirements
- `phase-1.md` through `phase-7.md` - Step-by-step implementation guides

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the phase-by-phase implementation guide
4. Ensure all tests pass and security checks are satisfied
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For implementation help:
1. Review the detailed phase documentation
2. Check the troubleshooting sections in each phase
3. Use the built-in testing APIs for debugging
4. Verify environment variable configuration

---

**Built with ❤️ using Next.js 15, Clerk.io, Cloudflare R2, and AI**