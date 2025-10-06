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
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.isEnabled = this.configService.get<string>('OPENAI_ENABLED', 'true').toLowerCase() === 'true';
    
    if (!this.isEnabled) {
      this.logger.warn('OpenAI functionality is disabled via OPENAI_ENABLED environment variable.');
    } else if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY environment variable is not set. OpenAI functionality will be limited.');
    } else {
      this.openai = new OpenAI({
        apiKey,
      });
    }
  }

  /**
   * Check if OpenAI service is enabled
   */
  isOpenAIEnabled(): boolean {
    return this.isEnabled && !!this.openai;
  }

  /**
   * Generate a fallback response when OpenAI is disabled
   */
  private generateFallbackResponse(options: OpenAIChatCompletionOptions): OpenAIChatCompletionResponse {
    const fallbackContent = this.buildFallbackContent(options.messages);
    
    return {
      content: fallbackContent,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  /**
   * Build fallback content based on the user's message
   */
  private buildFallbackContent(messages: OpenAIChatMessage[]): string {
    const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
    const systemMessage = messages.find(msg => msg.role === 'system')?.content || '';
    const combinedMessage = `${systemMessage} ${userMessage}`.toLowerCase();
    
    // Check for market analysis keywords
    if (combinedMessage.includes('market') || combinedMessage.includes('price') || 
        combinedMessage.includes('commodity') || combinedMessage.includes('trading')) {
      return "Market analysis features are temporarily unavailable. Please check back later for AI-powered market insights.";
    }
    
    // Check for optimization keywords
    if (combinedMessage.includes('optimization') || combinedMessage.includes('optimize') || 
        combinedMessage.includes('plan') || combinedMessage.includes('schedule') ||
        combinedMessage.includes('activity optimization')) {
      return "Activity optimization features are currently disabled. Please try again later for AI-powered farm planning assistance.";
    }
    
    // Check for farm analysis keywords
    if (combinedMessage.includes('farm') || combinedMessage.includes('agriculture') ||
        combinedMessage.includes('crop') || combinedMessage.includes('yield') ||
        combinedMessage.includes('farm analysis')) {
      return "I'm currently unavailable for AI-powered farm analysis. Please try again later or contact support for assistance with your agricultural queries.";
    }
    
    return "AI-powered features are temporarily unavailable. Please try again later or contact support for assistance.";
  }

  /**
   * Generate chat completion using OpenAI API
   */
  async createChatCompletion(options: OpenAIChatCompletionOptions): Promise<OpenAIChatCompletionResponse> {
    if (!this.isOpenAIEnabled()) {
      this.logger.warn('OpenAI is disabled, returning fallback response');
      return this.generateFallbackResponse(options);
    }

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
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy' | 'disabled'; models: string[]; enabled: boolean }> {
    if (!this.isEnabled) {
      return {
        status: 'disabled',
        models: [],
        enabled: false,
      };
    }

    if (!this.openai) {
      return {
        status: 'unhealthy',
        models: [],
        enabled: false,
      };
    }

    try {
      this.logger.log('Checking OpenAI API health');
      await this.openai.models.list();
      
      return {
        status: 'healthy',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
        enabled: true,
      };
    } catch (error) {
      this.logger.error('OpenAI health check failed:', error);
      return {
        status: 'unhealthy',
        models: [],
        enabled: true,
      };
    }
  }

  /**
   * Parse JSON response from AI, with fallback handling
   */
  parseJsonResponse<T>(content: string, fallback: T): T {
    try {
      // Try to extract JSON from the response
      // First, try to find JSON code block
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        const parsed = JSON.parse(codeBlockMatch[1]);
        return { ...fallback, ...parsed };
      }

      // If no code block, try to extract JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Merge parsed response with fallback to ensure all required fields are present
        return { ...fallback, ...parsed };
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

Provide your analysis in the following JSON format:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.85,
  "data": {
    "rawResponse": "detailed analysis text",
    "additionalMetrics": {}
  }
}

IMPORTANT:
- "insights" must be an array of strings
- "recommendations" must be an array of strings
- "confidence" must be a number between 0 and 1
- Keep insights and recommendations concise and actionable`;
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

Provide your analysis in the following JSON format:
{
  "predictions": [
    {
      "date": "2025-11-01T00:00:00.000Z",
      "value": 150.5,
      "confidence": 0.8
    }
  ],
  "insights": ["market insight 1", "market insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "riskFactors": ["risk factor 1", "risk factor 2"]
}

IMPORTANT:
- "predictions" must be an array of objects with date, value, and confidence
- "insights" must be an array of strings
- "recommendations" must be an array of strings
- "riskFactors" must be an array of strings
- All confidence scores must be numbers between 0 and 1`;
  }

  private buildActivityOptimizationPrompt(
    activityType: string,
    constraints: any,
    objectives: string[]
  ): string {
    return `Optimize ${activityType} activities for farm with the following constraints and objectives:

Constraints: ${JSON.stringify(constraints, null, 2)}
Objectives: ${objectives.join(', ')}

Provide your optimization in the following JSON format:
{
  "optimizedPlan": {
    "schedule": [
      {
        "date": "2025-11-01T00:00:00.000Z",
        "activity": "activity description",
        "resources": ["resource 1", "resource 2"],
        "cost": 1000
      }
    ],
    "totalCost": 5000,
    "totalDuration": 30,
    "expectedYield": 2000,
    "riskScore": 0.3
  },
  "alternatives": [
    {
      "description": "alternative approach",
      "pros": ["advantage 1", "advantage 2"],
      "cons": ["disadvantage 1"],
      "cost": 4500
    }
  ]
}

IMPORTANT:
- All arrays must contain strings or objects as specified
- All numeric fields must be valid numbers
- Dates must be in ISO 8601 format`;
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
