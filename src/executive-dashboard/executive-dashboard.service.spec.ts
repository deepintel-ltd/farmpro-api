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
    name: 'Test User',
    isPlatformAdmin: false,
    roles: ['USER'],
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      plan: 'BASIC',
      status: 'ACTIVE',
    },
    permissions: [],
    capabilities: [],
  } as any;

  const mockTransactions = [
    {
      id: 'tx-1',
      organizationId: 'org-123',
      orderId: 'order-1',
      farmId: 'farm-1',
      categoryId: 'cat-1',
      type: 'FARM_REVENUE' as any,
      amount: 10000 as any,
      currency: 'USD' as any,
      status: 'COMPLETED' as any,
      description: 'Test transaction',
      dueDate: null,
      paidAt: null,
      metadata: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      reference: 'REF-001',
      paidDate: null,
      requiresApproval: false,
      approvedBy: null,
      approvedAt: null,
    },
    {
      id: 'tx-2',
      organizationId: 'org-123',
      orderId: 'order-2',
      farmId: 'farm-1',
      categoryId: 'cat-2',
      type: 'FARM_EXPENSE' as any,
      amount: 6000 as any,
      currency: 'USD' as any,
      status: 'COMPLETED' as any,
      description: 'Test transaction',
      dueDate: null,
      paidAt: null,
      metadata: {},
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      reference: 'REF-002',
      paidDate: null,
      requiresApproval: false,
      approvedBy: null,
      approvedAt: null,
    },
  ] as any;

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

      expect((result as any).score).toBeDefined();
      expect((result as any).grade).toBeDefined();
      expect((result as any).factors).toBeDefined();
      expect((result as any).factors.cashFlow).toBeGreaterThanOrEqual(0);
      expect((result as any).factors.profitability).toBeGreaterThanOrEqual(0);
      expect((result as any).factors.growth).toBeGreaterThanOrEqual(0);
      expect((result as any).factors.efficiency).toBeGreaterThanOrEqual(0);
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

      expect((result as any).overallRisk).toBeDefined();
      expect((result as any).indicators).toBeDefined();
      expect((result as any).indicators.overduePayments).toBeDefined();
      expect((result as any).indicators.budgetVariance).toBeDefined();
      expect((result as any).indicators.cashFlowRisk).toBeDefined();
      expect((result as any).indicators.marketRisk).toBeDefined();
      expect((result as any).indicators.operationalRisk).toBeDefined();
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

      expect((result as any).currentCashFlow).toBeDefined();
      expect((result as any).currentCashFlow.amount).toBeDefined();
      expect((result as any).currentCashFlow.currency).toBe('USD');
      expect((result as any).breakdown).toBeDefined();
      expect((result as any).breakdown.operating).toBeDefined();
      expect((result as any).breakdown.investing).toBeDefined();
      expect((result as any).breakdown.financing).toBeDefined();
      expect((result as any).burnRate).toBeDefined();
      expect((result as any).runway).toBeDefined();
    });
  });

  describe('getPendingActions', () => {
    it('should return pending actions', async () => {
      const mockPendingTransactions = [
        {
          id: 'tx-pending-1',
          organizationId: 'org-123',
          orderId: 'order-3',
          farmId: 'farm-1',
          categoryId: 'cat-3',
          type: 'FARM_EXPENSE' as any,
          amount: 1000 as any,
          currency: 'USD' as any,
          status: 'PENDING' as any,
          description: 'Test transaction',
          dueDate: new Date('2024-12-31'),
          paidAt: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          reference: 'REF-003',
          paidDate: null,
          requiresApproval: false,
          approvedBy: null,
          approvedAt: null,
        },
      ] as any;

      jest.spyOn(prismaService.transaction, 'findMany').mockResolvedValue(mockPendingTransactions);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await service.getPendingActions(mockUser, {
        limit: 10,
        useCache: false,
      });

      expect(Array.isArray(result)).toBe(true);
      expect((result as any).length).toBeGreaterThanOrEqual(0);
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
