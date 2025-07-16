import OpenAI from 'openai';
import { IAIDocumentProcessor, AIProviderResponse, DocumentType } from './types';
import { getPromptForDocument } from './prompts';
import { handleAIProviderError } from './error-handler';
import { withRetry } from './retry-manager';

export class OpenRouterAdapter implements IAIDocumentProcessor {
  private client: OpenAI;
  
  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Personal Document Parser',
      }
    });
  }
  
  async extractDataFromDocument(
    imageUrl: string,
    documentType: DocumentType
  ): Promise<AIProviderResponse> {
    return withRetry(async () => {
      try {
        // Make API call with timeout
        const result = await Promise.race([
          this.makeOpenRouterCall(imageUrl, documentType),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);
        
        return { success: true, data: result, provider: 'openrouter' };
      } catch (error) {
        const aiError = handleAIProviderError(error, 'openrouter');
        throw aiError;
      }
    });
  }
  
  private async makeOpenRouterCall(imageUrl: string, documentType: DocumentType) {
    const prompt = getPromptForDocument(documentType);
    
    const response = await this.client.chat.completions.create({
      model: 'google/gemini-flash-1.5',
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
      throw new Error('No response content from OpenRouter');
    }
    
    // Parse JSON response
    try {
      const parsedData = JSON.parse(content.trim());
      return parsedData;
    } catch (parseError) {
      throw new Error(`Invalid JSON response from OpenRouter: ${content}`);
    }
  }
}