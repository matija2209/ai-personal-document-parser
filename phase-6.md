Excellent. Thank you for the clarifications. Your decisions are perfectly aligned with building a robust and scalable MVP.

Based on your feedback and further research into the best practices for multimodal API calls, here is the updated, extremely detailed plan for **Phase 6: AI Integration & Document Processing**.

### **Technical Research Summary & Key Decisions**

1.  **Image Handling:** My research confirms that all three target providers (Gemini, OpenAI, and OpenRouter) support processing images by passing a publicly accessible URL. This is highly efficient for our architecture. Since images are already uploaded to Cloudflare R2 in Phase 5, our backend will simply pass the R2 image URL to the AI APIs, avoiding the need to download and re-upload image data.
2.  **API Key Management:** As confirmed, keys will be managed via environment variables (`.env.local` and `.env.example`). The backend will be built to consume these variables.
3.  **Dual-Model Logic:** The primary model will be Gemini. If dual verification is enabled, the secondary model will be GPT-4o mini. In case of a data mismatch, the Gemini data will be used to pre-fill the fields, and a list of the conflicting fields will be stored in the database to be highlighted in the UI.
4.  **Flexible Architecture:** We will use the **Adapter Pattern** to create a clean, unified interface. This ensures that adding OpenRouter (or any other provider) is a straightforward process of creating a new "adapter" without changing the core application logic.

---

### **Extremely Detailed To-Do List: Phase 6**

This plan is broken down into self-contained tasks that build upon each other.

#### **Task 6.1: Environment & SDK Setup**

**Goal:** Configure the project with the necessary API keys and software development kits (SDKs).

*   **To-Do:**
    1.  **Install SDKs:** In your terminal, install the official clients for Google and OpenAI.
        ```bash
        npm install @google/generative-ai openai
        ```    2.  **Update Environment Example File:** Add the required API key placeholders to your `.env.example` file. This is a reference for any developer setting up the project.
        ```ini
        # .env.example
        
        # ... other keys from previous phases
        
        # AI Provider Keys
        GOOGLE_GEMINI_API_KEY="Your Google AI Studio Gemini API Key"
        OPENAI_API_KEY="Your OpenAI Platform API Key"
        # Optional: For OpenRouter support
        OPENROUTER_API_KEY="Your OpenRouter API Key"
        ```
    3.  **Update Local Environment File:** Copy these new variables into your personal `.env.local` file and populate them with your actual secret keys.

---

#### **Task 6.2: Design the Core AI Service Abstraction**

**Goal:** Define a universal "contract" (an interface) that every AI provider must follow, making them interchangeable.

*   **To-Do:**
    1.  **Define Shared Types:** Create a new file at `lib/ai/types.ts`. This file will define the standard input and output structures for all our AI services.
        ```typescript
        // lib/ai/types.ts
        
        export type DocumentType = 'passport' | 'driving-license';
        
        // This is the clean, structured data we expect after processing
        export type ExtractedData = Record<string, string | number | null>;
        
        // This is the standard response format from ANY AI service we use
        export type AIProviderResponse = {
          success: boolean;
          data?: ExtractedData;
          provider: string; // e.g., 'gemini', 'openai'
          error?: string;
        };
        
        // This is the "contract" or interface our adapters must implement
        export interface IAIDocumentProcessor {
          extractDataFromDocument(
            imageUrl: string,
            documentType: DocumentType
          ): Promise<AIProviderResponse>;
        }
        ```
    2.  **Create Prompt Templates:** A good prompt is crucial for accuracy. Create a file `lib/ai/prompts.ts`.
        ```typescript
        // lib/ai/prompts.ts
        
        export const getPromptForDocument = (documentType: 'passport' | 'driving-license'): string => {
          const basePrompt = `You are an expert document data extraction AI. Analyze the image of the document provided. Extract the key information and return it ONLY as a valid JSON object. Do not include any other text or markdown formatting.`;
        
          if (documentType === 'passport') {
            return `${basePrompt} The required fields are: "firstName", "lastName", "documentNumber", "dateOfBirth", "expiryDate", "nationality".`;
          }
          if (documentType === 'driving-license') {
            return `${basePrompt} The required fields are: "firstName", "lastName", "documentNumber", "dateOfBirth", "expiryDate", "address", "vehicleClasses".`;
          }
          throw new Error("Invalid document type");
        };
        ```

---

#### **Task 6.3: Implement the AI Provider Adapters**

**Goal:** Create a separate class for each AI provider that implements the `IAIDocumentProcessor` interface.

