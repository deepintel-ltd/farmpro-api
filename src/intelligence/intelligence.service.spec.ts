import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { OpenAIService } from './openai.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('IntelligenceService', () => {
  let service: IntelligenceService;

  const mockPrismaService = {
    farm: {
      findUnique: jest.fn(),
    },
    intelligenceResponse: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    farmAnalysis: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    marketAnalysis: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    activityOptimization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockOpenAIService = {
    generateWithContext: jest.fn(),
    generateFarmAnalysis: jest.fn(),
    generateMarketAnalysis: jest.fn(),
    generateActivityOptimization: jest.fn(),
    parseJsonResponse: jest.fn(),
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
      ],
    }).compile();

    service = module.get<IntelligenceService>(IntelligenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should generate AI response successfully', async () => {
      const request = {
        prompt: 'What is the best time to plant corn?',
        userId: 'user-123',
        farmId: 'farm-123',
        model: 'gpt-3.5-turbo' as const,
        temperature: 0.7,
        maxTokens: 1000,
      };

      const mockCompletion = {
        content: 'The best time to plant corn is typically in late spring when soil temperature reaches 50-55°F.',
        usage: {
          promptTokens: 20,
          completionTokens: 30,
          totalTokens: 50,
        },
      };

      mockOpenAIService.generateWithContext.mockResolvedValue(mockCompletion);

      const result = await service.generateResponse(request);

      expect(result).toMatchObject({
        content: 'The best time to plant corn is typically in late spring when soil temperature reaches 50-55°F.',
        model: 'gpt-3.5-turbo',
        userId: 'user-123',
        farmId: 'farm-123',
      });
      expect(result.usage).toEqual({
        promptTokens: 20,
        completionTokens: 30,
        totalTokens: 50,
      });
    });

    it('should handle OpenAI API errors', async () => {
      const request = {
        prompt: 'Test prompt',
        userId: 'user-123',
        model: 'gpt-3.5-turbo' as const,
      };

      mockOpenAIService.generateWithContext.mockRejectedValue(
        new BadRequestException('Rate limit exceeded')
      );

      await expect(service.generateResponse(request)).rejects.toThrow(BadRequestException);
    });
  });

  describe('analyzeFarm', () => {
    it('should analyze farm data successfully', async () => {
      const request = {
        farmId: 'farm-123',
        analysisType: 'crop_health' as const,
        data: { cropType: 'corn', yield: 150 },
        userId: 'user-123',
      };

      const mockFarm = { id: 'farm-123', name: 'Test Farm' };
      const mockCompletion = {
        content: JSON.stringify({
          insights: ['Crop health is good', 'Yield is above average'],
          recommendations: ['Consider additional fertilization', 'Monitor for pests'],
          confidence: 0.8,
          data: { healthScore: 85 },
        }),
        usage: {
          promptTokens: 50,
          completionTokens: 100,
          totalTokens: 150,
        },
      };

      const mockParsedResponse = {
        insights: ['Crop health is good', 'Yield is above average'],
        recommendations: ['Consider additional fertilization', 'Monitor for pests'],
        confidence: 0.8,
        data: { healthScore: 85 },
      };

      mockPrismaService.farm.findUnique.mockResolvedValue(mockFarm as any);
      mockOpenAIService.generateFarmAnalysis.mockResolvedValue(mockCompletion);
      mockOpenAIService.parseJsonResponse.mockReturnValue(mockParsedResponse);

      const result = await service.analyzeFarm(request);

      expect(result).toMatchObject({
        farmId: 'farm-123',
        analysisType: 'crop_health',
        insights: ['Crop health is good', 'Yield is above average'],
        recommendations: ['Consider additional fertilization', 'Monitor for pests'],
        confidence: 0.8,
        userId: 'user-123',
      });
    });

    it('should throw NotFoundException when farm does not exist', async () => {
      const request = {
        farmId: 'nonexistent-farm',
        analysisType: 'crop_health' as const,
        data: {},
        userId: 'user-123',
      };

      mockPrismaService.farm.findUnique.mockResolvedValue(null);

      await expect(service.analyzeFarm(request)).rejects.toThrow(NotFoundException);
    });
  });

  describe('analyzeMarket', () => {
    it('should analyze market data successfully', async () => {
      const request = {
        commodity: 'corn',
        region: 'US',
        timeframe: 'monthly' as const,
        analysisType: 'price_prediction' as const,
        userId: 'user-123',
      };

      const mockCompletion = {
        content: JSON.stringify({
          predictions: [
            { date: '2024-01-01', value: 5.50, confidence: 0.8 },
            { date: '2024-02-01', value: 5.75, confidence: 0.7 },
          ],
          insights: ['Price trending upward', 'Strong demand expected'],
          recommendations: ['Consider selling in February', 'Monitor weather patterns'],
          riskFactors: ['Weather volatility', 'Trade policy changes'],
        }),
        usage: {
          promptTokens: 40,
          completionTokens: 80,
          totalTokens: 120,
        },
      };

      const mockParsedResponse = {
        predictions: [
          { date: '2024-01-01', value: 5.50, confidence: 0.8 },
          { date: '2024-02-01', value: 5.75, confidence: 0.7 },
        ],
        insights: ['Price trending upward', 'Strong demand expected'],
        recommendations: ['Consider selling in February', 'Monitor weather patterns'],
        riskFactors: ['Weather volatility', 'Trade policy changes'],
      };

      mockOpenAIService.generateMarketAnalysis.mockResolvedValue(mockCompletion);
      mockOpenAIService.parseJsonResponse.mockReturnValue(mockParsedResponse);

      const result = await service.analyzeMarket(request);

      expect(result).toMatchObject({
        commodity: 'corn',
        region: 'US',
        analysisType: 'price_prediction',
        insights: ['Price trending upward', 'Strong demand expected'],
        recommendations: ['Consider selling in February', 'Monitor weather patterns'],
        riskFactors: ['Weather volatility', 'Trade policy changes'],
        userId: 'user-123',
      });
    });
  });

  describe('optimizeActivity', () => {
    it('should optimize farm activities successfully', async () => {
      const request = {
        farmId: 'farm-123',
        activityType: 'planting',
        constraints: {
          budget: 10000,
          time: 30,
          resources: ['tractor', 'seeds'],
        },
        objectives: ['maximize_yield', 'minimize_cost'] as ('maximize_yield' | 'minimize_cost' | 'minimize_time' | 'maximize_quality' | 'minimize_risk')[],
        userId: 'user-123',
      };

      const mockFarm = { id: 'farm-123', name: 'Test Farm' };
      const mockCompletion = {
        content: JSON.stringify({
          optimizedPlan: {
            schedule: [
              {
                date: '2024-03-01',
                activity: 'Soil preparation',
                resources: ['tractor'],
                cost: 2000,
              },
            ],
            totalCost: 8000,
            totalDuration: 25,
            expectedYield: 120,
            riskScore: 0.3,
          },
          alternatives: [
            {
              description: 'Extended timeline approach',
              pros: ['Lower risk', 'Better quality'],
              cons: ['Higher cost', 'Longer duration'],
              cost: 9500,
            },
          ],
        }),
        usage: {
          promptTokens: 60,
          completionTokens: 120,
          totalTokens: 180,
        },
      };

      const mockParsedResponse = {
        optimizedPlan: {
          schedule: [
            {
              date: '2024-03-01',
              activity: 'Soil preparation',
              resources: ['tractor'],
              cost: 2000,
            },
          ],
          totalCost: 8000,
          totalDuration: 25,
          expectedYield: 120,
          riskScore: 0.3,
        },
        alternatives: [
          {
            description: 'Extended timeline approach',
            pros: ['Lower risk', 'Better quality'],
            cons: ['Higher cost', 'Longer duration'],
            cost: 9500,
          },
        ],
      };

      mockPrismaService.farm.findUnique.mockResolvedValue(mockFarm as any);
      mockOpenAIService.generateActivityOptimization.mockResolvedValue(mockCompletion);
      mockOpenAIService.parseJsonResponse.mockReturnValue(mockParsedResponse);

      const result = await service.optimizeActivity(request);

      expect(result).toMatchObject({
        farmId: 'farm-123',
        activityType: 'planting',
        userId: 'user-123',
      });
      expect(result.optimizedPlan).toMatchObject({
        totalCost: 8000,
        totalDuration: 25,
        expectedYield: 120,
        riskScore: 0.3,
      });
    });
  });

  describe('getIntelligenceResponse', () => {
    it('should return intelligence response by ID', async () => {
      const mockResponse = {
        id: 'response-123',
        content: 'Test response',
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        createdAt: new Date(),
        userId: 'user-123',
        farmId: 'farm-123',
      };

      mockPrismaService.intelligenceResponse.findUnique.mockResolvedValue(mockResponse as any);

      const result = await service.getIntelligenceResponse('response-123');

      expect(result).toEqual({
        id: 'response-123',
        content: 'Test response',
        model: 'gpt-3.5-turbo',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        createdAt: mockResponse.createdAt,
        userId: 'user-123',
        farmId: 'farm-123',
      });
    });

    it('should throw NotFoundException when response does not exist', async () => {
      mockPrismaService.intelligenceResponse.findUnique.mockResolvedValue(null);

      await expect(service.getIntelligenceResponse('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listIntelligenceHistory', () => {
    it('should return paginated intelligence history', async () => {
      const mockResponses = [
        {
          id: 'response-1',
          content: 'Response 1',
          model: 'gpt-3.5-turbo',
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          createdAt: new Date(),
          userId: 'user-123',
        },
        {
          id: 'response-2',
          content: 'Response 2',
          model: 'gpt-4',
          usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
          createdAt: new Date(),
          userId: 'user-123',
        },
      ];

      mockPrismaService.intelligenceResponse.findMany.mockResolvedValue(mockResponses as any);
      mockPrismaService.intelligenceResponse.count.mockResolvedValue(2);

      const query = {
        page: 1,
        limit: 20,
        userId: 'user-123',
      };

      const result = await service.listIntelligenceHistory(query);

      expect(result).toMatchObject({
        data: [
          {
            id: 'response-1',
            content: 'Response 1',
            model: 'gpt-3.5-turbo',
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            createdAt: mockResponses[0].createdAt,
            userId: 'user-123',
          },
          {
            id: 'response-2',
            content: 'Response 2',
            model: 'gpt-4',
            usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
            createdAt: mockResponses[1].createdAt,
            userId: 'user-123',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when OpenAI API is accessible', async () => {
      mockOpenAIService.healthCheck.mockResolvedValue({
        status: 'healthy',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      });

      const result = await service.healthCheck();

      expect(result).toMatchObject({
        status: 'healthy',
        version: '1.0.0',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return unhealthy status when OpenAI API is not accessible', async () => {
      mockOpenAIService.healthCheck.mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result).toMatchObject({
        status: 'unhealthy',
        version: '1.0.0',
        models: [],
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

});
