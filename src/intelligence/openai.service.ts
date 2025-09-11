import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatCompletionOptions {
  model: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIChatCompletionResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Generate chat completion using OpenAI API
   */
  async createChatCompletion(options: OpenAIChatCompletionOptions): Promise<OpenAIChatCompletionResponse> {
    try {
      this.logger.log(`Creating chat completion with model: ${options.model}`);

      const completion = await this.openai.chat.completions.create({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
      });

      const response: OpenAIChatCompletionResponse = {
        content: completion.choices[0]?.message?.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };

      this.logger.log(`Chat completion created successfully. Tokens used: ${response.usage.totalTokens}`);
      return response;
    } catch (error) {
      this.logger.error('Error creating chat completion:', error);
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Generate a simple text completion
   */
  async generateText(prompt: string, options?: Partial<OpenAIChatCompletionOptions>): Promise<OpenAIChatCompletionResponse> {
    const defaultOptions: OpenAIChatCompletionOptions = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      ...options,
    };

    return this.createChatCompletion(defaultOptions);
  }

  /**
   * Generate a completion with system context
   */
  async generateWithContext(
    systemPrompt: string,
    userPrompt: string,
    options?: Partial<OpenAIChatCompletionOptions>
  ): Promise<OpenAIChatCompletionResponse> {
    const defaultOptions: OpenAIChatCompletionOptions = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      ...options,
    };

    return this.createChatCompletion(defaultOptions);
  }

  /**
   * Generate a completion for farm analysis
   */
  async generateFarmAnalysis(
    analysisType: string,
    data: any,
    options?: Partial<OpenAIChatCompletionOptions>
  ): Promise<OpenAIChatCompletionResponse> {
    const systemPrompt = this.buildFarmAnalysisSystemPrompt();
    const userPrompt = this.buildFarmAnalysisPrompt(analysisType, data);

    return this.generateWithContext(systemPrompt, userPrompt, {
      model: 'gpt-4',
      temperature: 0.3,
      max_tokens: 2000,
      ...options,
    });
  }

  /**
   * Generate a completion for market analysis
   */
  async generateMarketAnalysis(
    commodity: string,
    region: string | undefined,
    analysisType: string,
    timeframe: string,
    options?: Partial<OpenAIChatCompletionOptions>
  ): Promise<OpenAIChatCompletionResponse> {
    const systemPrompt = this.buildMarketAnalysisSystemPrompt();
    const userPrompt = this.buildMarketAnalysisPrompt(commodity, region, analysisType, timeframe);

    return this.generateWithContext(systemPrompt, userPrompt, {
      model: 'gpt-4',
      temperature: 0.4,
      max_tokens: 2500,
      ...options,
    });
  }

  /**
   * Generate a completion for activity optimization
   */
  async generateActivityOptimization(
    activityType: string,
    constraints: any,
    objectives: string[],
    options?: Partial<OpenAIChatCompletionOptions>
  ): Promise<OpenAIChatCompletionResponse> {
    const systemPrompt = this.buildActivityOptimizationSystemPrompt();
    const userPrompt = this.buildActivityOptimizationPrompt(activityType, constraints, objectives);

    return this.generateWithContext(systemPrompt, userPrompt, {
      model: 'gpt-4',
      temperature: 0.2,
      max_tokens: 3000,
      ...options,
    });
  }

  /**
   * Check OpenAI API health
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; models: string[] }> {
    try {
      this.logger.log('Checking OpenAI API health');
      await this.openai.models.list();
      
      return {
        status: 'healthy',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      };
    } catch (error) {
      this.logger.error('OpenAI health check failed:', error);
      return {
        status: 'unhealthy',
        models: [],
      };
    }
  }

  /**
   * Parse JSON response from AI, with fallback handling
   */
  parseJsonResponse<T>(content: string, fallback: T): T {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      this.logger.warn('No JSON found in AI response, using fallback');
      return fallback;
    } catch (error) {
      this.logger.warn('Failed to parse JSON response from AI:', error);
      return fallback;
    }
  }

  // Private helper methods for building prompts

  private buildFarmAnalysisSystemPrompt(): string {
    return `You are an agricultural data analyst. Analyze farm data and provide:
1. Key insights about the farm's performance
2. Specific, actionable recommendations
3. A confidence score (0-1) for your analysis
4. Structured data in JSON format

Focus on data-driven insights and evidence-based recommendations.`;
  }

  private buildMarketAnalysisSystemPrompt(): string {
    return `You are a commodity market analyst. Analyze market data and provide:
1. Price predictions with confidence levels
2. Market insights and trends
3. Trading recommendations
4. Risk factors to consider

Provide data-driven analysis based on market fundamentals and technical indicators.`;
  }

  private buildActivityOptimizationSystemPrompt(): string {
    return `You are a farm operations optimizer. Create optimized activity plans that:
1. Maximize efficiency and yield
2. Minimize costs and risks
3. Consider all constraints and objectives
4. Provide alternative approaches

Focus on practical, implementable solutions with clear schedules and resource requirements.`;
  }

  private buildFarmAnalysisPrompt(analysisType: string, data: any): string {
    return `Perform ${analysisType} analysis on the following farm data:

${JSON.stringify(data, null, 2)}

Provide insights, recommendations, and confidence score in JSON format.`;
  }

  private buildMarketAnalysisPrompt(
    commodity: string,
    region: string | undefined,
    analysisType: string,
    timeframe: string
  ): string {
    return `Analyze ${commodity} market for ${analysisType} analysis.
Timeframe: ${timeframe}
Region: ${region || 'Global'}

Provide predictions, insights, recommendations, and risk factors in JSON format.`;
  }

  private buildActivityOptimizationPrompt(
    activityType: string,
    constraints: any,
    objectives: string[]
  ): string {
    return `Optimize ${activityType} activities for farm with the following constraints and objectives:

Constraints: ${JSON.stringify(constraints, null, 2)}
Objectives: ${objectives.join(', ')}

Provide optimized plan and alternatives in JSON format.`;
  }

  private handleOpenAIError(error: any): Error {
    if (error.code === 'rate_limit_exceeded') {
      return new BadRequestException('Rate limit exceeded. Please try again later.');
    }
    
    if (error.code === 'insufficient_quota') {
      return new BadRequestException('Insufficient API credits. Please contact support.');
    }
    
    if (error.code === 'content_filter') {
      return new BadRequestException('Content filtered by OpenAI safety system.');
    }
    
    if (error.code === 'context_length_exceeded') {
      return new BadRequestException('Request too long. Please reduce the input size.');
    }
    
    this.logger.error('OpenAI API error:', error);
    return new InternalServerErrorException('AI service temporarily unavailable');
  }
}
