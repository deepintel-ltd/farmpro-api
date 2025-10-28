import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import type { Response } from 'supertest';

describe('Harvests E2E Tests', () => {
  let testContext: TestContext;
  let accessToken: string;
  let organizationId: string;
  let farmId: string;
  let areaId: string;
  let cropCycleId: string;

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

    // Create farm
    const farm = await testContext.createFarm({
      name: 'Test Farm',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Test Road, San Francisco, CA'
      },
      totalArea: 100.5,
      cropTypes: ['wheat'],
      establishedDate: '2020-01-01T00:00:00Z',
      organization: { connect: { id: organizationId } },
      isActive: true
    });

    farmId = farm.id;

    // Create area
    const area = await testContext.createArea({
      farmId: farm.id,
      name: 'Zone 1',
      size: 50,
      isActive: true
    });

    areaId = area.id;

    // Create season and commodity for crop cycle
      const season = await testContext.prisma.season.create({
      data: {
        farmId,
        name: 'Season 1',
        year: 2024,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        isActive: true
      }
    });

      const commodity = await testContext.prisma.commodity.create({
      data: {
        name: 'Wheat',
        category: 'GRAIN',
        quantity: 0,
        unit: 'kg',
        isGlobal: true
      }
    });

      const cropCycle = await testContext.prisma.cropCycle.create({
      data: {
        farmId,
        seasonId: season.id,
        areaId,
        commodityId: commodity.id,
        plantingDate: new Date('2024-04-01'),
        expectedHarvestDate: new Date('2024-07-01'),
        plantedArea: 10,
        status: 'ACTIVE',
        variety: 'Hard Red Winter'
      }
    });

    cropCycleId = cropCycle.id;
  });

  describe('POST /harvests', () => {
    it('should create harvest successfully', async () => {
      const harvestData = {
        data: {
          type: 'harvests',
          attributes: {
            farmId,
            areaId,
            cropCycleId,
            cropType: 'Wheat',
            variety: 'Hard Red Winter',
            harvestDate: '2024-07-15T00:00:00Z',
            quantity: 5000,
            unit: 'kg',
            quality: {
              grade: 'premium',
              moisture: 12.5,
              notes: 'Excellent quality'
            },
            estimatedValue: 10450000,
            currency: 'NGN',
            createInventory: true
          }
        }
      };

      const response: Response = await testContext
        .request()
        .post('/harvests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(harvestData)
        .expect(201);

      expect(response.body.data.type).toBe('harvests');
      expect(response.body.data.attributes.quantity).toBe(5000);
      expect(response.body.data.attributes.cropType).toBe('Wheat');
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        data: {
          type: 'harvests',
          attributes: {
            farmId: 'invalid-farm-id'
          }
        }
      };

      await testContext
        .request()
        .post('/harvests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .post('/harvests')
        .send({})
        .expect(401);
    });
  });

  describe('GET /harvests', () => {
    it('should get harvests list successfully', async () => {
      const response: Response = await testContext
        .request()
        .get('/harvests')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /harvests/revenue-analytics', () => {
    it('should get revenue analytics', async () => {
      const response: Response = await testContext
        .request()
        .get('/harvests/revenue-analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('revenue-analytics');
    });
  });

  describe('GET /harvests/yield-comparison', () => {
    it('should get yield comparison', async () => {
      const response: Response = await testContext
        .request()
        .get('/harvests/yield-comparison')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId, cropType: 'Wheat' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('yield-comparison');
    });
  });
});

