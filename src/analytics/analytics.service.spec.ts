import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPermissionsService } from './permissions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsPeriod } from './dto/analytics.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let permissionsService: AnalyticsPermissionsService;

  const mockUser: CurrentUser = {
    userId: 'test-user-id',
    email: 'test@example.com',
    organizationId: 'test-org-id',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: AnalyticsPermissionsService,
          useValue: {
            validateDashboardAccess: jest.fn().mockResolvedValue(true),
            validateProfitabilityAccess: jest.fn().mockResolvedValue(true),
            validateMarketResearchAccess: jest.fn().mockResolvedValue(true),
            validatePlanningAccess: jest.fn().mockResolvedValue(true),
            canUseAdvancedAnalytics: jest.fn().mockResolvedValue(true),
            canExportData: jest.fn().mockResolvedValue(true),
            canReadReports: jest.fn().mockResolvedValue(true),
            canCreateReports: jest.fn().mockResolvedValue(true),
            canScheduleReports: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    permissionsService = module.get<AnalyticsPermissionsService>(AnalyticsPermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return dashboard analytics data', async () => {
      const query = {
        period: AnalyticsPeriod.MONTH,
        farmId: 'test-farm-id',
      };

      const result = await service.getDashboard(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_dashboard');
      expect(result.data.attributes.period).toBe(AnalyticsPeriod.MONTH);
      expect(result.data.attributes.farmId).toBe('test-farm-id');
      expect(result.data.attributes.metrics).toBeDefined();
      expect(result.data.attributes.charts).toBeDefined();
      expect(result.data.attributes.insights).toBeDefined();
      expect(result.data.attributes.summary).toBeDefined();
    });

    it('should throw error when user lacks permissions', async () => {
      jest.spyOn(permissionsService, 'validateDashboardAccess').mockResolvedValue(false);

      const query = {
        period: AnalyticsPeriod.MONTH,
        farmId: 'test-farm-id',
      };

      await expect(service.getDashboard(mockUser, query)).rejects.toThrow('Insufficient permissions to access dashboard analytics');
    });
  });

  describe('getProfitability', () => {
    it('should return profitability analytics data', async () => {
      const query = {
        period: AnalyticsPeriod.MONTH,
        farmId: 'test-farm-id',
      };

      const result = await service.getProfitability(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_dashboard');
      expect(result.data.attributes.period).toBe(AnalyticsPeriod.MONTH);
      expect(result.data.attributes.farmId).toBe('test-farm-id');
    });

    it('should throw error when user lacks finance permissions', async () => {
      jest.spyOn(permissionsService, 'validateProfitabilityAccess').mockResolvedValue(false);

      const query = {
        period: AnalyticsPeriod.MONTH,
        farmId: 'test-farm-id',
      };

      await expect(service.getProfitability(mockUser, query)).rejects.toThrow('Insufficient permissions to access profitability analytics');
    });
  });

  describe('getMarketPositioning', () => {
    it('should return market positioning analytics data', async () => {
      const query = {
        commodityId: 'test-commodity-id',
        region: 'test-region',
      };

      const result = await service.getMarketPositioning(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_dashboard');
    });

    it('should throw error when user lacks market research permissions', async () => {
      jest.spyOn(permissionsService, 'validateMarketResearchAccess').mockResolvedValue(false);

      const query = {
        commodityId: 'test-commodity-id',
        region: 'test-region',
      };

      await expect(service.getMarketPositioning(mockUser, query)).rejects.toThrow('Insufficient permissions to access market positioning analytics');
    });
  });

  describe('getDemandPrediction', () => {
    it('should return demand prediction data', async () => {
      const query = {
        commodityId: 'test-commodity-id',
        horizon: 3,
      };

      const result = await service.getDemandPrediction(mockUser, query);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_dashboard');
    });

    it('should throw error when user lacks planning permissions', async () => {
      jest.spyOn(permissionsService, 'validatePlanningAccess').mockResolvedValue(false);

      const query = {
        commodityId: 'test-commodity-id',
        horizon: 3,
      };

      await expect(service.getDemandPrediction(mockUser, query)).rejects.toThrow('Insufficient permissions to access demand prediction');
    });
  });

  describe('executeCustomQuery', () => {
    it('should execute custom query', async () => {
      const request = {
        metrics: ['revenue', 'costs'],
        dimensions: ['farm', 'commodity'],
        filters: {},
        timeframe: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        granularity: 'day' as any,
        visualization: {
          type: 'line' as any,
          options: {},
        },
      };

      const result = await service.executeCustomQuery(mockUser, request);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_dashboard');
    });

    it('should throw error when user lacks advanced analytics permissions', async () => {
      jest.spyOn(permissionsService, 'canUseAdvancedAnalytics').mockResolvedValue(false);

      const request = {
        metrics: ['revenue', 'costs'],
        dimensions: ['farm', 'commodity'],
        filters: {},
        timeframe: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        granularity: 'day' as any,
        visualization: {
          type: 'line' as any,
          options: {},
        },
      };

      await expect(service.executeCustomQuery(mockUser, request)).rejects.toThrow('Insufficient permissions to execute custom queries');
    });
  });

  describe('createDataExport', () => {
    it('should create data export', async () => {
      const request = {
        dataset: 'farm_production',
        format: 'csv' as any,
        timeframe: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        includeMetadata: true,
      };

      const result = await service.createDataExport(mockUser, request);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_export');
      expect(result.data.attributes.status).toBe('pending');
    });

    it('should throw error when user lacks export permissions', async () => {
      jest.spyOn(permissionsService, 'canExportData').mockResolvedValue(false);

      const request = {
        dataset: 'farm_production',
        format: 'csv' as any,
        timeframe: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        includeMetadata: true,
      };

      await expect(service.createDataExport(mockUser, request)).rejects.toThrow('Insufficient permissions to create data exports');
    });
  });

  describe('generateReport', () => {
    it('should generate report', async () => {
      const request = {
        templateId: 'template-1',
        title: 'Monthly Report',
        parameters: {
          period: '2024-01',
          farmIds: ['test-farm-id'],
          commodities: ['test-commodity-id'],
          includeComparisons: true,
          includePredictions: false,
        },
        format: 'pdf' as any,
        recipients: ['user@example.com'],
      };

      const result = await service.generateReport(mockUser, request);

      expect(result).toBeDefined();
      expect(result.data.type).toBe('analytics_report');
      expect(result.data.attributes.status).toBe('pending');
    });

    it('should throw error when user lacks report creation permissions', async () => {
      jest.spyOn(permissionsService, 'canCreateReports').mockResolvedValue(false);

      const request = {
        templateId: 'template-1',
        title: 'Monthly Report',
        parameters: {
          period: '2024-01',
          farmIds: ['test-farm-id'],
          commodities: ['test-commodity-id'],
          includeComparisons: true,
          includePredictions: false,
        },
        format: 'pdf' as any,
        recipients: ['user@example.com'],
      };

      await expect(service.generateReport(mockUser, request)).rejects.toThrow('Insufficient permissions to generate reports');
    });
  });
});
