import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import type { Response } from 'supertest';

describe('KPIs E2E Tests', () => {
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

    // Create test setup
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

  describe('POST /kpis', () => {
    it('should create KPI successfully', async () => {
      const kpiData = {
        data: {
          type: 'kpis',
          attributes: {
            farmId,
            name: 'Pest Damage',
            metric: 'PEST_DAMAGE',
            description: 'Monitor pest damage percentage',
            targetValue: 10,
            targetOperator: 'less_than',
            unit: '%',
            threshold: {
              warning: 7,
              critical: 10
            },
            category: 'PRODUCTION',
            alertsEnabled: true
          }
        }
      };

      const response: Response = await testContext
        .request()
        .post('/kpis')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(kpiData)
        .expect(201);

      expect(response.body.data.type).toBe('kpis');
      expect(response.body.data.attributes.name).toBe('Pest Damage');
      expect(response.body.data.attributes.metric).toBe('PEST_DAMAGE');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .post('/kpis')
        .send({})
        .expect(401);
    });
  });

  describe('GET /kpis', () => {
    it('should get KPIs list successfully', async () => {
      const response: Response = await testContext
        .request()
        .get('/kpis')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /kpis/:id/measurements', () => {
    let kpiId: string;

    beforeEach(async () => {
      const kpi = await testContext.prisma.kPI.create({
        data: {
          farmId,
          name: 'Test KPI',
          metric: 'PEST_DAMAGE',
          targetValue: 10,
          targetOperator: 'less_than',
          unit: '%',
          warningThreshold: 7,
          criticalThreshold: 10,
          category: 'PRODUCTION',
          isActive: true,
          alertsEnabled: true
        }
      });

      kpiId = kpi.id;
    });

    it('should record measurement successfully', async () => {
      const measurementData = {
        data: {
          type: 'kpi-measurements',
          attributes: {
            value: 6.5,
            measuredAt: new Date().toISOString(),
            notes: 'Weekly inspection',
            source: 'manual'
          }
        }
      };

      const response: Response = await testContext
        .request()
        .post(`/kpis/${kpiId}/measurements`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(measurementData)
        .expect(201);

      expect(response.body.data.type).toBe('kpi-measurements');
      expect(response.body.data.attributes.value).toBe(6.5);
    });
  });

  describe('GET /kpis/dashboard', () => {
    it('should get KPI dashboard successfully', async () => {
      const response: Response = await testContext
        .request()
        .get('/kpis/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('kpi-dashboard');
    });
  });
});