*   **To-Do:**
    1.  **Gemini Adapter:** Create `lib/ai/gemini.adapter.ts`.
        *   Import `GoogleGenerativeAI`.
        *   Create a class `GeminiAdapter` that `implements IAIDocumentProcessor`.
        *   In the `extractDataFromDocument` method, use the Gemini SDK to call the `gemini-1.5-flash-latest` model.
        *   Construct the multimodal request by providing the prompt from `prompts.ts` and the image URL. The Gemini SDK has a clear way to handle image URLs.
        *   Wrap the API call in a `try/catch` block. On success, parse the JSON response. On failure, return a standard error response: `{ success: false, provider: 'gemini', error: '...' }`.
    2.  **OpenAI Adapter:** Create `lib/ai/openai.adapter.ts`.
        *   Import `OpenAI`.
        *   Create a class `OpenAIAdapter` that `implements IAIDocumentProcessor`.
        *   In its `extractDataFromDocument` method, use the OpenAI SDK to call the `gpt-4o-mini` model.
        *   Construct the `messages` array, including the system prompt and the user message with the image URL, following the OpenAI API documentation.
        *   Implement the same `try/catch` and standardized response logic as the Gemini adapter.
    3.  **OpenRouter Adapter:** Create `lib/ai/openrouter.adapter.ts`.
        *   This adapter will be very similar to the OpenAI adapter, as OpenRouter's API is OpenAI-compatible.
        *   You'll still import `OpenAI` but configure the client with OpenRouter's `baseURL` and API key.
        *   The model name you pass will be an OpenRouter-specific one (e.g., `google/gemini-flash-1.5`).

---

#### **Task 6.4: Create the Central AI Processing Service**

**Goal:** Build the main service that orchestrates the entire extraction and verification logic.

*   **To-Do:**
    1.  **Create the Service File:** Create `lib/services/document-processor.service.ts`.
    2.  **Implement the Core Function:** Create an async function `processDocument(documentId: string, userId: string)`.
    3.  **Logic Steps within `processDocument`:**
        *   Fetch the document from the database using Prisma to get its R2 image URL. Verify the document belongs to `userId`.
        *   Instantiate the primary adapter: `const gemini = new GeminiAdapter();`.
        *   Call the primary extraction: `const geminiResult = await gemini.extractDataFromDocument(...)`.
        *   Check if the user has enabled dual verification (this setting can be a placeholder `true` for now).
        *   **If true:**
            *   Instantiate and call the secondary adapter: `const openai = new OpenAIAdapter();` and `const openaiResult = await openai.extractDataFromDocument(...)`.
            *   Compare `geminiResult` and `openaiResult` using a new utility function (see Task 6.5).
        *   Store the final, reconciled data and the list of fields needing review in the `Extractions` table using Prisma.
        *   Update the document's status in the `Documents` table to 'PROCESSED'.
        *   If any step fails, write a detailed entry to the `processing_errors` table.

---

#### **Task 6.5: Implement Data Comparison and Database Storage**

**Goal:** Finalize the logic for comparing results and saving them correctly to the database.

*   **To-Do:**
    1.  **Comparison Utility:** In a new file `lib/utils/comparison.ts`, create a function `reconcileAIResults(primaryResult: AIProviderResponse, secondaryResult: AIProviderResponse)`.
        *   **Input:** The two AI responses.
        *   **Logic:** It should return an object containing `{ finalData: ExtractedData, fieldsToReview: string[] }`.
        *   `finalData` will be the data from `primaryResult`.
        *   `fieldsToReview` will be an array of keys where `primaryResult.data[key] !== secondaryResult.data[key]`.
    2.  **Update Prisma Schema:** Add a `jsonb` column to your `Extractions` table in `schema.prisma` to store the list of fields needing review.
        ```prisma
        // schema.prisma
        model Extraction {
          // ... other fields
          extractedData    Json
          fieldsForReview  Json? // Stores an array of strings like ["firstName", "expiryDate"]
        }
        ```
    3.  **Schema Integration Note:** The `fieldsForReview` field is already included in the corrected schema from Phase 2. No additional migration needed.
    4.  **Implement Database Write:** In the `document-processor.service.ts` from Task 6.4, use the output from the `reconcileAIResults` function to create the new `Extraction` record in the database.

---

#### **Task 6.6: Comprehensive Error Handling & Production Features**

**Goal:** Implement production-ready error handling, retry mechanisms, and monitoring for AI services.

