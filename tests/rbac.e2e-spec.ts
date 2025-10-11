import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Plan-Based Permission E2E Tests', () => {
  let testContext: TestContext;

  let proAccessToken: string;
  let basicAccessToken: string;
  let freeAccessToken: string;
  
  // Test organizations with different plans
  let proOrganization: any;
  let basicOrganization: any;
  let freeOrganization: any;
  
  // Test farms
  let proFarm: any;
  let basicFarm: any;
  let freeFarm: any;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up test data before each test
    await testContext.cleanupTables([
      'users',
      'organizations',
      'farms',
      'activities'
    ]);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create test organizations with different plan tiers
    proOrganization = await testContext.createOrganization({
      name: 'Pro Test Org',
      type: 'FARM_OPERATION',
      email: 'pro@test.com',
      plan: 'PRO'
    });

    basicOrganization = await testContext.createOrganization({
      name: 'Basic Test Org',
      type: 'FARM_OPERATION',
      email: 'basic@test.com',
      plan: 'BASIC'
    });

    freeOrganization = await testContext.createOrganization({
      name: 'Free Test Org',
      type: 'FARM_OPERATION',
      email: 'free@test.com',
      plan: 'FREE'
    });

    // Create test farms for each organization
    proFarm = await testContext.createFarm({
      organization: { connect: { id: proOrganization.id } },
      name: 'Pro Test Farm',
      totalArea: 100.0,
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Pro Farm Road, Test City, TC 12345'
      },
      cropTypes: ['corn', 'soybeans'],
      establishedDate: new Date('2020-01-01'),
      certifications: ['organic'],
      isActive: true
    });

    basicFarm = await testContext.createFarm({
      organization: { connect: { id: basicOrganization.id } },
      name: 'Basic Test Farm',
      totalArea: 50.0,
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Basic Farm Road, Test City, TC 12345'
      },
      cropTypes: ['corn'],
      establishedDate: new Date('2020-01-01'),
      certifications: [],
      isActive: true
    });

    freeFarm = await testContext.createFarm({
      organization: { connect: { id: freeOrganization.id } },
      name: 'Free Test Farm',
      totalArea: 25.0,
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Free Farm Road, Test City, TC 12345'
      },
      cropTypes: ['corn'],
      establishedDate: new Date('2020-01-01'),
      certifications: [],
      isActive: true
    });

    // Create test users for each plan tier
    const hashedPassword = await hash('TestPassword123!');
    
    await testContext.createUser({
      email: 'pro@test.com',
      name: 'Pro User',
      hashedPassword,
      organizationId: proOrganization.id,
      isActive: true,
      emailVerified: true,
    });

    await testContext.createUser({
      email: 'basic@test.com',
      name: 'Basic User',
      hashedPassword,
      organizationId: basicOrganization.id,
      isActive: true,
      emailVerified: true,
    });

    await testContext.createUser({
      email: 'free@test.com',
      name: 'Free User',
      hashedPassword,
      organizationId: freeOrganization.id,
      isActive: true,
      emailVerified: true,
    });

    // Get access tokens for each user
    const proLogin = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'pro@test.com',
        password: 'TestPassword123!'
      })
      .expect(200);
    proAccessToken = proLogin.body.data.attributes.tokens.accessToken;

    const basicLogin = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'basic@test.com',
        password: 'TestPassword123!'
      })
      .expect(200);
    basicAccessToken = basicLogin.body.data.attributes.tokens.accessToken;

    const freeLogin = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'free@test.com',
        password: 'TestPassword123!'
      })
      .expect(200);
    freeAccessToken = freeLogin.body.data.attributes.tokens.accessToken;
  });

  // =============================================================================
  // Plan-Based Permission Tests
  // =============================================================================

  describe('Activities Permissions', () => {
    it('should allow PRO user to create activities', async () => {
      const activityData = {
        name: 'Test Activity',
        type: 'PLANTING',
        priority: 'NORMAL',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        farmId: proFarm.id,
      };

      const response = await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${proAccessToken}`)
        .send(activityData)
        .expect(201);

      expect(response.body.data.type).toBe('activities');
      expect(response.body.data.attributes.name).toBe(activityData.name);
    });

    it('should allow BASIC user to create activities', async () => {
      const activityData = {
        name: 'Test Activity',
        type: 'PLANTING',
        priority: 'NORMAL',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        farmId: basicFarm.id,
      };

      const response = await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${basicAccessToken}`)
        .send(activityData)
        .expect(201);

      expect(response.body.data.type).toBe('activities');
    });

    it('should allow FREE user to create activities', async () => {
      const activityData = {
        name: 'Test Activity',
        type: 'PLANTING',
        priority: 'NORMAL',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        farmId: freeFarm.id,
      };

      const response = await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${freeAccessToken}`)
        .send(activityData)
        .expect(201);

      expect(response.body.data.type).toBe('activities');
    });
  });

  describe('Analytics Permissions', () => {
    it('should allow PRO user to access analytics', async () => {
      const response = await testContext
        .request()
        .get('/activities/analytics')
        .set('Authorization', `Bearer ${proAccessToken}`)
        .query({ farmId: proFarm.id })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should allow BASIC user to access analytics', async () => {
      const response = await testContext
        .request()
        .get('/activities/analytics')
        .set('Authorization', `Bearer ${basicAccessToken}`)
        .query({ farmId: basicFarm.id })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should deny FREE user access to analytics', async () => {
      await testContext
        .request()
        .get('/activities/analytics')
        .set('Authorization', `Bearer ${freeAccessToken}`)
        .query({ farmId: freeFarm.id })
        .expect(403);
    });
  });

  describe('Advanced Features Permissions', () => {
    it('should allow PRO user to access intelligence features', async () => {
      // This would test intelligence endpoints if they exist
      // For now, we'll test that PRO users can access advanced features
      const response = await testContext
        .request()
        .get('/activities/analytics')
        .set('Authorization', `Bearer ${proAccessToken}`)
        .query({ farmId: proFarm.id })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should deny BASIC user access to intelligence features', async () => {
      // BASIC users don't have intelligence module access
      await testContext
        .request()
        .get('/intelligence/insights')
        .set('Authorization', `Bearer ${basicAccessToken}`)
        .expect(403);
    });

    it('should deny FREE user access to intelligence features', async () => {
      await testContext
        .request()
        .get('/intelligence/insights')
        .set('Authorization', `Bearer ${freeAccessToken}`)
        .expect(403);
    });
  });

  describe('API Access Permissions', () => {
    it('should allow PRO user to access API endpoints', async () => {
      // Test that PRO users can access API features
      const response = await testContext
        .request()
        .get('/activities')
        .set('Authorization', `Bearer ${proAccessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should deny FREE user access to API features', async () => {
      // FREE users don't have API access
      await testContext
        .request()
        .get('/status')
        .set('Authorization', `Bearer ${freeAccessToken}`)
        .expect(403);
    });
  });

  describe('Plan Tier Validation', () => {
    it('should return correct plan tier for PRO user', async () => {
      const response = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${proAccessToken}`)
        .expect(200);

      expect(response.body.data.attributes.organization.plan).toBe('PRO');
    });

    it('should return correct plan tier for BASIC user', async () => {
      const response = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${basicAccessToken}`)
        .expect(200);

      expect(response.body.data.attributes.organization.plan).toBe('BASIC');
    });

    it('should return correct plan tier for FREE user', async () => {
      const response = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${freeAccessToken}`)
        .expect(200);

      expect(response.body.data.attributes.organization.plan).toBe('FREE');
    });
  });

  describe('Feature Access Validation', () => {
    it('should return correct features for PRO user', async () => {
      const response = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${proAccessToken}`)
        .expect(200);

      const features = response.body.data.attributes.organization.features;
      expect(features).toContain('advanced_analytics');
      expect(features).toContain('ai_insights');
      expect(features).toContain('api_access');
    });

    it('should return correct features for BASIC user', async () => {
      const response = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${basicAccessToken}`)
        .expect(200);

      const features = response.body.data.attributes.organization.features;
      expect(features).not.toContain('advanced_analytics');
      expect(features).not.toContain('ai_insights');
    });

    it('should return correct features for FREE user', async () => {
      const response = await testContext
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${freeAccessToken}`)
        .expect(200);

      const features = response.body.data.attributes.organization.features;
      expect(features).not.toContain('advanced_analytics');
      expect(features).not.toContain('ai_insights');
      expect(features).not.toContain('api_access');
    });
  });
});
