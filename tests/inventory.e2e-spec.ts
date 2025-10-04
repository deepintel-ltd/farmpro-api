import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Inventory E2E Tests', () => {
  let testContext: TestContext;
  let accessToken: string;
  let organizationId: string;
  let farmId: string;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  });

  afterAll(async () => {
    await testContext.teardown();
  });

  beforeEach(async () => {
    await testContext.resetDatabase();

    // Create test organization
    const organization = await testContext.createOrganization({
      name: 'Test Farm Organization',
      type: 'FARM_OPERATION',
      email: 'test@farmpro.app',
      phone: '+1-555-0123',
      address: {
        street: '123 Farm Road',
        city: 'Farmville',
        state: 'CA',
        zipCode: '90210',
        country: 'US'
      },
      plan: 'enterprise',
      maxUsers: 100,
      maxFarms: 50,
      features: ['all_features'],
      allowCustomRoles: true,
      isVerified: true,
      isActive: true
    });

    organizationId = organization.id;

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    await testContext.createUser({
      email: 'farmer@farmpro.app',
      name: 'Test Farmer',
      hashedPassword,
      organizationId,
      emailVerified: true,
      isActive: true
    });

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'farmer@farmpro.app',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;

    // Create test farm
    const farm = await testContext.createFarm({
      name: 'Test Farm',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Farm Road, Farmville, CA 90210'
      },
      totalArea: 100,
      cropTypes: ['wheat', 'corn'],
      establishedDate: '2020-01-01T00:00:00Z',
      certifications: ['organic'],
      isActive: true
    });

    farmId = farm.id;
  });

  describe('GET /api/inventory', () => {
    it('should return 200 with empty data when no inventory exists', async () => {
      const response = await testContext
        .request()
        .get('/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.totalCount).toBe(0);
    });

    it('should handle farmId parameter with CUID format', async () => {
      const response = await testContext
        .request()
        .get(`/inventory?farmId=${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    it('should handle farmId parameter with CUID format and pagination', async () => {
      const response = await testContext
        .request()
        .get(`/inventory?farmId=${farmId}&page[size]=20`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta.perPage).toBe(20);
    });

    it('should handle URL-encoded pagination parameters', async () => {
      const response = await testContext
        .request()
        .get(`/inventory?farmId=${farmId}&page%5Bsize%5D=20`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta.perPage).toBe(20);
    });

    it('should handle the specific failing request from the user', async () => {
      // This is the exact request that was failing
      const response = await testContext
        .request()
        .get('/inventory?farmId=cmgbl0tbh008w1c336ijcd987&page%5Bsize%5D=20')
        .set('Authorization', `Bearer ${accessToken}`);

      // Log the response for debugging
      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      if (response.status !== 200) {
        console.log('Error details:', response.body);
      }

      // This test will help us understand what's happening
      expect(response.status).toBe(200);
    });

    it('should validate farmId parameter format', async () => {
      // Test with invalid farmId format
      const response = await testContext
        .request()
        .get('/inventory?farmId=invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0]).toHaveProperty('code');
    });

    it('should validate pagination parameters', async () => {
      // Test with invalid page size
      const response = await testContext
        .request()
        .get(`/inventory?farmId=${farmId}&page[size]=1000`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
});
