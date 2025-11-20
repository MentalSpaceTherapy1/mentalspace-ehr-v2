import logger, { logControllerError } from '../../utils/logger';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic Claude AI Service
 * Handles all interactions with Claude API for clinical AI features
 */
class AnthropicService {
  private client: Anthropic | null = null;
  private model: string = 'claude-3-opus-20240229';

  private initializeClient() {
    if (this.client) {
      return; // Already initialized
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured in environment variables');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Generate a completion from Claude
   * @param systemPrompt System instructions for Claude
   * @param userPrompt User's request/content
   * @param options Additional options like max_tokens, temperature
   */
  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      stopSequences?: string[];
    } = {}
  ): Promise<string> {
    this.initializeClient();

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stop_sequences: options.stopSequences,
      });

      // Extract text content from the response
      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error: any) {
      logger.error('Anthropic API Error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  /**
   * Generate streaming completion (for real-time AI assistance)
   */
  async *generateStreamingCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    this.initializeClient();

    try {
      const stream = await this.client!.messages.stream({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          yield chunk.delta.text;
        }
      }
    } catch (error: any) {
      logger.error('Anthropic Streaming Error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      throw new Error(`AI Streaming Error: ${error.message}`);
    }
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateCompletion(
        'You are a helpful assistant.',
        'Respond with OK if you can read this.',
        { maxTokens: 10 }
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const anthropicService = new AnthropicService();
export default anthropicService;