*   **To-Do:**
    1.  **Create Error Handling Utility:** Create `lib/ai/error-handler.ts`:
        ```typescript
        export interface AIError {
          type: 'rate_limit' | 'quota_exceeded' | 'api_error' | 'timeout' | 'network' | 'validation';
          message: string;
          statusCode?: number;
          retryAfter?: number;
          provider: string;
        }
        
        export function handleAIProviderError(error: any, provider: string): AIError {
          // Handle OpenAI errors
          if (error.code === 'rate_limit_exceeded') {
            return {
              type: 'rate_limit',
              message: 'Rate limit exceeded. Please try again later.',
              statusCode: 429,
              retryAfter: error.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) : 60,
              provider
            };
          }
          
          // Handle Gemini errors
          if (error.status === 429) {
            return {
              type: 'rate_limit',
              message: 'API rate limit exceeded',
              statusCode: 429,
              retryAfter: 60,
              provider
            };
          }
          
          // Handle network timeouts
          if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            return {
              type: 'network',
              message: 'Network error occurred',
              provider
            };
          }
          
          // Generic error
          return {
            type: 'api_error',
            message: error.message || 'Unknown AI processing error',
            statusCode: error.status || 500,
            provider
          };
        }
        ```
    
    2.  **Create Retry Logic:** Create `lib/ai/retry-manager.ts`:
        ```typescript
        import { AIError } from './error-handler';
        
        export interface RetryConfig {
          maxRetries: number;
          baseDelay: number;
          maxDelay: number;
          exponentialBase: number;
          retryableErrors: string[];
        }
        
        export const DEFAULT_RETRY_CONFIG: RetryConfig = {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 30000,
          exponentialBase: 2,
          retryableErrors: ['rate_limit', 'timeout', 'network']
        };
        
        export async function withRetry<T>(
          operation: () => Promise<T>,
          config: RetryConfig = DEFAULT_RETRY_CONFIG
        ): Promise<T> {
          let lastError: AIError;
          
          for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
              return await operation();
            } catch (error) {
              lastError = error as AIError;
              
              // Don't retry if error type is not retryable
              if (!config.retryableErrors.includes(lastError.type)) {
                throw lastError;
              }
              
              // Don't retry on last attempt
              if (attempt === config.maxRetries) {
                throw lastError;
              }
              
              // Calculate delay with exponential backoff
              const delay = Math.min(
                config.baseDelay * Math.pow(config.exponentialBase, attempt),
                config.maxDelay
              );
              
              // Use retry-after header if available
              const actualDelay = lastError.retryAfter ? lastError.retryAfter * 1000 : delay;
              
              console.log(`Retrying AI operation in ${actualDelay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, actualDelay));
            }
          }
          
          throw lastError!;
        }
        ```
    
    3.  **Add Rate Limiting:** Create `lib/ai/rate-limiter.ts`:
        ```typescript
        interface RateLimitConfig {
          requestsPerMinute: number;
          requestsPerHour: number;
          requestsPerDay: number;
        }
        
        export const PROVIDER_LIMITS: Record<string, RateLimitConfig> = {
          'gemini': {
            requestsPerMinute: 15,
            requestsPerHour: 1000,
            requestsPerDay: 50000
          },
          'openai': {
            requestsPerMinute: 500,
            requestsPerHour: 10000,
            requestsPerDay: 200000
          }
        };
        
        class RateLimiter {
          private requests: Map<string, number[]> = new Map();
          
          async checkRateLimit(provider: string): Promise<boolean> {
            const now = Date.now();
            const config = PROVIDER_LIMITS[provider];
            
            if (!config) return true;
            
            const key = provider;
            const timestamps = this.requests.get(key) || [];
            
            // Clean old timestamps
            const oneMinuteAgo = now - 60 * 1000;
            const oneHourAgo = now - 60 * 60 * 1000;
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            
            const recentRequests = timestamps.filter(t => t > oneDayAgo);
            
            // Check limits
            const minuteRequests = recentRequests.filter(t => t > oneMinuteAgo).length;
            const hourRequests = recentRequests.filter(t => t > oneHourAgo).length;
            const dayRequests = recentRequests.length;
            
            if (minuteRequests >= config.requestsPerMinute) {
              throw new Error(`Rate limit exceeded: ${minuteRequests}/${config.requestsPerMinute} requests per minute`);
            }
            
            if (hourRequests >= config.requestsPerHour) {
              throw new Error(`Rate limit exceeded: ${hourRequests}/${config.requestsPerHour} requests per hour`);
            }
            
            if (dayRequests >= config.requestsPerDay) {
              throw new Error(`Rate limit exceeded: ${dayRequests}/${config.requestsPerDay} requests per day`);
            }
            
            // Add current request
            recentRequests.push(now);
            this.requests.set(key, recentRequests);
            
            return true;
          }
        }
        
        export const rateLimiter = new RateLimiter();
        ```
    
    4.  **Update AI Adapters:** Modify each adapter to use error handling and retry logic:
        ```typescript
        // In gemini.adapter.ts
        import { handleAIProviderError } from './error-handler';
        import { withRetry } from './retry-manager';
        import { rateLimiter } from './rate-limiter';
        
        export class GeminiAdapter implements IAIDocumentProcessor {
          async extractDataFromDocument(
            imageUrl: string,
            documentType: DocumentType
          ): Promise<AIProviderResponse> {
            return withRetry(async () => {
              try {
                // Check rate limits
                await rateLimiter.checkRateLimit('gemini');
                
                // Make API call with timeout
                const result = await Promise.race([
                  this.makeGeminiCall(imageUrl, documentType),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                  )
                ]);
                
                return { success: true, data: result, provider: 'gemini' };
              } catch (error) {
                const aiError = handleAIProviderError(error, 'gemini');
                throw aiError;
              }
            });
          }
        }
        ```

---

#### **Task 6.7: API Route for Document Processing**

**Goal:** Create a robust API endpoint that handles document processing with proper error handling.

*   **To-Do:**
    1.  **Create Processing API:** Create `app/api/documents/[id]/process/route.ts`:
        ```typescript
        import { NextRequest, NextResponse } from 'next/server';
        import { auth } from '@clerk/nextjs/server';
        import { prisma } from '@/lib/prisma';
        import { processDocument } from '@/lib/services/document-processor.service';
        import { z } from 'zod';
        
        const ProcessRequestSchema = z.object({
          enableDualVerification: z.boolean().optional().default(false),
        });
        
        export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
          try {
            const { userId } = auth();
            
            if (!userId) {
              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            
            const documentId = params.id;
            const body = await request.json();
            const { enableDualVerification } = ProcessRequestSchema.parse(body);
            
            // Verify document exists and belongs to user
            const document = await prisma.document.findFirst({
              where: {
                id: documentId,
                userId: userId,
              },
              include: {
                files: true,
              },
            });
            
            if (!document) {
              return NextResponse.json({ error: 'Document not found' }, { status: 404 });
            }
            
            if (document.status === 'completed') {
              return NextResponse.json({ error: 'Document already processed' }, { status: 400 });
            }
            
            // Start processing
            await prisma.document.update({
              where: { id: documentId },
              data: { status: 'processing' },
            });
            
            // Process document
            const result = await processDocument(documentId, userId, enableDualVerification);
            
            return NextResponse.json({
              success: true,
              documentId,
              extractionId: result.extractionId,
              fieldsForReview: result.fieldsForReview,
            });
            
          } catch (error) {
            console.error('Document processing failed:', error);
            
            // Update document status to failed
            try {
              await prisma.document.update({
                where: { id: params.id },
                data: { status: 'failed' },
              });
            } catch (updateError) {
              console.error('Failed to update document status:', updateError);
            }
            
            return NextResponse.json(
              { error: 'Document processing failed' },
              { status: 500 }
            );
          }
        }
        ```
    
    2.  **Add Processing Status API:** Create `app/api/documents/[id]/status/route.ts`:
        ```typescript
        import { NextRequest, NextResponse } from 'next/server';
        import { auth } from '@clerk/nextjs/server';
        import { prisma } from '@/lib/prisma';
        
        export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
          try {
            const { userId } = auth();
            
            if (!userId) {
              return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            
            const document = await prisma.document.findFirst({
              where: {
                id: params.id,
                userId: userId,
              },
              include: {
                extractions: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
                errors: {
                  where: { resolved: false },
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
            });
            
            if (!document) {
              return NextResponse.json({ error: 'Document not found' }, { status: 404 });
            }
            
            return NextResponse.json({
              id: document.id,
              status: document.status,
              documentType: document.documentType,
              createdAt: document.createdAt,
              updatedAt: document.updatedAt,
              latestExtraction: document.extractions[0] || null,
              activeErrors: document.errors,
            });
            
          } catch (error) {
            console.error('Failed to get document status:', error);
            return NextResponse.json(
              { error: 'Failed to get document status' },
              { status: 500 }
            );
          }
        }
        ```

**Expected Outcome:** Complete, production-ready AI integration with comprehensive error handling, retry mechanisms, rate limiting, and monitoring.

By completing these steps sequentially, a developer will have built a powerful, flexible, and reliable AI document processing backend ready for production use and the next phase of displaying the results to the user.