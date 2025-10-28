import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import type { Response } from 'supertest';

describe('Infrastructure E2E Tests', () => {
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

    // Create test setup (organization, user, farm)
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

    const hashedPassword = await hash('TestPassword123!');
    await testContext.createUser({
      email: 'farmer@farmpro.app',
      name: 'Test Farmer',
      hashedPassword,
      organizationId,
      emailVerified: true,
      isActive: true
    });

    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'farmer@farmpro.app',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;

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
  });

  describe('POST /infrastructure', () => {
    it('should create infrastructure successfully', async () => {
      const infrastructureData = {
        data: {
          type: 'infrastructure',
          attributes: {
            farmId,
            name: 'Main Borehole',
            type: 'BOREHOLE',
            description: 'Primary water source',
            timeline: {
              startDate: '2024-01-01T00:00:00Z',
              expectedEndDate: '2024-03-01T00:00:00Z'
            },
            budget: {
              estimated: 5000000,
              currency: 'NGN'
            },
            uptime: {
              target: 95
            }
          }
        }
      };

      const response: Response = await testContext
        .request()
        .post('/infrastructure')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(infrastructureData)
        .expect(201);

      expect(response.body.data.type).toBe('infrastructure');
      expect(response.body.data.attributes.name).toBe('Main Borehole');
      expect(response.body.data.attributes.type).toBe('BOREHOLE');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .post('/infrastructure')
        .send({})
        .expect(401);
    });
  });

  describe('GET /infrastructure', () => {
    it('should get infrastructure list successfully', async () => {
      const response: Response = await testContext
        .request()
        .get('/infrastructure')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /infrastructure/:id/uptime', () => {
    let infrastructureId: string;

    beforeEach(async () => {
      const infrastructure = await testContext.prisma.infrastructure.create({
        data: {
          farmId,
          name: 'Test Borehole',
          type: 'BOREHOLE',
          status: 'OPERATIONAL',
          startDate: new Date('2024-01-01'),
          expectedEndDate: new Date('2024-03-01'),
          estimatedBudget: 5000000,
          currency: 'NGN',
          targetUptime: 95
        }
      });

      infrastructureId = infrastructure.id;
    });

    it('should log uptime successfully', async () => {
      const uptimeData = {
        data: {
          type: 'uptime-log',
          attributes: {
            timestamp: new Date().toISOString(),
            status: 'UP',
            reason: null,
            duration: null,
            notes: 'System operational'
          }
        }
      };

      const response: Response = await testContext
        .request()
        .post(`/infrastructure/${infrastructureId}/uptime`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(uptimeData)
        .expect(201);

      expect(response.body.data.type).toBe('uptime-log');
      expect(response.body.data.attributes.status).toBe('UP');
    });
  });

  describe('GET /infrastructure/:id/uptime-analytics', () => {
    let infrastructureId: string;

    beforeEach(async () => {
      const infrastructure = await testContext.prisma.infrastructure.create({
        data: {
          farmId,
          name: 'Test Borehole',
          type: 'BOREHOLE',
          status: 'OPERATIONAL',
          startDate: new Date('2024-01-01'),
          expectedEndDate: new Date('2024-03-01'),
          estimatedBudget: 5000000,
          currency: 'NGN',
          targetUptime: 95
        }
      });

      infrastructureId = infrastructure.id;

      // Create some uptime logs
      await testContext.prisma.infrastructureUptimeLog.create({
        data: {
          infrastructureId,
          timestamp: new Date(),
          status: 'UP',
          reason: null
        }
      });
    });

    it('should get uptime analytics successfully', async () => {
      const response: Response = await testContext
        .request()
        .get(`/infrastructure/${infrastructureId}/uptime-analytics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('uptime-analytics');
      expect(response.body.data.attributes.targetUptime).toBeDefined();
      expect(response.body.data.attributes.actualUptime).toBeDefined();
    });
  });
});

