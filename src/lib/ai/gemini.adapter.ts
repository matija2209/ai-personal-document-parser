import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIDocumentProcessor, AIProviderResponse, DocumentType, FormTemplate, GuestFormExtractionData } from './types';
import { getPromptForDocument } from './prompts';
import { handleAIProviderError } from './error-handler';
import { withRetry } from './retry-manager';
import { rateLimiter } from './rate-limiter';
import { buildGuestFormPrompt } from '@/lib/services/prompt-builder.service';

export class GeminiAdapter implements IAIDocumentProcessor {
  private client: GoogleGenerativeAI;
  
  constructor() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }
  
  async extractDataFromDocument(
    imageUrl: string,
    documentType: DocumentType,
    template?: FormTemplate,
    guestCount?: number
  ): Promise<AIProviderResponse> {
    return withRetry(async () => {
      try {
        // Check rate limits
        await rateLimiter.checkRateLimit('gemini');
        
        // Make API call with timeout
        const timeoutMs = 30000; // 30s timeout
        
        const result = await Promise.race([
          this.makeGeminiCall(imageUrl, documentType, template, guestCount),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
        
        return { success: true, data: result, provider: 'gemini' };
      } catch (error) {
        const aiError = handleAIProviderError(error, 'gemini');
        throw aiError;
      }
    });
  }
  
  private async makeGeminiCall(
    imageUrl: string, 
    documentType: DocumentType, 
    template?: FormTemplate, 
    guestCount?: number
  ) {
    const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let prompt: string;
    if (documentType === 'guest-form' && template) {
      prompt = await buildGuestFormPrompt(template, guestCount);
    } else {
      prompt = getPromptForDocument(documentType);
    }
    
    // Fetch the image to pass as inline data
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    // Detect content type from response headers
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: contentType,
              data: imageBase64
            }
          }
        ]
      }]
    });
    
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response - handle markdown code blocks
    try {
      let cleanedText = text.trim();
      
      // Remove markdown code block formatting if present
      if (cleanedText.startsWith('```json') && cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(7, -3).trim();
      } else if (cleanedText.startsWith('```') && cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(3, -3).trim();
      }
      
      const parsedData = JSON.parse(cleanedText);
      return parsedData;
    } catch (parseError) {
      throw new Error(`Invalid JSON response from Gemini: ${text}`);
    }
  }
}