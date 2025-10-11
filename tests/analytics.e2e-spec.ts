import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import { Organization, Farm } from '@prisma/client';

describe('Analytics E2E Tests', () => {
  let testContext: TestContext;
  let organization: Organization;
  let farm: Farm;
  let accessToken: string;

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
      'seasons',
      'areas',
      'commodities',
      'users',
      'organizations'
    ]);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create test organization with PRO plan (includes analytics)
    organization = await testContext.createOrganization({
      name: 'Analytics Test Organization',
      type: 'FARM_OPERATION',
      email: 'analytics@test.com',
      plan: 'PRO' // PRO plan includes analytics features
    });
    
    // Create test farm
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

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    await testContext.createUser({
      email: 'analytics-test@example.com',
      name: 'Analytics Test User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: organization.id
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

  describe('Analytics Dashboard', () => {
    it('should get analytics dashboard data', async () => {
      const response = await testContext
        .request()
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('analytics_dashboard');
    });

    it('should get farm analytics', async () => {
      const response = await testContext
        .request()
        .get(`/analytics/farms/${farm.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Analytics Reports', () => {
    it('should generate analytics report', async () => {
      const reportData = {
        reportType: 'farm_performance',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        farmId: farm.id
      };

      const response = await testContext
        .request()
        .post('/analytics/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reportData)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('analytics_report');
    });

    it('should get analytics insights', async () => {
      const response = await testContext
        .request()
        .get('/analytics/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId: farm.id })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Analytics Data Export', () => {
    it('should export analytics data', async () => {
      const response = await testContext
        .request()
        .post('/analytics/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          format: 'csv',
          dataType: 'farm_metrics',
          farmId: farm.id
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Analytics Permissions', () => {
    it('should allow PRO user to access analytics', async () => {
      const response = await testContext
        .request()
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should deny access to users without analytics permissions', async () => {
      // Create a BASIC plan organization (no analytics)
      const basicOrg = await testContext.createOrganization({
        name: 'Basic Test Org',
        type: 'FARM_OPERATION',
        email: 'basic@test.com',
        plan: 'BASIC'
      });

      await testContext.createUser({
        email: 'basic@test.com',
        name: 'Basic User',
        hashedPassword: await hash('TestPassword123!'),
        organizationId: basicOrg.id,
        isActive: true,
        emailVerified: true
      });

      const basicLogin = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'basic@test.com',
          password: 'TestPassword123!'
        })
        .expect(200);

      const basicToken = basicLogin.body.data.attributes.tokens.accessToken;

      // BASIC users should not have access to analytics
      await testContext
        .request()
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${basicToken}`)
        .expect(403);
    });
  });
});
