import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import { TransactionType, TransactionStatus, ActivityType, ActivityStatus, CropStatus } from '@prisma/client';

// Mock Intelligence service

describe('Analytics E2E Tests', () => {
  let testContext: TestContext;
  let accessToken: string;
  let user: any;
  let organization: any;
  let farm: any;
  let commodity: any;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up analytics-related tables before each test
    await testContext.cleanupTables([
      'transactions',
      'farm_activities',
      'crop_cycles',
      'harvests',
      'orders',
      'user_roles',
      'role_permissions',
      'roles',
      'permissions',
      'users',
      'organizations',
      'seasons',
      'areas',
      'commodities'
    ]);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create test organization first with analytics features
    organization = await testContext.createOrganization({
      plan: 'professional', // Professional plan includes analytics
      features: ['farm_management', 'activities', 'inventory', 'analytics', 'marketplace', 'orders', 'trading', 'deliveries', 'observations', 'crop_cycles', 'intelligence'],
      allowedModules: ['farm_management', 'activities', 'inventory', 'analytics', 'observations', 'sensors', 'crop_cycles', 'areas', 'seasons']
    });
    
    // Create test farm first
    farm = await testContext.createFarm({
      organization: { connect: { id: organization.id } },
      name: 'Test Analytics Farm',
      totalArea: 100.0,
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Analytics Farm Road, Test City, TC 12345'
      },
      cropTypes: ['corn', 'soybeans'],
      establishedDate: new Date('2020-01-01'),
      certifications: ['organic'],
      isActive: true
    });

    // Create test user and get access token
    const hashedPassword = await hash('TestPassword123!');
    user = await testContext.createUser({
      email: 'analytics-test@example.com',
      name: 'Analytics Test User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: organization.id
    });

    // Update the user role to include the farmId
    await testContext.prisma.userRole.updateMany({
      where: {
        userId: user.id,
        farmId: null
      },
      data: {
        farmId: farm.id
      }
    });

    // Create test commodity
    commodity = await testContext.createCommodity({
      name: 'Test Corn',
      category: 'grain',
      variety: 'yellow',
      qualityGrade: 'premium',
      quantity: 1000.0,
      unit: 'bushel',
      harvestDate: new Date(),
      storageLocation: 'Test Storage',
      farm: { connect: { id: farm.id } },
      isActive: true
    });

    // Create analytics-specific permissions using upsert
    const analyticsPermissions = await Promise.all([
      testContext.prisma.permission.upsert({
        where: { resource_action: { resource: 'analytics', action: 'read' } },
        update: {},
        create: {
          resource: 'analytics',
          action: 'read',
          description: 'Read analytics data'
        }
      }),
      testContext.prisma.permission.upsert({
        where: { resource_action: { resource: 'analytics', action: 'export' } },
        update: {},
        create: {
          resource: 'analytics',
          action: 'export',
          description: 'Export analytics data'
        }
      }),
      testContext.prisma.permission.upsert({
        where: { resource_action: { resource: 'finance', action: 'read' } },
        update: {},
        create: {
          resource: 'finance',
          action: 'read',
          description: 'Read financial data'
        }
      }),
      testContext.prisma.permission.upsert({
        where: { resource_action: { resource: 'market', action: 'read' } },
        update: {},
        create: {
          resource: 'market',
          action: 'read',
          description: 'Read market data'
        }
      }),
      testContext.prisma.permission.upsert({
        where: { resource_action: { resource: 'reports', action: 'create' } },
        update: {},
        create: {
          resource: 'reports',
          action: 'create',
          description: 'Create reports'
        }
      })
    ]);

    // Create admin role
    const adminRole = await testContext.prisma.role.create({
      data: {
        name: 'Admin',
        description: 'Administrator role with full access',
        organizationId: organization.id
      }
    });

    // Assign analytics permissions to admin role
    await Promise.all(
      analyticsPermissions.map(permission =>
        testContext.prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id
            }
          },
          update: { granted: true },
          create: {
            roleId: adminRole.id,
            permissionId: permission.id,
            granted: true
          }
        })
      )
    );

    // Assign admin role to the user
    await testContext.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
        isActive: true
      }
    });

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'analytics-test@example.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should get dashboard analytics successfully', async () => {
      // Create some test data
      await testContext.prisma.transaction.createMany({
        data: [
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_REVENUE,
            amount: 5000.0,
            description: 'Corn sales',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          },
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 2000.0,
            description: 'Seed costs',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          }
        ]
      });

      await testContext.prisma.farmActivity.createMany({
        data: [
          {
            farmId: farm.id,
            type: ActivityType.PLANTING,
            status: ActivityStatus.COMPLETED,
            name: 'Planting corn',
            description: 'Planting corn seeds',
            scheduledAt: new Date(),
            completedAt: new Date(),
            startedAt: new Date(),
            actualDuration: 480, // 8 hours in minutes
            createdById: user.id
          },
          {
            farmId: farm.id,
            type: ActivityType.HARVESTING,
            status: ActivityStatus.PLANNED,
            name: 'Harvest corn',
            description: 'Harvest corn crop',
            scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            actualDuration: 0,
            createdById: user.id
          }
        ]
      });

      const response = await testContext
        .request()
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          includeInsights: true,
          useCache: false
        });

      if (response.status !== 200) {
        console.log('Error response:', response.status, response.body);
        console.log('Query params:', {
          period: 'month',
          farmId: farm.id,
          includeInsights: 'true',
          useCache: 'false'
        });
        if (response.body.queryResult && response.body.queryResult.issues) {
          console.log('Zod validation issues:', JSON.stringify(response.body.queryResult.issues, null, 2));
        }
      }

      expect(response.status).toBe(200);

      expect(response.body.data.type).toBe('analytics_dashboard');
      expect(response.body.data.attributes.period).toBe('month');
      expect(response.body.data.attributes.farmId).toBe(farm.id);
      expect(response.body.data.attributes.metrics).toBeDefined();
      expect(Array.isArray(response.body.data.attributes.metrics)).toBe(true);
      expect(response.body.data.attributes.charts).toBeDefined();
      expect(Array.isArray(response.body.data.attributes.charts)).toBe(true);
      expect(response.body.data.attributes.summary).toBeDefined();
      expect(response.body.data.attributes.generatedAt).toBeDefined();
    });

    it('should get dashboard analytics with different periods', async () => {
      const periods = ['week', 'month', 'quarter', 'year'];
      
      for (const period of periods) {
        const response = await testContext
          .request()
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            period,
            useCache: false
          })
          .expect(200);

        expect(response.body.data.attributes.period).toBe(period);
      }
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/api/analytics/dashboard')
        .query({ period: 'month' })
        .expect(401);
    });

    it('should fail with invalid farm ID', async () => {
      await testContext
        .request()
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: 'invalid-uuid'
        })
        .expect(400);
    });
  });

  describe('GET /api/analytics/financial', () => {
    beforeEach(async () => {
      // Create financial test data
      await testContext.prisma.transaction.createMany({
        data: [
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_REVENUE,
            amount: 10000.0,
            description: 'Corn sales',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          },
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_REVENUE,
            amount: 5000.0,
            description: 'Soybean sales',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          },
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 3000.0,
            description: 'Seed costs',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          },
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 2000.0,
            description: 'Fertilizer costs',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          }
        ]
      });

      // Create test orders
      await testContext.createOrder({
        buyerOrg: { connect: { id: organization.id } },
        createdBy: { connect: { id: user.id } },
        commodityId: commodity.id,
        totalPrice: 15000.0,
        quantity: 1000.0,
        pricePerUnit: 15.0
      });
    });

    it('should get financial analytics successfully', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/financial')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          includeBreakdown: true,
          compareWithPrevious: true,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_financial');
      expect(response.body.data.attributes.metrics).toBeDefined();
      expect(Array.isArray(response.body.data.attributes.metrics)).toBe(true);
      expect(response.body.data.attributes.charts).toBeDefined();
      expect(response.body.data.attributes.summary).toBeDefined();
      
      // Check that financial metrics are present
      const metricNames = response.body.data.attributes.metrics.map((m: any) => m.name);
      expect(metricNames).toContain('Total Revenue');
      expect(metricNames).toContain('Total Expenses');
      expect(metricNames).toContain('Profit Margin');
    });

    it('should get financial analytics with commodity filter', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/financial')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          commodityId: commodity.id,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_financial');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/api/analytics/financial')
        .query({ period: 'month' })
        .expect(401);
    });
  });

  describe('GET /api/analytics/activities', () => {
    beforeEach(async () => {
      // Create activity test data
      await testContext.prisma.farmActivity.createMany({
        data: [
          {
            farmId: farm.id,
            type: ActivityType.PLANTING,
            status: ActivityStatus.COMPLETED,
            name: 'Planting corn',
            description: 'Planting corn seeds',
            scheduledAt: new Date(),
            completedAt: new Date(),
            startedAt: new Date(),
            actualDuration: 480, // 8 hours in minutes
            createdById: user.id
          },
          {
            farmId: farm.id,
            type: ActivityType.FERTILIZING,
            status: ActivityStatus.COMPLETED,
            name: 'Fertilizing',
            description: 'Applying fertilizer',
            scheduledAt: new Date(),
            completedAt: new Date(),
            startedAt: new Date(),
            actualDuration: 240, // 4 hours in minutes
            createdById: user.id
          },
          {
            farmId: farm.id,
            type: ActivityType.HARVESTING,
            status: ActivityStatus.PLANNED,
            name: 'Harvest corn',
            description: 'Harvest corn crop',
            scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            actualDuration: 0,
            createdById: user.id
          }
        ]
      });

      // Create expense transactions for activity costs
      await testContext.prisma.transaction.createMany({
        data: [
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 500.0,
            description: 'Planting costs',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          },
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 300.0,
            description: 'Fertilizing costs',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          }
        ]
      });
    });

    it('should get activity analytics successfully', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          includeEfficiency: true,
          includeCosts: true,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_activities');
      expect(response.body.data.attributes.metrics).toBeDefined();
      expect(Array.isArray(response.body.data.attributes.metrics)).toBe(true);
      expect(response.body.data.attributes.charts).toBeDefined();
      expect(response.body.data.attributes.summary).toBeDefined();
      
      // Check that activity metrics are present
      const metricNames = response.body.data.attributes.metrics.map((m: any) => m.name);
      expect(metricNames).toContain('Activity Completion Rate');
      expect(metricNames).toContain('Average Duration');
    });

    it('should get activity analytics with type filter', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          activityType: ActivityType.PLANTING,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_activities');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/api/analytics/activities')
        .query({ period: 'month' })
        .expect(401);
    });
  });

  describe('GET /api/analytics/market', () => {
    beforeEach(async () => {
      // Create market test data
      await testContext.createOrder({
        buyerOrg: { connect: { id: organization.id } },
        createdBy: { connect: { id: user.id } },
        commodityId: commodity.id,
        totalPrice: 10000.0,
        quantity: 1000.0,
        pricePerUnit: 10.0
      });

      await testContext.createOrder({
        buyerOrg: { connect: { id: organization.id } },
        createdBy: { connect: { id: user.id } },
        commodityId: commodity.id,
        totalPrice: 5000.0,
        quantity: 500.0,
        pricePerUnit: 10.0
      });
    });

    it('should get market analytics successfully', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/market')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          includePredictions: false,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_market');
      expect(response.body.data.attributes.metrics).toBeDefined();
      expect(Array.isArray(response.body.data.attributes.metrics)).toBe(true);
      expect(response.body.data.attributes.charts).toBeDefined();
      expect(response.body.data.attributes.summary).toBeDefined();
      
      // Check that market metrics are present
      const metricNames = response.body.data.attributes.metrics.map((m: any) => m.name);
      expect(metricNames).toContain('Total Sales');
      expect(metricNames).toContain('Average Order Value');
      expect(metricNames).toContain('Customer Count');
    });

    it('should get market analytics with commodity filter', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/market')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          commodityId: commodity.id,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_market');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/api/analytics/market')
        .query({ period: 'month' })
        .expect(401);
    });
  });

  describe('GET /api/analytics/farm-to-market', () => {
    beforeEach(async () => {
      // Create farm-to-market test data
      // First create required Season and Area
      const season = await testContext.prisma.season.create({
        data: {
          farmId: farm.id,
          name: '2024 Season',
          year: 2024,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          isActive: true
        }
      });

      const area = await testContext.prisma.area.create({
        data: {
          farmId: farm.id,
          name: 'Field A',
          size: 10.0,
          isActive: true
        }
      });

      const cropCycle = await testContext.prisma.cropCycle.create({
        data: {
          farmId: farm.id,
          seasonId: season.id,
          areaId: area.id,
          commodityId: commodity.id,
          status: CropStatus.COMPLETED,
          plantingDate: new Date('2024-01-01'),
          harvestDate: new Date('2024-06-01'),
          plantedArea: 10.0,
          expectedYield: 1000.0,
          actualYield: 950.0
        }
      });

      await testContext.prisma.harvest.create({
        data: {
          cropCycleId: cropCycle.id,
          quantity: 950.0,
          harvestDate: new Date('2024-06-01'),
          quality: 'Grade A'
        }
      });

      await testContext.createOrder({
        buyerOrg: { connect: { id: organization.id } },
        createdBy: { connect: { id: user.id } },
        commodityId: commodity.id,
        totalPrice: 9500.0,
        quantity: 950.0,
        pricePerUnit: 10.0
      });
    });

    it('should get farm-to-market analytics successfully', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/farm-to-market')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          includeQuality: true,
          includePricing: true,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_farm-to-market');
      expect(response.body.data.attributes.metrics).toBeDefined();
      expect(Array.isArray(response.body.data.attributes.metrics)).toBe(true);
      expect(response.body.data.attributes.charts).toBeDefined();
      expect(response.body.data.attributes.summary).toBeDefined();
      
      // Check that farm-to-market metrics are present
      const metricNames = response.body.data.attributes.metrics.map((m: any) => m.name);
      expect(metricNames).toContain('Production Efficiency');
      expect(metricNames).toContain('Farm-to-Market Traceability');
    });

    it('should get farm-to-market analytics with commodity filter', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/farm-to-market')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          commodityId: commodity.id,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_farm-to-market');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/api/analytics/farm-to-market')
        .query({ period: 'month' })
        .expect(401);
    });
  });

  describe('GET /api/analytics/insights', () => {
    it('should get AI insights successfully', async () => {
      const response = await testContext
        .request()
        .get('/api/analytics/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          period: 'month',
          farmId: farm.id,
          useCache: false
        })
        .expect(200);

      expect(response.body.data.type).toBe('analytics_insights');
      expect(response.body.data.attributes.insights).toBeDefined();
      expect(Array.isArray(response.body.data.attributes.insights)).toBe(true);
      expect(response.body.data.attributes.generatedAt).toBeDefined();
      expect(response.body.data.attributes.confidence).toBeDefined();
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/api/analytics/insights')
        .query({ period: 'month' })
        .expect(401);
    });
  });

  describe('POST /api/analytics/export', () => {
    it('should export analytics data successfully', async () => {
      const exportRequest = {
        type: 'dashboard',
        format: 'csv',
        period: 'month',
        farmId: farm.id,
        includeCharts: false,
        includeInsights: true
      };

      const response = await testContext
        .request()
        .post('/api/analytics/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(exportRequest)
        .expect(202);

      expect(response.body.data.type).toBe('analytics_export');
      expect(response.body.data.attributes.status).toBe('processing');
      expect(response.body.data.attributes.downloadUrl).toBeDefined();
      expect(response.body.data.attributes.expiresAt).toBeDefined();
    });

    it('should export different analytics types', async () => {
      const types = ['dashboard', 'financial', 'activities', 'market', 'farm-to-market'];
      
      for (const type of types) {
        const exportRequest = {
          type,
          format: 'json',
          period: 'month',
          farmId: farm.id
        };

        const response = await testContext
          .request()
          .post('/api/analytics/export')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(exportRequest)
          .expect(202);

        expect(response.body.data.type).toBe('analytics_export');
      }
    });

    it('should fail with invalid export type', async () => {
      const exportRequest = {
        type: 'invalid-type',
        format: 'csv',
        period: 'month'
      };

      await testContext
        .request()
        .post('/api/analytics/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(exportRequest)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const exportRequest = {
        type: 'dashboard',
        format: 'csv',
        period: 'month'
      };

      await testContext
        .request()
        .post('/api/analytics/export')
        .send(exportRequest)
        .expect(401);
    });
  });

  describe('POST /api/analytics/reports', () => {
    it('should generate report successfully', async () => {
      const reportRequest = {
        title: 'Monthly Farm Report',
        type: 'dashboard',
        period: 'month',
        farmIds: [farm.id],
        format: 'pdf',
        includeComparisons: true,
        includePredictions: false
      };

      const response = await testContext
        .request()
        .post('/api/analytics/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reportRequest)
        .expect(202);

      expect(response.body.data.type).toBe('analytics_report');
      expect(response.body.data.attributes.status).toBe('generating');
      expect(response.body.data.attributes.title).toBe('Monthly Farm Report');
      expect(response.body.data.attributes.type).toBe('dashboard');
      expect(response.body.data.attributes.format).toBe('pdf');
    });

    it('should generate report with recipients', async () => {
      const reportRequest = {
        title: 'Quarterly Report',
        type: 'financial',
        period: 'quarter',
        farmIds: [farm.id],
        format: 'excel',
        recipients: ['test@example.com', 'manager@example.com']
      };

      const response = await testContext
        .request()
        .post('/api/analytics/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reportRequest)
        .expect(202);

      expect(response.body.data.type).toBe('analytics_report');
      expect(response.body.data.attributes.recipients).toEqual(['test@example.com', 'manager@example.com']);
    });

    it('should fail with invalid report type', async () => {
      const reportRequest = {
        title: 'Test Report',
        type: 'invalid-type',
        period: 'month',
        format: 'pdf'
      };

      await testContext
        .request()
        .post('/api/analytics/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reportRequest)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const reportRequest = {
        title: 'Test Report',
        type: 'dashboard',
        period: 'month',
        format: 'pdf'
      };

      await testContext
        .request()
        .post('/api/analytics/reports')
        .send(reportRequest)
        .expect(401);
    });
  });

  describe('Analytics Integration Tests', () => {
    it('should complete full analytics workflow', async () => {
      // 1. Create comprehensive test data
      await testContext.prisma.transaction.createMany({
        data: [
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_REVENUE,
            amount: 20000.0,
            description: 'Corn sales',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          },
          {
            organizationId: organization.id,
            farmId: farm.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 8000.0,
            description: 'Operating costs',
            currency: 'USD',
            status: TransactionStatus.COMPLETED,
            createdAt: new Date()
          }
        ]
      });

      await testContext.prisma.farmActivity.createMany({
        data: [
          {
            farmId: farm.id,
            type: ActivityType.PLANTING,
            status: ActivityStatus.COMPLETED,
            name: 'Planting',
            description: 'Planting crops',
            scheduledAt: new Date(),
            completedAt: new Date(),
            startedAt: new Date(),
            actualDuration: 600, // 10 hours in minutes
            createdById: user.id
          }
        ]
      });

      // 2. Get dashboard analytics
      const dashboardResponse = await testContext
        .request()
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'month', farmId: farm.id, useCache: false })
        .expect(200);

      expect(dashboardResponse.body.data.type).toBe('analytics_dashboard');

      // 3. Get financial analytics
      const financialResponse = await testContext
        .request()
        .get('/api/analytics/financial')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'month', farmId: farm.id, useCache: false })
        .expect(200);

      expect(financialResponse.body.data.type).toBe('analytics_financial');

      // 4. Get activity analytics
      const activityResponse = await testContext
        .request()
        .get('/api/analytics/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'month', farmId: farm.id, useCache: false })
        .expect(200);

      expect(activityResponse.body.data.type).toBe('analytics_activities');

      // 5. Export data
      const exportResponse = await testContext
        .request()
        .post('/api/analytics/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'dashboard',
          format: 'json',
          period: 'month',
          farmId: farm.id
        })
        .expect(202);

      expect(exportResponse.body.data.type).toBe('analytics_export');

      // 6. Generate report
      const reportResponse = await testContext
        .request()
        .post('/api/analytics/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Integration Test Report',
          type: 'dashboard',
          period: 'month',
          farmIds: [farm.id],
          format: 'pdf'
        })
        .expect(202);

      expect(reportResponse.body.data.type).toBe('analytics_report');
    });

    it('should handle concurrent analytics requests', async () => {
      // Create test data
      await testContext.prisma.transaction.create({
        data: {
          organizationId: organization.id,
          farmId: farm.id,
          type: TransactionType.FARM_REVENUE,
          amount: 5000.0,
          description: 'Test revenue',
          currency: 'USD',
          status: TransactionStatus.COMPLETED,
          createdAt: new Date()
        }
      });

      // Make concurrent requests
      const promises = [
        testContext
          .request()
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ period: 'month', useCache: false }),
        testContext
          .request()
          .get('/api/analytics/financial')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ period: 'month', useCache: false }),
        testContext
          .request()
          .get('/api/analytics/activities')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ period: 'month', useCache: false })
      ];

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    });
  });
});
