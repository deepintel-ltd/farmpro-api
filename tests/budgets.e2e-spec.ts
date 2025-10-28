import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import type { Response } from 'supertest';

describe('Budgets E2E Tests', () => {
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
  });

  describe('GET /budgets', () => {
    it('should get budgets list successfully', async () => {
      // Create test budgets
      await testContext.prisma.budget.create({
        data: {
          farmId,
          name: '2024 Operating Budget',
          description: 'Annual operating budget',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          totalBudget: 28000000,
          currency: 'NGN',
          status: 'ACTIVE'
        }
      });

        await testContext.prisma.budget.create({
        data: {
          farmId,
          name: '2025 Operating Budget',
          description: 'Next year budget',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalBudget: 30000000,
          currency: 'NGN',
          status: 'DRAFT'
        }
      });

      const response: Response = await testContext
        .request()
        .get('/budgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ farmId })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/budgets')
        .expect(401);
    });
  });

  describe('POST /budgets', () => {
    it('should create budget successfully', async () => {
      const budgetData = {
        data: {
          type: 'budgets',
          attributes: {
            farmId,
            name: '2024 Operating Budget',
            description: 'Annual operating budget',
            period: {
              startDate: '2024-01-01T00:00:00Z',
              endDate: '2024-12-31T23:59:59Z'
            },
            totalBudget: 28000000,
            currency: 'NGN',
            allocations: [
              {
                category: 'LAND_PREP',
                allocated: 2000000
              },
              {
                category: 'PLANTING',
                allocated: 5000000
              },
              {
                category: 'FERTILIZING',
                allocated: 3000000
              },
              {
                category: 'HARVESTING',
                allocated: 4000000
              }
            ]
          }
        }
      };

      const response: Response = await testContext
        .request()
        .post('/budgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(budgetData)
        .expect(201);

      expect(response.body.data.type).toBe('budgets');
      expect(response.body.data.attributes.name).toBe('2024 Operating Budget');
      expect(response.body.data.attributes.totalBudget).toBe(28000000);
      expect(response.body.data.attributes.allocations).toBeDefined();
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        data: {
          type: 'budgets',
          attributes: {
            farmId: 'invalid-farm-id'
          }
        }
      };

      await testContext
        .request()
        .post('/budgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .post('/budgets')
        .send({})
        .expect(401);
    });
  });

  describe('GET /budgets/:id', () => {
    let budgetId: string;

    beforeEach(async () => {
      const budget = await testContext.prisma.budget.create({
        data: {
          farmId,
          name: 'Test Budget',
          description: 'Test budget description',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          totalBudget: 10000000,
          currency: 'NGN',
          status: 'ACTIVE'
        }
      });

      budgetId = budget.id;
    });

    it('should get budget by ID successfully', async () => {
      const response: Response = await testContext
        .request()
        .get(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('budgets');
      expect(response.body.data.id).toBe(budgetId);
    });

    it('should fail with non-existent ID', async () => {
      await testContext
        .request()
        .get('/budgets/cmg4g0000000000000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /budgets/:id/summary', () => {
    let budgetId: string;

    beforeEach(async () => {
      const budget = await testContext.prisma.budget.create({
        data: {
          farmId,
          name: 'Test Budget',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          totalBudget: 10000000,
          currency: 'NGN',
          status: 'ACTIVE'
        }
      });

      budgetId = budget.id;

      // Create allocations
      await testContext.prisma.budgetAllocation.create({
        data: {
          budgetId,
          category: 'LAND_PREP',
          allocated: 2000000,
          spent: 1000000
        }
      });

      await testContext.prisma.budgetAllocation.create({
        data: {
          budgetId,
          category: 'PLANTING',
          allocated: 3000000,
          spent: 2000000
        }
      });
    });

    it('should get budget summary successfully', async () => {
      const response: Response = await testContext
        .request()
        .get(`/budgets/${budgetId}/summary`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('budget-summary');
      expect(response.body.data.attributes.totalBudget).toBeDefined();
      expect(response.body.data.attributes.totalSpent).toBeDefined();
      expect(response.body.data.attributes.categoryBreakdown).toBeDefined();
    });
  });

  describe('GET /budgets/:id/cash-flow', () => {
    let budgetId: string;

    beforeEach(async () => {
      const budget = await testContext.prisma.budget.create({
        data: {
          farmId,
          name: 'Test Budget',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          totalBudget: 10000000,
          currency: 'NGN',
          status: 'ACTIVE'
        }
      });

      budgetId = budget.id;
    });

    it('should get cash flow projection successfully', async () => {
      const response: Response = await testContext
        .request()
        .get(`/budgets/${budgetId}/cash-flow`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('cash-flow');
      expect(response.body.data.attributes.currentBalance).toBeDefined();
    });
  });

  describe('PATCH /budgets/:id', () => {
    let budgetId: string;

    beforeEach(async () => {
      const budget = await testContext.prisma.budget.create({
        data: {
          farmId,
          name: 'Test Budget',
          description: 'Original description',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          totalBudget: 10000000,
          currency: 'NGN',
          status: 'DRAFT'
        }
      });

      budgetId = budget.id;
    });

    it('should update budget successfully', async () => {
      const updateData = {
        data: {
          type: 'budgets',
          id: budgetId,
          attributes: {
            name: 'Updated Budget',
            status: 'ACTIVE'
          }
        }
      };

      const response: Response = await testContext
        .request()
        .patch(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('Updated Budget');
      expect(response.body.data.attributes.status).toBe('ACTIVE');
    });
  });

  describe('DELETE /budgets/:id', () => {
    let budgetId: string;

    beforeEach(async () => {
      const budget = await testContext.prisma.budget.create({
        data: {
          farmId,
          name: 'Budget to Delete',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          totalBudget: 10000000,
          currency: 'NGN',
          status: 'ACTIVE'
        }
      });

      budgetId = budget.id;
    });

    it('should delete budget successfully', async () => {
      await testContext
        .request()
        .delete(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(204);

      // Verify deletion
      await testContext
        .request()
        .get(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});

