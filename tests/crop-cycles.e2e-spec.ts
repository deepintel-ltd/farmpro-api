import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import type { Response } from 'supertest';

describe('Crop Cycles E2E Tests', () => {
  let testContext: TestContext;
  let accessToken: string;
  let organizationId: string;
  let farmId: string;
  let areaId: string;

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
      }
    }, 'ENTERPRISE' as any);

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
      cropTypes: ['wheat', 'corn'],
      establishedDate: '2020-01-01T00:00:00Z',
      organization: { connect: { id: organizationId } },
      isActive: true
    });

    farmId = farm.id;

    // Create area
    const area = await testContext.prisma.area.create({
      data: {
        farmId: farm.id,
        name: 'Zone 1',
        size: 50,
        isActive: true,
        metadata: {
          unit: 'acres',
          soilType: 'loamy',
          status: 'ACTIVE'
        }
      }
    });

    areaId = area.id;
  });

  describe('GET /crop-cycles', () => {
    it('should get crop cycles list successfully', async () => {
      // Create a season
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

      // Create a commodity
      const commodity = await testContext.prisma.commodity.create({
        data: {
          name: 'Wheat',
          category: 'GRAIN',
          quantity: 0,
          unit: 'kg',
          isGlobal: true
        }
      });

      // Create test crop cycles
      await testContext.prisma.cropCycle.create({
        data: {
          farmId,
          seasonId: season.id,
          areaId,
          commodityId: commodity.id,
          plantingDate: new Date('2024-04-01'),
          expectedHarvestDate: new Date('2024-07-01'),
          plantedArea: 10,
          status: 'PLANNED',
          expectedYield: 5000,
          yieldUnit: 'kg',
          variety: 'Hard Red Winter',
          generation: 'C1'
        }
      });

      const response: Response = await testContext
        .request()
        .get('/crop-cycles')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter crop cycles by farm', async () => {
      const response: Response = await testContext
        .request()
        .get('/crop-cycles')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/crop-cycles')
        .expect(401);
    });
  });

  describe('POST /crop-cycles', () => {
    it('should create crop cycle successfully', async () => {
      // Create a season
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

      const cropCycleData = {
        data: {
          type: 'crop-cycles',
          attributes: {
            farmId,
            areaId,
            cropType: 'Wheat',
            variety: 'Hard Red Winter',
            generation: 'C1',
            plantingDate: '2024-04-01T00:00:00Z',
            expectedHarvestDate: '2024-07-01T00:00:00Z',
            plantedArea: 10,
            plantedAreaUnit: 'acres',
            expectedYield: 5000,
            yieldUnit: 'kg',
            notes: 'First generation wheat crop'
          }
        }
      };

      const response: Response = await testContext
        .request()
        .post('/crop-cycles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cropCycleData)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('crop-cycles');
      expect(response.body.data.attributes.cropType).toBe('Wheat');
      expect(response.body.data.attributes.generation).toBe('C1');
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        data: {
          type: 'crop-cycles',
          attributes: {
            farmId: 'invalid-farm-id'
          }
        }
      };

      await testContext
        .request()
        .post('/crop-cycles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .post('/crop-cycles')
        .send({})
        .expect(401);
    });
  });

  describe('GET /crop-cycles/:id', () => {
    let cropCycleId: string;

    beforeEach(async () => {
      // Create dependencies
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
          status: 'PLANNED',
          expectedYield: 5000,
          yieldUnit: 'kg',
          variety: 'Hard Red Winter',
          generation: 'C1'
        }
      });

      cropCycleId = cropCycle.id;
    });

    it('should get crop cycle by ID successfully', async () => {
      const response: Response = await testContext
        .request()
        .get(`/crop-cycles/${cropCycleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('crop-cycles');
      expect(response.body.data.id).toBe(cropCycleId);
    });

    it('should fail with non-existent ID', async () => {
      await testContext
        .request()
        .get('/crop-cycles/cmg4g0000000000000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/crop-cycles/${cropCycleId}`)
        .expect(401);
    });
  });

  describe('PATCH /crop-cycles/:id', () => {
    let cropCycleId: string;

    beforeEach(async () => {
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
          status: 'PLANNED',
          variety: 'Hard Red Winter',
          generation: 'C1'
        }
      });

      cropCycleId = cropCycle.id;
    });

    it('should update crop cycle successfully', async () => {
      const updateData = {
        data: {
          type: 'crop-cycles',
          id: cropCycleId,
          attributes: {
            status: 'ACTIVE',
            expectedYield: 5500,
            notes: 'Updated crop cycle'
          }
        }
      };

      const response: Response = await testContext
        .request()
        .patch(`/crop-cycles/${cropCycleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.status).toBe('ACTIVE');
      expect(response.body.data.attributes.expectedYield).toBe(5500);
    });

    it('should fail with non-existent ID', async () => {
      await testContext
        .request()
        .patch('/crop-cycles/cmg4g0000000000000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'crop-cycles',
            id: 'cmg4g0000000000000000000000',
            attributes: {
              status: 'ACTIVE'
            }
          }
        })
        .expect(404);
    });
  });

  describe('DELETE /crop-cycles/:id', () => {
    let cropCycleId: string;

    beforeEach(async () => {
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
          status: 'PLANNED',
          variety: 'Hard Red Winter'
        }
      });

      cropCycleId = cropCycle.id;
    });

    it('should delete crop cycle successfully', async () => {
      await testContext
        .request()
        .delete(`/crop-cycles/${cropCycleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(204);

      // Verify deletion
      await testContext
        .request()
        .get(`/crop-cycles/${cropCycleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .delete(`/crop-cycles/${cropCycleId}`)
        .send({})
        .expect(401);
    });
  });

  describe('GET /crop-cycles/rotation-recommendations', () => {
    it('should get rotation recommendations', async () => {
      const response: Response = await testContext
        .request()
        .get('/crop-cycles/rotation-recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('rotation-recommendations');
      expect(response.body.data.attributes.recommendations).toBeDefined();
    });
  });
});

