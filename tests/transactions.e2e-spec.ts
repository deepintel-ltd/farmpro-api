import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import { TransactionType, TransactionStatus } from '@prisma/client';

describe('Transactions E2E Tests', () => {
  let testContext: TestContext;
  let testOrganization: any;
  let testFarm: any;
  let testOrder: any;
  let accessToken: string;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up transaction-related tables before each test
    await testContext.cleanupTables([
      'transactions',
      'farm_activities',
      'orders',
      'commodities',
      'farms',
      'users',
      'organizations',
    ]);

    // Create test organization
    testOrganization = await testContext.createOrganization({
      name: 'Test Transaction Organization',
      type: 'FARM_OPERATION',
      email: 'transactions@farm.com',
    });

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    await testContext.createUser({
      email: 'transactionuser@farm.com',
      name: 'Test Transaction User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id,
    });

    // Create test farm
    testFarm = await testContext.prisma.farm.create({
      data: {
        name: 'Test Farm',
        organizationId: testOrganization.id,
        totalArea: 100,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        establishedDate: new Date(),
        cropTypes: ['wheat'],
      },
    });

    // Create test commodity
    const testCommodity = await testContext.prisma.commodity.create({
      data: {
        name: 'Test Wheat',
        category: 'GRAIN',
        quantity: 100,
        unit: 'kg',
        description: 'Test wheat commodity',
      },
    });

    // Create test order
    testOrder = await testContext.prisma.order.create({
      data: {
        orderNumber: 'ORD-001',
        title: 'Test Order',
        type: 'BUY',
        status: 'PENDING',
        commodityId: testCommodity.id,
        quantity: 100,
        pricePerUnit: 50,
        totalPrice: 5000,
        currency: 'NGN',
        buyerOrgId: testOrganization.id,
        createdById: (await testContext.prisma.user.findFirst({
          where: { organizationId: testOrganization.id }
        }))!.id,
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        deliveryLocation: 'Test Delivery Location',
      },
    });

    // Create test activity
    await testContext.prisma.farmActivity.create({
      data: {
        farmId: testFarm.id,
        type: 'PLANTING',
        name: 'Test Planting Activity',
        description: 'Test planting activity description',
        status: 'PLANNED',
        priority: 'NORMAL',
        scheduledAt: new Date(),
        createdById: (await testContext.prisma.user.findFirst({
          where: { organizationId: testOrganization.id }
        }))!.id,
      },
    });

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'transactionuser@farm.com',
        password: 'TestPassword123!',
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('POST /transactions', () => {
    it('should create a farm expense transaction', async () => {
      const transactionData = {
        data: {
          type: 'transactions',
          attributes: {
            type: 'FARM_EXPENSE',
            amount: 1500,
            currency: 'NGN',
            description: 'Equipment maintenance',
            farmId: testFarm.id,
            metadata: {
              category: 'equipment',
              vendor: 'ABC Equipment Co.'
            }
          }
        }
      };

      const response = await testContext.request()
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('transactions');
      expect(response.body.data.attributes.type).toBe('FARM_EXPENSE');
      expect(response.body.data.attributes.amount).toBe(1500);
      expect(response.body.data.attributes.status).toBe('PENDING');
      expect(response.body.data.attributes.farmId).toBe(testFarm.id);
      expect(response.body.data.attributes.reference).toMatch(/^EXP-/);
    });

    it('should create a farm revenue transaction', async () => {
      const transactionData = {
        data: {
          type: 'transactions',
          attributes: {
            type: 'FARM_REVENUE',
            amount: 5000,
            currency: 'NGN',
            description: 'Wheat sale revenue',
            farmId: testFarm.id,
            orderId: testOrder.id,
            metadata: {
              commodity: 'wheat',
              quantity: 100
            }
          }
        }
      };

      const response = await testContext.request()
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.data.attributes.type).toBe('FARM_REVENUE');
      expect(response.body.data.attributes.amount).toBe(5000);
      expect(response.body.data.attributes.orderId).toBe(testOrder.id);
      expect(response.body.data.attributes.reference).toMatch(/^REV-/);
    });

    it('should create an order payment transaction', async () => {
      const transactionData = {
        data: {
          type: 'transactions',
          attributes: {
            type: 'ORDER_PAYMENT',
            amount: 3000,
            currency: 'NGN',
            description: 'Payment for order',
            orderId: testOrder.id,
            metadata: {
              paymentMethod: 'bank_transfer'
            }
          }
        }
      };

      const response = await testContext.request()
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.data.attributes.type).toBe('ORDER_PAYMENT');
      expect(response.body.data.attributes.orderId).toBe(testOrder.id);
      expect(response.body.data.attributes.reference).toMatch(/^PAY-/);
    });

    it('should create a platform fee transaction', async () => {
      const transactionData = {
        data: {
          type: 'transactions',
          attributes: {
            type: 'PLATFORM_FEE',
            amount: 150,
            currency: 'NGN',
            description: 'Platform commission fee',
            orderId: testOrder.id,
            metadata: {
              feeType: 'commission',
              rate: 0.05
            }
          }
        }
      };

      const response = await testContext.request()
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.data.attributes.type).toBe('PLATFORM_FEE');
      expect(response.body.data.attributes.reference).toMatch(/^FEE-/);
    });

    it('should fail to create transaction with invalid farm ID', async () => {
      const transactionData = {
        data: {
          type: 'transactions',
          attributes: {
            type: 'FARM_EXPENSE',
            amount: 1000,
            currency: 'NGN',
            description: 'Invalid farm expense',
            farmId: 'invalid-farm-id'
          }
        }
      };

      await testContext.request()
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transactionData)
        .expect(404);
    });

    it('should fail to create transaction with invalid order ID', async () => {
      const transactionData = {
        data: {
          type: 'transactions',
          attributes: {
            type: 'ORDER_PAYMENT',
            amount: 1000,
            currency: 'NGN',
            description: 'Invalid order payment',
            orderId: 'invalid-order-id'
          }
        }
      };

      await testContext.request()
        .post('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transactionData)
        .expect(404);
    });
  });

  describe('GET /transactions/:id', () => {
    let testTransaction: any;

    beforeEach(async () => {
      // Create a test transaction
      testTransaction = await testContext.prisma.transaction.create({
        data: {
          organizationId: testOrganization.id,
          type: TransactionType.FARM_EXPENSE,
          amount: 2000,
          currency: 'NGN',
          status: TransactionStatus.PENDING,
          description: 'Test transaction',
          farmId: testFarm.id,
          reference: 'TEST-REF-001'
        }
      });
    });

    it('should get transaction by ID', async () => {
      const response = await testContext.request()
        .get(`/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.attributes.id).toBe(testTransaction.id);
      expect(response.body.data.attributes.type).toBe('FARM_EXPENSE');
      expect(response.body.data.attributes.amount).toBe(2000);
      expect(response.body.data.attributes.farmId).toBe(testFarm.id);
    });

    it('should return 404 for non-existent transaction', async () => {
      await testContext.request()
        .get('/transactions/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /transactions/:id', () => {
    let testTransaction: any;

    beforeEach(async () => {
      testTransaction = await testContext.prisma.transaction.create({
        data: {
          organizationId: testOrganization.id,
          type: TransactionType.FARM_EXPENSE,
          amount: 2000,
          currency: 'NGN',
          status: TransactionStatus.PENDING,
          description: 'Test transaction',
          farmId: testFarm.id,
          reference: 'TEST-REF-002'
        }
      });
    });

    it('should update transaction status', async () => {
      const updateData = {
        data: {
          type: 'transactions',
          attributes: {
            status: 'COMPLETED',
            description: 'Updated description'
          }
        }
      };

      const response = await testContext.request()
        .patch(`/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.status).toBe('COMPLETED');
      expect(response.body.data.attributes.description).toBe('Updated description');
    });

    it('should update transaction amount', async () => {
      const updateData = {
        data: {
          type: 'transactions',
          attributes: {
            amount: 2500
          }
        }
      };

      const response = await testContext.request()
        .patch(`/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.amount).toBe(2500);
    });

    it('should fail to update non-existent transaction', async () => {
      const updateData = {
        data: {
          type: 'transactions',
          attributes: {
            status: 'COMPLETED'
          }
        }
      };

      await testContext.request()
        .patch('/transactions/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('GET /transactions', () => {
    beforeEach(async () => {
      // Create multiple test transactions
      await testContext.prisma.transaction.createMany({
        data: [
          {
            organizationId: testOrganization.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 1000,
            currency: 'NGN',
            status: TransactionStatus.PENDING,
            description: 'Expense 1',
            farmId: testFarm.id,
            reference: 'EXP-001'
          },
          {
            organizationId: testOrganization.id,
            type: TransactionType.FARM_REVENUE,
            amount: 2000,
            currency: 'NGN',
            status: TransactionStatus.COMPLETED,
            description: 'Revenue 1',
            farmId: testFarm.id,
            reference: 'REV-001'
          },
          {
            organizationId: testOrganization.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 1500,
            currency: 'NGN',
            status: TransactionStatus.COMPLETED,
            description: 'Expense 2',
            farmId: testFarm.id,
            reference: 'EXP-002'
          }
        ]
      });
    });

    it('should list all transactions', async () => {
      const response = await testContext.request()
        .get('/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.total).toBe(3);
      expect(response.body.meta.page).toBe(1);
    });

    it('should filter transactions by type', async () => {
      const response = await testContext.request()
        .get('/transactions?type=FARM_EXPENSE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((transaction: any) => {
        expect(transaction.attributes.type).toBe('FARM_EXPENSE');
      });
    });

    it('should filter transactions by status', async () => {
      const response = await testContext.request()
        .get('/transactions?status=COMPLETED')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((transaction: any) => {
        expect(transaction.attributes.status).toBe('COMPLETED');
      });
    });

    it('should filter transactions by farm ID', async () => {
      const response = await testContext.request()
        .get(`/transactions?farmId=${testFarm.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      response.body.data.forEach((transaction: any) => {
        expect(transaction.attributes.farmId).toBe(testFarm.id);
      });
    });

    it('should support pagination', async () => {
      const response = await testContext.request()
        .get('/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.meta.total).toBe(3);
      expect(response.body.meta.totalPages).toBe(2);
    });
  });

  describe('GET /transactions/summary', () => {
    beforeEach(async () => {
      // Create test transactions for summary
      await testContext.prisma.transaction.createMany({
        data: [
          {
            organizationId: testOrganization.id,
            type: TransactionType.FARM_REVENUE,
            amount: 5000,
            currency: 'NGN',
            status: TransactionStatus.COMPLETED,
            description: 'Revenue 1',
            farmId: testFarm.id,
            reference: 'REV-001'
          },
          {
            organizationId: testOrganization.id,
            type: TransactionType.FARM_REVENUE,
            amount: 3000,
            currency: 'NGN',
            status: TransactionStatus.PENDING,
            description: 'Revenue 2',
            farmId: testFarm.id,
            reference: 'REV-002'
          },
          {
            organizationId: testOrganization.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 2000,
            currency: 'NGN',
            status: TransactionStatus.COMPLETED,
            description: 'Expense 1',
            farmId: testFarm.id,
            reference: 'EXP-001'
          },
          {
            organizationId: testOrganization.id,
            type: TransactionType.FARM_EXPENSE,
            amount: 1000,
            currency: 'NGN',
            status: TransactionStatus.PENDING,
            description: 'Expense 2',
            farmId: testFarm.id,
            reference: 'EXP-002'
          }
        ]
      });
    });

    it('should get transaction summary', async () => {
      const response = await testContext.request()
        .get('/transactions/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.totalRevenue).toBe(8000); // 5000 + 3000
      expect(response.body.data.totalExpenses).toBe(3000); // 2000 + 1000
      expect(response.body.data.netProfit).toBe(5000); // 8000 - 3000
      expect(response.body.data.transactionCount).toBe(4);
      expect(response.body.data.pendingAmount).toBe(4000); // 3000 + 1000
      expect(response.body.data.completedAmount).toBe(7000); // 5000 + 2000
    });

    it('should get transaction summary filtered by farm', async () => {
      const response = await testContext.request()
        .get(`/transactions/summary?farmId=${testFarm.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.transactionCount).toBe(4);
    });
  });

  describe('PATCH /transactions/:id/paid', () => {
    let testTransaction: any;

    beforeEach(async () => {
      testTransaction = await testContext.prisma.transaction.create({
        data: {
          organizationId: testOrganization.id,
          type: TransactionType.FARM_EXPENSE,
          amount: 2000,
          currency: 'NGN',
          status: TransactionStatus.PENDING,
          description: 'Test transaction',
          farmId: testFarm.id,
          reference: 'TEST-REF-003'
        }
      });
    });

    it('should mark transaction as paid', async () => {
      const markPaidData = {
        data: {
          type: 'transactions',
          attributes: {
            reference: 'PAYMENT-REF-001',
            metadata: {
              paymentMethod: 'bank_transfer'
            }
          }
        }
      };

      const response = await testContext.request()
        .patch(`/transactions/${testTransaction.id}/paid`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(markPaidData)
        .expect(200);

      expect(response.body.data.attributes.status).toBe('COMPLETED');
      expect(response.body.data.attributes.paidDate).toBeDefined();
      expect(response.body.data.attributes.reference).toBe('PAYMENT-REF-001');
    });

    it('should fail to mark already completed transaction as paid', async () => {
      // First mark as paid
      await testContext.prisma.transaction.update({
        where: { id: testTransaction.id },
        data: { status: TransactionStatus.COMPLETED }
      });

      const markPaidData = {
        data: {
          type: 'transactions',
          attributes: {}
        }
      };

      await testContext.request()
        .patch(`/transactions/${testTransaction.id}/paid`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(markPaidData)
        .expect(400);
    });
  });

  describe('PATCH /transactions/:id/cancel', () => {
    let testTransaction: any;

    beforeEach(async () => {
      testTransaction = await testContext.prisma.transaction.create({
        data: {
          organizationId: testOrganization.id,
          type: TransactionType.FARM_EXPENSE,
          amount: 2000,
          currency: 'NGN',
          status: TransactionStatus.PENDING,
          description: 'Test transaction',
          farmId: testFarm.id,
          reference: 'TEST-REF-004'
        }
      });
    });

    it('should cancel transaction', async () => {
      const cancelData = {
        data: {
          type: 'transactions',
          attributes: {
            reason: 'Customer requested cancellation',
            metadata: {
              cancelledBy: 'admin'
            }
          }
        }
      };

      const response = await testContext.request()
        .patch(`/transactions/${testTransaction.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.data.attributes.status).toBe('CANCELLED');
      expect(response.body.data.attributes.metadata.cancellationReason).toBe('Customer requested cancellation');
      expect(response.body.data.attributes.metadata.cancelledAt).toBeDefined();
    });

    it('should fail to cancel already completed transaction', async () => {
      // First mark as completed
      await testContext.prisma.transaction.update({
        where: { id: testTransaction.id },
        data: { status: TransactionStatus.COMPLETED }
      });

      const cancelData = {
        data: {
          type: 'transactions',
          attributes: {
            reason: 'Test cancellation'
          }
        }
      };

      await testContext.request()
        .patch(`/transactions/${testTransaction.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cancelData)
        .expect(400);
    });

    it('should fail to cancel already cancelled transaction', async () => {
      // First cancel the transaction
      await testContext.prisma.transaction.update({
        where: { id: testTransaction.id },
        data: { status: TransactionStatus.CANCELLED }
      });

      const cancelData = {
        data: {
          type: 'transactions',
          attributes: {
            reason: 'Test cancellation'
          }
        }
      };

      await testContext.request()
        .patch(`/transactions/${testTransaction.id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(cancelData)
        .expect(400);
    });
  });

});
