import { AnalyticsService } from './analytics.service';
import { CacheService } from '../common/services/cache.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { JobQueueService } from '../common/services/job-queue.service';
import { CurrencyService } from '../common/services/currency.service';
import { MonitoringService } from '../common/services/monitoring.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  BaseAnalyticsQuery, 
  FinancialQuery, 
  ActivityQuery, 
  MarketQuery,
  ExportRequest,
  ReportRequest
} from '../../contracts/analytics.contract';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockIntelligenceService: jest.Mocked<IntelligenceService>;
  let mockPrismaService: any;
  let mockJobQueueService: jest.Mocked<JobQueueService>;
  let mockCurrencyService: jest.Mocked<CurrencyService>;
  let mockMonitoringService: jest.Mocked<MonitoringService>;

  const mockUser: CurrentUser = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    name: 'Test User',
    organizationId: '550e8400-e29b-41d4-a716-446655440001',
    isPlatformAdmin: false,
    roles: [{
      id: 'role-1',
      name: 'Analyst',
      level: 50,
    }],
    organization: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test Organization',
      type: 'FARM' as any,
      plan: 'basic',
      features: ['analytics'],
      allowedModules: ['analytics'],
      isVerified: true,
      isSuspended: false,
    },
    permissions: ['analytics:read'],
    capabilities: ['analytics'],
  };

  beforeEach(() => {
    mockPrismaService = {
      transaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 }, _count: { id: 5 } })
      },
      farmActivity: {
        count: jest.fn().mockResolvedValue(10),
        aggregate: jest.fn().mockResolvedValue({ _avg: { actualDuration: 8 } })
      },
      order: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', totalAmount: 500, buyerId: 'buyer1' },
          { id: '2', totalAmount: 300, buyerId: 'buyer2' }
        ]),
        count: jest.fn().mockResolvedValue(5),
        aggregate: jest.fn().mockResolvedValue({ 
          _sum: { totalPrice: 1000 }, 
          _avg: { totalPrice: 200 } 
        }),
        groupBy: jest.fn().mockResolvedValue([
          { buyerOrgId: 'buyer1', _count: { buyerOrgId: 2 } },
          { buyerOrgId: 'buyer2', _count: { buyerOrgId: 1 } }
        ])
      },
      cropCycle: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', status: 'COMPLETED', commodity: { name: 'Wheat' } },
          { id: '2', status: 'ACTIVE', commodity: { name: 'Corn' } }
        ]),
        count: jest.fn().mockResolvedValue(2),
        aggregate: jest.fn().mockResolvedValue({ _sum: { actualYield: 1000 } })
      },
      harvest: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', quantity: 500, cropCycle: { commodity: { name: 'Wheat' } } }
        ]),
        aggregate: jest.fn().mockResolvedValue({ 
          _avg: { quantity: 500 }, 
          _count: { id: 1 } 
        })
      }
    };
    // Create deep mocks for all dependencies
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      generateQueryHash: jest.fn().mockReturnValue('test-hash'),
    } as any;

    mockIntelligenceService = {
      analyzeFarm: jest.fn().mockResolvedValue({
        insights: ['Test insight'],
        recommendations: ['Test recommendation'],
        confidence: 0.8,
        model: 'gpt-4',
      }),
    } as any;

    mockJobQueueService = {
      addJob: jest.fn(),
      processJob: jest.fn(),
    } as any;

    mockCurrencyService = {
      convertCurrency: jest.fn().mockResolvedValue(1000),
      getExchangeRate: jest.fn().mockResolvedValue(1.0),
    } as any;

    mockMonitoringService = {
      recordMetric: jest.fn(),
      recordEvent: jest.fn(),
      trackPerformance: jest.fn(),
    } as any;

    // Create service instance with mocked dependencies
    service = new AnalyticsService(
      mockPrismaService,
      mockCacheService,
      mockIntelligenceService,
      mockJobQueueService,
      mockMonitoringService,
      mockCurrencyService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return dashboard analytics data', async () => {
      const query: BaseAnalyticsQuery = {
        period: 'month',
        farmId: 'clx1234567890123456789012',
        includeInsights: true,
        useCache: true,
      };

      const result = await service.getDashboard(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_dashboard');
      expect(result.data.attributes.period).toBe('month');
      expect(result.data.attributes.farmId).toBe('clx1234567890123456789012');
      expect(result.data.attributes.metrics).toBeDefined();
      expect(result.data.attributes.charts).toBeDefined();
      expect(result.data.attributes.summary).toBeDefined();
    });

    it('should use cache when enabled', async () => {
      jest.spyOn(mockCacheService, 'get').mockResolvedValue({
        data: {
          type: 'analytics_dashboard',
          id: 'dashboard',
          attributes: {
            period: 'month',
            metrics: [],
            charts: [],
            summary: { totalRevenue: 0, totalCosts: 0, netProfit: 0, profitMargin: 0, roi: 0, efficiency: 0, sustainability: 0 },
            generatedAt: new Date().toISOString(),
          },
        },
      });

      const query: BaseAnalyticsQuery = {
        period: 'month',
        useCache: true,
      };

      const result = await service.getDashboard(mockUser, query);
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getFinancialAnalytics', () => {
    it('should return financial analytics data', async () => {
      const query: FinancialQuery = {
        period: 'month',
        farmId: 'clx1234567890123456789012',
        includeInsights: true,
        useCache: true,
      };

      const result = await service.getFinancialAnalytics(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_financial');
      expect(result.data.attributes.period).toBe('month');
      expect(result.data.attributes.metrics).toBeDefined();
      expect(result.data.attributes.charts).toBeDefined();
      expect(result.data.attributes.summary).toBeDefined();
    });
  });

  describe('getActivityAnalytics', () => {
    it('should return activity analytics data', async () => {
      const query: ActivityQuery = {
        period: 'month',
        farmId: 'clx1234567890123456789012',
        activityType: 'PLANTING',
        includeEfficiency: true,
        includeCosts: true,
        useCache: true,
      };

      const result = await service.getActivityAnalytics(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_activities');
      expect(result.data.attributes.period).toBe('month');
      expect(result.data.attributes.metrics).toBeDefined();
      expect(result.data.attributes.charts).toBeDefined();
      expect(result.data.attributes.summary).toBeDefined();
    });
  });

  describe('getMarketAnalytics', () => {
    it('should return market analytics data', async () => {
      const query: MarketQuery = {
        period: 'month',
        farmId: 'clx1234567890123456789012',
        commodityId: 'test-commodity-id',
        includePredictions: true,
        useCache: true,
      };

      const result = await service.getMarketAnalytics(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_market');
      expect(result.data.attributes.period).toBe('month');
      expect(result.data.attributes.metrics).toBeDefined();
      expect(result.data.attributes.charts).toBeDefined();
      expect(result.data.attributes.summary).toBeDefined();
    });
  });

  describe('getFarmToMarketAnalytics', () => {
    it('should return farm-to-market analytics data', async () => {
      const query: MarketQuery = {
        period: 'month',
        farmId: 'clx1234567890123456789012',
        useCache: true,
      };

      const result = await service.getFarmToMarketAnalytics(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_farm-to-market');
      expect(result.data.attributes.period).toBe('month');
      expect(result.data.attributes.metrics).toBeDefined();
      expect(result.data.attributes.charts).toBeDefined();
      expect(result.data.attributes.summary).toBeDefined();
    });
  });

  describe('getInsights', () => {
    it('should return AI-powered insights', async () => {
      const query: BaseAnalyticsQuery = {
        period: 'month',
        farmId: 'clx1234567890123456789012',
        includeInsights: true,
        useCache: true,
      };

      const result = await service.getInsights(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_insights');
      expect(result.data.attributes.insights).toBeDefined();
      expect(result.data.attributes.model).toBe('gpt-4');
    });
  });

  describe('exportAnalytics', () => {
    it('should create analytics export', async () => {
      const request: ExportRequest = {
        type: 'dashboard',
        format: 'csv',
        period: 'month',
        farmId: 'clx1234567890123456789012',
        includeCharts: false,
        includeInsights: true,
      };

      const result = await service.exportAnalytics(mockUser, request);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_export');
      expect(result.data.attributes.status).toBe('processing');
    });
  });

  describe('generateReport', () => {
    it('should generate analytics report', async () => {
      const request: ReportRequest = {
        title: 'Monthly Report',
        type: 'dashboard',
        period: 'month',
        farmIds: ['clx1234567890123456789012'],
        commodities: ['test-commodity-id'],
        includeComparisons: true,
        includePredictions: false,
        format: 'pdf',
        recipients: ['user@example.com'],
      };

      const result = await service.generateReport(mockUser, request);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_report');
      expect(result.data.attributes.status).toBe('generating');
    });
  });
});
