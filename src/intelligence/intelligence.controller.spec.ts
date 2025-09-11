import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

describe('IntelligenceController', () => {
  let controller: IntelligenceController;
  let intelligenceService: IntelligenceService;

  const mockIntelligenceService = {
    generateResponse: jest.fn(),
    analyzeFarm: jest.fn(),
    getFarmAnalysis: jest.fn(),
    listIntelligenceHistory: jest.fn(),
    analyzeMarket: jest.fn(),
    getMarketAnalysis: jest.fn(),
    optimizeActivity: jest.fn(),
    getActivityOptimization: jest.fn(),
    getIntelligenceResponse: jest.fn(),
    healthCheck: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntelligenceController],
      providers: [
        {
          provide: IntelligenceService,
          useValue: mockIntelligenceService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<IntelligenceController>(IntelligenceController);
    intelligenceService = module.get<IntelligenceService>(IntelligenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should call intelligence service with user ID from request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      const mockBody = {
        prompt: 'What is the best time to plant corn?',
        farmId: 'farm-123',
        model: 'gpt-3.5-turbo' as const,
        temperature: 0.7,
        maxTokens: 1000,
      };

      const mockResponse = {
        id: 'response-123',
        content: 'The best time to plant corn is in late spring.',
        model: 'gpt-3.5-turbo',
        usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 },
        createdAt: new Date(),
        userId: 'user-123',
        farmId: 'farm-123',
      };

      mockIntelligenceService.generateResponse.mockResolvedValue(mockResponse);

      const handler = await controller.generateResponse(mockRequest as any);
      const result = await handler({ headers: {} as any, body: mockBody });

      expect(intelligenceService.generateResponse).toHaveBeenCalledWith({
        ...mockBody,
        userId: 'user-123',
      });
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('analyzeFarm', () => {
    it('should call intelligence service with user ID from request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      const mockBody = {
        farmId: 'farm-123',
        analysisType: 'crop_health' as const,
        data: { cropType: 'corn', yield: 150 },
      };

      const mockResponse = {
        id: 'analysis-123',
        farmId: 'farm-123',
        analysisType: 'crop_health',
        insights: ['Crop health is good'],
        recommendations: ['Consider additional fertilization'],
        confidence: 0.8,
        data: { healthScore: 85 },
        createdAt: new Date(),
        userId: 'user-123',
      };

      mockIntelligenceService.analyzeFarm.mockResolvedValue(mockResponse);

      const handler = await controller.analyzeFarm(mockRequest as any);
      const result = await handler({ headers: {} as any, body: mockBody });

      expect(intelligenceService.analyzeFarm).toHaveBeenCalledWith({
        ...mockBody,
        userId: 'user-123',
      });
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('getFarmAnalysis', () => {
    it('should call intelligence service with analysis ID', async () => {
      const mockResponse = {
        id: 'analysis-123',
        farmId: 'farm-123',
        analysisType: 'crop_health',
        insights: ['Crop health is good'],
        recommendations: ['Consider additional fertilization'],
        confidence: 0.8,
        data: { healthScore: 85 },
        createdAt: new Date(),
        userId: 'user-123',
      };

      mockIntelligenceService.getFarmAnalysis.mockResolvedValue(mockResponse);

      const handler = await controller.getFarmAnalysis();
      const result = await handler({ headers: {} as any, params: { id: 'analysis-123' } });

      expect(intelligenceService.getFarmAnalysis).toHaveBeenCalledWith('analysis-123');
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('listFarmAnalyses', () => {
    it('should call intelligence service with user ID from request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      const mockQuery = {
        page: 1,
        limit: 20,
        farmId: 'farm-123',
      };

      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockIntelligenceService.listIntelligenceHistory.mockResolvedValue(mockResponse);

      const handler = await controller.listFarmAnalyses(mockRequest as any);
      const result = await handler({ headers: {} as any, query: mockQuery });

      expect(intelligenceService.listIntelligenceHistory).toHaveBeenCalledWith({
        ...mockQuery,
        userId: 'user-123',
      });
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('analyzeMarket', () => {
    it('should call intelligence service with user ID from request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      const mockBody = {
        commodity: 'corn',
        region: 'US',
        timeframe: 'monthly' as const,
        analysisType: 'price_prediction' as const,
      };

      const mockResponse = {
        id: 'market-analysis-123',
        commodity: 'corn',
        region: 'US',
        analysisType: 'price_prediction',
        predictions: [],
        insights: ['Price trending upward'],
        recommendations: ['Consider selling in February'],
        riskFactors: ['Weather volatility'],
        createdAt: new Date(),
        userId: 'user-123',
      };

      mockIntelligenceService.analyzeMarket.mockResolvedValue(mockResponse);

      const handler = await controller.analyzeMarket(mockRequest as any);
      const result = await handler({ headers: {} as any, body: mockBody });

      expect(intelligenceService.analyzeMarket).toHaveBeenCalledWith({
        ...mockBody,
        userId: 'user-123',
      });
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('getMarketAnalysis', () => {
    it('should call intelligence service with analysis ID', async () => {
      const mockResponse = {
        id: 'market-analysis-123',
        commodity: 'corn',
        region: 'US',
        analysisType: 'price_prediction',
        predictions: [],
        insights: ['Price trending upward'],
        recommendations: ['Consider selling in February'],
        riskFactors: ['Weather volatility'],
        createdAt: new Date(),
        userId: 'user-123',
      };

      mockIntelligenceService.getMarketAnalysis.mockResolvedValue(mockResponse);

      const handler = await controller.getMarketAnalysis();
      const result = await handler({ headers: {} as any, params: { id: 'market-analysis-123' } });

      expect(intelligenceService.getMarketAnalysis).toHaveBeenCalledWith('market-analysis-123');
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('listMarketAnalyses', () => {
    it('should call intelligence service with user ID from request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      const mockQuery = {
        page: 1,
        limit: 20,
        type: 'market_intelligence' as const,
      };

      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockIntelligenceService.listIntelligenceHistory.mockResolvedValue(mockResponse);

      const handler = await controller.listMarketAnalyses(mockRequest as any);
      const result = await handler({ headers: {} as any, query: mockQuery });

      expect(intelligenceService.listIntelligenceHistory).toHaveBeenCalledWith({
        ...mockQuery,
        userId: 'user-123',
      });
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('optimizeActivity', () => {
    it('should call intelligence service with user ID from request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      const mockBody = {
        farmId: 'farm-123',
        activityType: 'planting',
        constraints: {
          budget: 10000,
          time: 30,
          resources: ['tractor', 'seeds'],
        },
        objectives: ['maximize_yield', 'minimize_cost'] as ('maximize_yield' | 'minimize_cost' | 'minimize_time' | 'maximize_quality' | 'minimize_risk')[],
      };

      const mockResponse = {
        id: 'optimization-123',
        farmId: 'farm-123',
        activityType: 'planting',
        optimizedPlan: {
          schedule: [],
          totalCost: 8000,
          totalDuration: 25,
          expectedYield: 120,
          riskScore: 0.3,
        },
        alternatives: [],
        createdAt: new Date(),
        userId: 'user-123',
      };

      mockIntelligenceService.optimizeActivity.mockResolvedValue(mockResponse);

      const handler = await controller.optimizeActivity(mockRequest as any);
      const result = await handler({ headers: {} as any, body: mockBody });

      expect(intelligenceService.optimizeActivity).toHaveBeenCalledWith({
        ...mockBody,
        userId: 'user-123',
      });
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('getActivityOptimization', () => {
    it('should call intelligence service with optimization ID', async () => {
      const mockResponse = {
        id: 'optimization-123',
        farmId: 'farm-123',
        activityType: 'planting',
        optimizedPlan: {
          schedule: [],
          totalCost: 8000,
          totalDuration: 25,
          expectedYield: 120,
          riskScore: 0.3,
        },
        alternatives: [],
        createdAt: new Date(),
        userId: 'user-123',
      };

      mockIntelligenceService.getActivityOptimization.mockResolvedValue(mockResponse);

      const handler = await controller.getActivityOptimization();
      const result = await handler({ headers: {} as any, params: { id: 'optimization-123' } });

      expect(intelligenceService.getActivityOptimization).toHaveBeenCalledWith('optimization-123');
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('listActivityOptimizations', () => {
    it('should call intelligence service with user ID from request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      const mockQuery = {
        page: 1,
        limit: 20,
        type: 'activity_optimization' as const,
      };

      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockIntelligenceService.listIntelligenceHistory.mockResolvedValue(mockResponse);

      const handler = await controller.listActivityOptimizations(mockRequest as any);
      const result = await handler({ headers: {} as any, query: mockQuery });

      expect(intelligenceService.listIntelligenceHistory).toHaveBeenCalledWith({
        ...mockQuery,
        userId: 'user-123',
      });
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('getIntelligenceHistory', () => {
    it('should call intelligence service with user ID from request', async () => {
      const mockRequest = {
        user: { id: 'user-123' },
      };

      const mockQuery = {
        page: 1,
        limit: 20,
      };

      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockIntelligenceService.listIntelligenceHistory.mockResolvedValue(mockResponse);

      const handler = await controller.getIntelligenceHistory(mockRequest as any);
      const result = await handler({ headers: {} as any, query: mockQuery });

      expect(intelligenceService.listIntelligenceHistory).toHaveBeenCalledWith({
        ...mockQuery,
        userId: 'user-123',
      });
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('getIntelligenceResponse', () => {
    it('should call intelligence service with response ID', async () => {
      const mockResponse = {
        id: 'response-123',
        content: 'Test response',
        model: 'gpt-3.5-turbo',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        createdAt: new Date(),
        userId: 'user-123',
        farmId: 'farm-123',
      };

      mockIntelligenceService.getIntelligenceResponse.mockResolvedValue(mockResponse);

      const handler = await controller.getIntelligenceResponse();
      const result = await handler({ headers: {} as any, params: { id: 'response-123' } });

      expect(intelligenceService.getIntelligenceResponse).toHaveBeenCalledWith('response-123');
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });

  describe('health', () => {
    it('should call intelligence service health check', async () => {
      const mockResponse = {
        status: 'healthy' as const,
        timestamp: new Date(),
        version: '1.0.0',
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      };

      mockIntelligenceService.healthCheck.mockResolvedValue(mockResponse);

      const handler = await controller.health();
      const result = await handler({ headers: {} as any });

      expect(intelligenceService.healthCheck).toHaveBeenCalled();
      expect(result).toEqual({
        status: 200,
        body: mockResponse,
      });
    });
  });
});
