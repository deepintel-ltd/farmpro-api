import { Test, TestingModule } from '@nestjs/testing';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { CurrencyService } from '../common/services/currency.service';

describe('ExecutiveDashboardService', () => {
  let service: ExecutiveDashboardService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockUser = {
    userId: 'user-123',
    organizationId: 'org-123',
    email: 'test@example.com',
  };

  const mockTransactions = [
    {
      id: 'tx-1',
      type: 'FARM_REVENUE',
      amount: 10000,
      currency: 'USD',
      status: 'COMPLETED',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'tx-2',
      type: 'FARM_EXPENSE',
      amount: 6000,
      currency: 'USD',
      status: 'COMPLETED',
      createdAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutiveDashboardService,
        {
          provide: PrismaService,
          useValue: {
            transaction: {
              findMany: jest.fn(),
            },
            order: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: CurrencyService,
          useValue: {
            convert: jest.fn(),
            getExchangeRate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExecutiveDashboardService>(ExecutiveDashboardService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateFinancialHealth', () => {
    it('should calculate correct health score', async () => {
      jest.spyOn(prismaService.transaction, 'findMany').mockResolvedValue(mockTransactions);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await service.calculateFinancialHealth(mockUser, {
        period: 'month',
        currency: 'USD',
        includeBreakdown: true,
        useCache: false,
      });

      expect(result.score).toBeDefined();
      expect(result.grade).toBeDefined();
      expect(result.factors).toBeDefined();
      expect(result.factors.cashFlow).toBeGreaterThanOrEqual(0);
      expect(result.factors.profitability).toBeGreaterThanOrEqual(0);
      expect(result.factors.growth).toBeGreaterThanOrEqual(0);
      expect(result.factors.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should return cached result when available', async () => {
      const cachedResult = {
        score: 85,
        grade: 'B',
        factors: {
          cashFlow: 80,
          profitability: 85,
          growth: 90,
          efficiency: 85,
        },
        trend: 5.2,
        recommendations: ['Test recommendation'],
        lastCalculated: new Date().toISOString(),
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedResult);

      const result = await service.calculateFinancialHealth(mockUser, {
        period: 'month',
        currency: 'USD',
        includeBreakdown: true,
        useCache: true,
      });

      expect(result).toEqual(cachedResult);
      expect(prismaService.transaction.findMany).not.toHaveBeenCalled();
    });
  });

  describe('calculateRiskIndicators', () => {
    it('should calculate risk indicators correctly', async () => {
      jest.spyOn(prismaService.transaction, 'findMany').mockResolvedValue(mockTransactions);
      jest.spyOn(prismaService.order, 'findMany').mockResolvedValue([]);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await service.calculateRiskIndicators(mockUser, {
        currency: 'USD',
        includeAlerts: true,
        useCache: false,
      });

      expect(result.overallRisk).toBeDefined();
      expect(result.indicators).toBeDefined();
      expect(result.indicators.overduePayments).toBeDefined();
      expect(result.indicators.budgetVariance).toBeDefined();
      expect(result.indicators.cashFlowRisk).toBeDefined();
      expect(result.indicators.marketRisk).toBeDefined();
      expect(result.indicators.operationalRisk).toBeDefined();
    });
  });

  describe('calculateCashFlowAnalysis', () => {
    it('should calculate cash flow analysis correctly', async () => {
      jest.spyOn(prismaService.transaction, 'findMany').mockResolvedValue(mockTransactions);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await service.calculateCashFlowAnalysis(mockUser, {
        period: 'month',
        currency: 'USD',
        includeProjections: true,
        projectionMonths: 6,
        useCache: false,
      });

      expect(result.currentCashFlow).toBeDefined();
      expect(result.currentCashFlow.amount).toBeDefined();
      expect(result.currentCashFlow.currency).toBe('USD');
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.operating).toBeDefined();
      expect(result.breakdown.investing).toBeDefined();
      expect(result.breakdown.financing).toBeDefined();
      expect(result.burnRate).toBeDefined();
      expect(result.runway).toBeDefined();
    });
  });

  describe('getPendingActions', () => {
    it('should return pending actions', async () => {
      const mockPendingTransactions = [
        {
          id: 'tx-pending-1',
          description: 'Test transaction',
          amount: 1000,
          dueDate: new Date('2024-12-31'),
          createdBy: { name: 'Test User', email: 'test@example.com' },
        },
      ];

      jest.spyOn(prismaService.transaction, 'findMany').mockResolvedValue(mockPendingTransactions);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await service.getPendingActions(mockUser, {
        limit: 10,
        useCache: false,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getExecutiveInsights', () => {
    it('should return executive insights', async () => {
      jest.spyOn(prismaService.transaction, 'findMany').mockResolvedValue(mockTransactions);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await service.getExecutiveInsights(mockUser, {
        limit: 10,
        useCache: false,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
