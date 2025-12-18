import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private apiKeys: string[];
  private currentKeyIndex = 0;
  private readonly maxRetries = 2;
  private axiosInstances: AxiosInstance[];

  constructor(private configService: ConfigService) {
    const keys: string[] = [];
    let i = 1;
    
    while (true) {
      const key = this.configService.get<string>(`OPENAI_API_KEY_${i}`);
      if (!key) break;
      keys.push(key);
      i++;
    }

    if (keys.length === 0) {
      throw new Error('No OPENAI_API_KEY found in environment variables. Please set OPENAI_API_KEY_1, OPENAI_API_KEY_2, etc.');
    }

    this.apiKeys = keys;
    this.logger.log(`Loaded ${this.apiKeys.length} OpenAI API key(s)`);

    this.axiosInstances = this.apiKeys.map((key) =>
      axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        timeout: 60000,
      })
    );
  }

  async chat(
    messages: ChatMessage[],
    temperature: number = 0.7,
    maxTokens: number = 1000
  ): Promise<{ response: string; retryCount: number; keyUsed: number }> {
    let retryCount = 0;
    let lastError: Error | null = null;

    for (let keyAttempt = 0; keyAttempt < this.apiKeys.length; keyAttempt++) {
      const keyIndex = (this.currentKeyIndex + keyAttempt) % this.apiKeys.length;
      
      for (let retry = 0; retry < this.maxRetries; retry++) {
        try {
          this.logger.log(
            `Attempting OpenAI API call - Key: ${keyIndex + 1}/${this.apiKeys.length}, Retry: ${retry + 1}/${this.maxRetries}`
          );

          const response = await this.axiosInstances[keyIndex].post<OpenAIResponse>(
            '/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages,
              temperature,
              max_tokens: maxTokens,
            }
          );

          const content = response.data.choices[0]?.message?.content;
          if (!content) {
            throw new Error('No content in OpenAI response');
          }

          this.logger.log(`Successfully received response from OpenAI (Key ${keyIndex + 1}, Retry ${retry + 1})`);
          
          this.currentKeyIndex = (keyIndex + 1) % this.apiKeys.length;

          return {
            response: content,
            retryCount,
            keyUsed: keyIndex + 1,
          };
        } catch (error) {
          retryCount++;
          lastError = error;

          const errorMessage = error.response?.data?.error?.message || error.message;
          this.logger.warn(
            `OpenAI API call failed - Key: ${keyIndex + 1}, Retry: ${retry + 1}/${this.maxRetries}, Error: ${errorMessage}`
          );

          if (retry < this.maxRetries - 1) {
            await this.sleep(1000 * (retry + 1));
          }
        }
      }
    }

    this.logger.error(
      `All OpenAI API attempts failed after ${retryCount} retries across ${this.apiKeys.length} key(s)`,
      lastError
    );

    throw new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'OpenAI service is currently unavailable. Please try again later.',
        error: 'Service Unavailable',
      },
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

