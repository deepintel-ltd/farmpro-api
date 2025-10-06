import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { OpenAIService } from './openai.service';

// Mock OpenAI
const mockCreate = jest.fn();
const mockList = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
      models: {
        list: mockList,
      },
    })),
  };
});

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    // Create deep mock for ConfigService
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'test-api-key';
        if (key === 'OPENAI_ENABLED') return 'true';
        return undefined;
      }),
    } as any;

    // Create service instance with mocked dependencies
    service = new OpenAIService(mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createChatCompletion', () => {
    it('should create chat completion successfully', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user' as const, content: 'Hello' },
        ],
        temperature: 0.7,
        max_tokens: 100,
      };

      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you?',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockCreate.mockResolvedValue(mockCompletion as any);

      const result = await service.createChatCompletion(options);

      expect(result).toEqual({
        content: 'Hello! How can I help you?',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });
    });

    it('should handle OpenAI API errors', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user' as const, content: 'Hello' },
        ],
      };

      mockCreate.mockRejectedValue({
        code: 'rate_limit_exceeded',
        message: 'Rate limit exceeded',
      });

      await expect(service.createChatCompletion(options)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateText', () => {
    it('should generate text with default options', async () => {
      const prompt = 'What is the capital of France?';
      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'The capital of France is Paris.',
            },
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 10,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValue(mockCompletion as any);

      const result = await service.generateText(prompt);

      expect(result).toEqual({
        content: 'The capital of France is Paris.',
        usage: {
          promptTokens: 15,
          completionTokens: 10,
          totalTokens: 25,
        },
      });
    });

    it('should generate text with custom options', async () => {
      const prompt = 'What is the capital of France?';
      const options = {
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 50,
      };

      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'The capital of France is Paris.',
            },
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 10,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValue(mockCompletion as any);

      await service.generateText(prompt, options);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 50,
      });
    });
  });

  describe('generateWithContext', () => {
    it('should generate with system and user context', async () => {
      const systemPrompt = 'You are a helpful assistant.';
      const userPrompt = 'What is 2+2?';
      const options = {
        model: 'gpt-4',
        temperature: 0.3,
      };

      const mockCompletion = {
        choices: [
          {
            message: {
              content: '2+2 equals 4.',
            },
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 5,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValue(mockCompletion as any);

      const result = await service.generateWithContext(systemPrompt, userPrompt, options);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      expect(result).toEqual({
        content: '2+2 equals 4.',
        usage: {
          promptTokens: 20,
          completionTokens: 5,
          totalTokens: 25,
        },
      });
    });
  });

  describe('generateFarmAnalysis', () => {
    it('should generate farm analysis with specialized prompts', async () => {
      const analysisType = 'crop_health';
      const data = { cropType: 'corn', yield: 150 };
      const options = {
        temperature: 0.2,
      };

      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                insights: ['Crop health is good'],
                recommendations: ['Consider fertilization'],
                confidence: 0.8,
                data: { healthScore: 85 },
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150,
        },
      };

      mockCreate.mockResolvedValue(mockCompletion as any);

      const result = await service.generateFarmAnalysis(analysisType, data, options);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        temperature: 0.2,
        max_tokens: 2000,
      });

      expect(result.content).toContain('insights');
    });
  });

  describe('generateMarketAnalysis', () => {
    it('should generate market analysis with specialized prompts', async () => {
      const commodity = 'corn';
      const region = 'US';
      const analysisType = 'price_prediction';
      const timeframe = 'monthly';

      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                predictions: [],
                insights: ['Price trending upward'],
                recommendations: ['Consider selling'],
                riskFactors: ['Weather volatility'],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 40,
          completion_tokens: 80,
          total_tokens: 120,
        },
      };

      mockCreate.mockResolvedValue(mockCompletion as any);

      const result = await service.generateMarketAnalysis(commodity, region, analysisType, timeframe);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        temperature: 0.4,
        max_tokens: 2500,
      });

      expect(result.content).toContain('predictions');
    });
  });

  describe('generateActivityOptimization', () => {
    it('should generate activity optimization with specialized prompts', async () => {
      const activityType = 'planting';
      const constraints = { budget: 10000, time: 30 };
      const objectives = ['maximize_yield', 'minimize_cost'];

      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                optimizedPlan: {
                  schedule: [],
                  totalCost: 8000,
                  totalDuration: 25,
                  riskScore: 0.3,
                },
                alternatives: [],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 60,
          completion_tokens: 120,
          total_tokens: 180,
        },
      };

      mockCreate.mockResolvedValue(mockCompletion as any);

      const result = await service.generateActivityOptimization(activityType, constraints, objectives);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        temperature: 0.2,
        max_tokens: 3000,
      });

      expect(result.content).toContain('optimizedPlan');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when API is accessible', async () => {
      mockList.mockResolvedValue({ data: [] } as any);

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
        enabled: true,
      });
    });

    it('should return unhealthy status when API is not accessible', async () => {
      mockList.mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        models: [],
        enabled: true,
      });
    });
  });

  describe('parseJsonResponse', () => {
    it('should parse valid JSON response', () => {
      const content = 'Here is the analysis: {"insights": ["Good crop health"], "confidence": 0.8}';
      const fallback = { insights: [], confidence: 0.5 };

      const result = service.parseJsonResponse(content, fallback);

      expect(result).toEqual({
        insights: ['Good crop health'],
        confidence: 0.8,
      });
    });

    it('should return fallback when no JSON found', () => {
      const content = 'This is just plain text without JSON';
      const fallback = { insights: [], confidence: 0.5 };

      const result = service.parseJsonResponse(content, fallback);

      expect(result).toEqual(fallback);
    });

    it('should return fallback when JSON is invalid', () => {
      const content = 'Here is invalid JSON: {"insights": ["Good crop health", "confidence": 0.8}';
      const fallback = { insights: [], confidence: 0.5 };

      const result = service.parseJsonResponse(content, fallback);

      expect(result).toEqual(fallback);
    });
  });

  describe('error handling', () => {
    it('should handle rate limit exceeded error', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      mockCreate.mockRejectedValue({
        code: 'rate_limit_exceeded',
        message: 'Rate limit exceeded',
      });

      await expect(service.createChatCompletion(options)).rejects.toThrow(BadRequestException);
    });

    it('should handle insufficient quota error', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      mockCreate.mockRejectedValue({
        code: 'insufficient_quota',
        message: 'Insufficient quota',
      });

      await expect(service.createChatCompletion(options)).rejects.toThrow(BadRequestException);
    });

    it('should handle content filter error', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      mockCreate.mockRejectedValue({
        code: 'content_filter',
        message: 'Content filtered',
      });

      await expect(service.createChatCompletion(options)).rejects.toThrow(BadRequestException);
    });

    it('should handle context length exceeded error', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      mockCreate.mockRejectedValue({
        code: 'context_length_exceeded',
        message: 'Context too long',
      });

      await expect(service.createChatCompletion(options)).rejects.toThrow(BadRequestException);
    });

    it('should handle unknown API errors', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      mockCreate.mockRejectedValue({
        code: 'unknown_error',
        message: 'Unknown error',
      });

      await expect(service.createChatCompletion(options)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('disabled state', () => {
    let disabledService: OpenAIService;

    beforeEach(() => {
      const disabledConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'OPENAI_API_KEY') return 'test-api-key';
          if (key === 'OPENAI_ENABLED') return 'false';
          return undefined;
        }),
      } as any;

      disabledService = new OpenAIService(disabledConfigService);
    });

    it('should return false for isOpenAIEnabled when disabled', () => {
      expect(disabledService.isOpenAIEnabled()).toBe(false);
    });

    it('should return fallback response when disabled', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user' as const, content: 'Analyze my farm data' },
        ],
      };

      const result = await disabledService.createChatCompletion(options);

      expect(result.content).toContain('currently unavailable');
      expect(result.usage.totalTokens).toBe(0);
    });

    it('should return farm-specific fallback for farm queries', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user' as const, content: 'Help me with my farm analysis' },
        ],
      };

      const result = await disabledService.createChatCompletion(options);

      expect(result.content).toContain('farm analysis');
      expect(result.content).toContain('unavailable');
    });

    it('should return market-specific fallback for market queries', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user' as const, content: 'What are the market prices for corn?' },
        ],
      };

      const result = await disabledService.createChatCompletion(options);

      expect(result.content).toContain('Market analysis');
      expect(result.content).toContain('unavailable');
    });

    it('should return optimization-specific fallback for optimization queries', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user' as const, content: 'Help me optimize my farm activities' },
        ],
      };

      const result = await disabledService.createChatCompletion(options);

      expect(result.content).toContain('optimization');
      expect(result.content).toContain('disabled');
    });

    it('should return disabled status in health check', async () => {
      const health = await disabledService.healthCheck();

      expect(health.status).toBe('disabled');
      expect(health.enabled).toBe(false);
      expect(health.models).toEqual([]);
    });
  });
});
