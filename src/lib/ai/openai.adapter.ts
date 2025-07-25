import OpenAI from 'openai';
import { IAIDocumentProcessor, AIProviderResponse, DocumentType, FormTemplate, GuestFormExtractionData } from './types';
import { getPromptForDocument } from './prompts';
import { handleAIProviderError } from './error-handler';
import { withRetry } from './retry-manager';
import { rateLimiter } from './rate-limiter';
import { buildGuestFormPrompt } from '@/lib/services/prompt-builder.service';

export class OpenAIAdapter implements IAIDocumentProcessor {
  private client: OpenAI;
  
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.client = new OpenAI({ apiKey });
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
        await rateLimiter.checkRateLimit('openai');
        
        // Make API call with timeout
        const timeoutMs = 30000; // 30s timeout
        
        const result = await Promise.race([
          this.makeOpenAICall(imageUrl, documentType, template, guestCount),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
        
        return { success: true, data: result, provider: 'openai' };
      } catch (error) {
        const aiError = handleAIProviderError(error, 'openai');
        throw aiError;
      }
    });
  }
  
  private async makeOpenAICall(
    imageUrl: string, 
    documentType: DocumentType, 
    template?: FormTemplate, 
    guestCount?: number
  ) {
    let prompt: string;
    if (documentType === 'guest-form' && template) {
      prompt = await buildGuestFormPrompt(template, guestCount);
    } else {
      prompt = getPromptForDocument(documentType);
    }
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }
    
    // Parse JSON response
    try {
      const parsedData = JSON.parse(content.trim());
      return parsedData;
    } catch (parseError) {
      throw new Error(`Invalid JSON response from OpenAI: ${content}`);
    }
  }
}