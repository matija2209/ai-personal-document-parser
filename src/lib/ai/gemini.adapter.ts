import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIDocumentProcessor, AIProviderResponse, DocumentType } from './types';
import { getPromptForDocument } from './prompts';
import { handleAIProviderError } from './error-handler';
import { withRetry } from './retry-manager';
import { rateLimiter } from './rate-limiter';

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
    documentType: DocumentType
  ): Promise<AIProviderResponse> {
    return withRetry(async () => {
      try {
        // Check rate limits
        await rateLimiter.checkRateLimit('gemini');
        
        // Make API call with timeout
        const result = await Promise.race([
          this.makeGeminiCall(imageUrl, documentType),
          new Promise<never>((_, reject) => 
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
  
  private async makeGeminiCall(imageUrl: string, documentType: DocumentType) {
    const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const prompt = getPromptForDocument(documentType);
    
    // Fetch the image to pass as inline data
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }]
    });
    
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    try {
      const parsedData = JSON.parse(text.trim());
      return parsedData;
    } catch (parseError) {
      throw new Error(`Invalid JSON response from Gemini: ${text}`);
    }
  }
}