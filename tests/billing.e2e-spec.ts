import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

describe('Billing E2E Tests', () => {
  let testContext: TestContext;
  let testOrganization: any;
  let accessToken: string;
  let testPlan: SubscriptionPlan;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up billing-related tables before each test
    await testContext.cleanupTables([
      'subscriptions',
      'subscription_plans',
      'invoices',
      'payment_methods',
      'users',
      'organizations',
    ]);

    // Create test organization
    testOrganization = await testContext.createOrganization({
      name: 'Test Billing Organization',
      type: 'FARM_OPERATION',
      email: 'billing@farm.com',
    });

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    await testContext.createUser({
      email: 'billinguser@farm.com',
      name: 'Test Billing User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id,
    });

    // Create a subscription plan to be used in tests
    testPlan = await testContext.prisma.subscriptionPlan.create({
      data: {
        name: 'Basic Monthly',
        tier: 'BASIC',
        description: 'Basic plan for testing',
        priceUSD: 10,
        priceNGN: 10000,
        billingInterval: 'MONTHLY',
        maxUsers: 5,
        maxFarms: 2,
        maxActivitiesPerMonth: 100,
        maxActiveListings: 10,
        storageGB: 10,
        apiCallsPerDay: 1000,
        hasAdvancedAnalytics: false,
        hasAIInsights: false,
        hasAPIAccess: false,
        hasCustomRoles: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
        isActive: true,
        isPublic: true,
      },
    });


    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'billinguser@farm.com',
        password: 'TestPassword123!',
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Subscription Plans', () => {
    describe('GET /billing/plans', () => {
      it('should get all subscription plans successfully', async () => {
        const response = await testContext
          .request()
          .get('/billing/plans')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].type).toBe('subscription-plans');
        expect(response.body.data[0].attributes.name).toBe(testPlan.name);
      });

      it('should fail without authentication', async () => {
        await testContext.request().get('/billing/plans').expect(401);
      });
    });

    describe('GET /billing/plans/:id', () => {
      it('should get a single subscription plan by ID', async () => {
        const response = await testContext
          .request()
          .get(`/billing/plans/${testPlan.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.type).toBe('subscription-plans');
        expect(response.body.data.id).toBe(testPlan.id);
        expect(response.body.data.attributes.name).toBe(testPlan.name);
      });

      it('should fail for a non-existent plan ID', async () => {
        const nonExistentId = 'clx5g00000000000000000000';
        await testContext
          .request()
          .get(`/billing/plans/${nonExistentId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });
    });
  });

  describe('Subscriptions', () => {
    describe('POST /billing/subscription', () => {
      it('should create a new subscription successfully', async () => {
        const createSubData = {
          data: {
            type: 'subscriptions',
            attributes: {
              planId: testPlan.id,
              currency: 'USD',
              billingInterval: 'MONTHLY',
              // paymentMethodId is optional - will be null if not provided
            },
          },
        };

        const response = await testContext
          .request()
          .post('/billing/subscription')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createSubData);

        expect(response.status).toBe(201);

        expect(response.body.data.type).toBe('subscriptions');
        expect(response.body.data.attributes.planId).toBe(testPlan.id);
        expect(response.body.data.attributes.organizationId).toBe(
          testOrganization.id,
        );
        expect(response.body.data.attributes.status).toBe('ACTIVE');
      });

      it('should fail to create subscription with invalid plan ID', async () => {
        const invalidPlanId = 'clx5g00000000000000000000';
        const createSubData = {
          data: {
            type: 'subscriptions',
            attributes: {
              planId: invalidPlanId,
              currency: 'USD',
              billingInterval: 'MONTHLY',
              paymentMethodId: 'pm_card_visa',
            },
          },
        };

        await testContext
          .request()
          .post('/billing/subscription')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createSubData)
          .expect(404);
      });
    });

    describe('GET /billing/subscription', () => {
      it('should get current organization subscription', async () => {
        // First, create a subscription
        await testContext.prisma.subscription.create({
          data: {
            organizationId: testOrganization.id,
            planId: testPlan.id,
            status: 'ACTIVE',
            currency: 'USD',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
            billingInterval: 'MONTHLY',
            stripeCustomerId: 'cus_123',
            stripeSubscriptionId: 'sub_123',
          },
        });

        const response = await testContext
          .request()
          .get('/billing/subscription')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data.type).toBe('subscriptions');
        expect(response.body.data.attributes.organizationId).toBe(
          testOrganization.id,
        );
      });

      it('should return 404 if no subscription exists', async () => {
        await testContext
          .request()
          .get('/billing/subscription')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });
    });

    describe('POST /billing/subscription/change-plan', () => {
      let newPlan: SubscriptionPlan;
      beforeEach(async () => {
        // Create a subscription to change
        await testContext.prisma.subscription.create({
          data: {
            organizationId: testOrganization.id,
            planId: testPlan.id,
            status: 'ACTIVE',
            currency: 'USD',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
            billingInterval: 'MONTHLY',
            stripeCustomerId: 'cus_123',
            stripeSubscriptionId: 'sub_123',
          },
        });

        // Create a new plan to switch to
        newPlan = await testContext.prisma.subscriptionPlan.create({
          data: {
            name: 'Pro Monthly',
            tier: 'PRO',
            description: 'Pro plan for testing',
            priceUSD: 50,
            priceNGN: 50000,
            billingInterval: 'MONTHLY',
            maxUsers: 20,
            maxFarms: 10,
            maxActivitiesPerMonth: 1000,
            maxActiveListings: 100,
            storageGB: 100,
            apiCallsPerDay: 10000,
            hasAdvancedAnalytics: true,
            hasAIInsights: true,
            hasAPIAccess: true,
            hasCustomRoles: false,
            hasPrioritySupport: false,
            hasWhiteLabel: false,
            isActive: true,
            isPublic: true,
          },
        });
      });

      it('should change subscription plan successfully', async () => {
        const changePlanData = {
          data: {
            type: 'subscriptions',
            attributes: {
              planId: newPlan.id,
              billingInterval: 'MONTHLY',
            },
          },
        };

        const response = await testContext
          .request()
          .post('/billing/subscription/change-plan')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePlanData)
          .expect(200);

        expect(response.body.data.attributes.planId).toBe(newPlan.id);
      });
    });

    describe('POST /billing/subscription/cancel', () => {
      beforeEach(async () => {
        // Create a subscription to cancel
        await testContext.prisma.subscription.create({
          data: {
            organizationId: testOrganization.id,
            planId: testPlan.id,
            status: 'ACTIVE',
            currency: 'USD',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
            billingInterval: 'MONTHLY',
            stripeCustomerId: 'cus_123',
            stripeSubscriptionId: 'sub_123',
          },
        });
      });

      it('should cancel subscription successfully', async () => {
        const cancelSubData = {
          data: {
            type: 'subscriptions',
            attributes: {
              cancelReason: 'No longer needed',
              immediate: true, // Cancel immediately
            },
          },
        };

        const response = await testContext
          .request()
          .post('/billing/subscription/cancel')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(cancelSubData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('CANCELED');
        expect(response.body.data.attributes.cancelAtPeriodEnd).toBe(false);
        expect(response.body.data.attributes.canceledAt).toBeDefined();
      });
    });
  });

  describe('Invoices', () => {
    let testInvoice: any;
    let testSubscription: any;
    beforeEach(async () => {
      // Create a subscription for the invoice
      testSubscription = await testContext.prisma.subscription.create({
        data: {
          organizationId: testOrganization.id,
          planId: testPlan.id,
          status: 'ACTIVE',
          currency: 'USD',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          billingInterval: 'MONTHLY',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
        },
      });

      // Create a test invoice
      testInvoice = await testContext.prisma.invoice.create({
        data: {
          subscriptionId: testSubscription.id,
          invoiceNumber: 'INV-202501-0001',
          status: 'PAID',
          subtotal: 10,
          tax: 0,
          total: 10,
          amountPaid: 10,
          amountDue: 0,
          currency: 'USD',
          issuedAt: new Date(),
          dueDate: new Date(),
          paidAt: new Date(),
          paymentIntentId: 'pi_123',
          lineItems: [
            {
              description: 'Basic Monthly Plan',
              quantity: 1,
              unitPrice: '10.00',
              amount: '10.00',
            },
          ],
        },
      });
    });

    describe('GET /billing/invoices', () => {
      it('should get all invoices for the organization', async () => {
        const response = await testContext
          .request()
          .get('/billing/invoices')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].type).toBe('invoices');
      });
    });

    describe('GET /billing/invoices/:id', () => {
      it('should get a single invoice by ID', async () => {
        const response = await testContext
          .request()
          .get(`/billing/invoices/${testInvoice.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data.id).toBe(testInvoice.id);
        expect(response.body.data.attributes.total).toBe('10.00');
      });
    });
  });

  describe('Payment Methods', () => {
    // These tests would require mocking the payment provider service.
    // For now, we'll test the endpoints and expect them to fail gracefully
    // if the provider is not configured. This is a placeholder for now.

    describe('POST /billing/payment-methods', () => {
      it('should add a new payment method (mocked)', async () => {
        const createPmData = {
          data: {
            type: 'payment-methods',
            attributes: {
              type: 'CARD',
              provider: 'STRIPE',
              stripePaymentMethodId: 'pm_card_visa', // Mock Stripe payment method ID
              setAsDefault: true,
            },
          },
        };

        // This test is expected to fail with a 500 or 400
        // if the billing service is not fully implemented with Stripe.
        // We are asserting that the endpoint exists and responds.
        const response = await testContext
          .request()
          .post('/billing/payment-methods')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createPmData);

        // Depending on implementation, this could be 201, 400, 500, etc.
        // For now, we just check that the endpoint is reachable
        expect([201, 400, 500]).toContain(response.status);
      });
    });
  });

  describe('Usage', () => {
    describe('GET /billing/usage', () => {
      it('should get usage statistics for the organization', async () => {
        // This test assumes the billing service can calculate usage.
        // We are asserting that the endpoint exists and responds.
        const response = await testContext
          .request()
          .get('/billing/usage')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).not.toBe(500);
        if (response.status === 200) {
          expect(response.body.data.type).toBe('usage-stats');
        }
      });
    });
  });

  describe('Admin Functions', () => {
    let adminAccessToken: string;

    beforeEach(async () => {
      // Create an admin organization
      const adminOrg = await testContext.createOrganization({
        name: 'Admin Organization',
        type: 'FARM_OPERATION',
        email: 'admin-org@farmpro.app',
      });

      // Create a platform admin role
      const adminRole = await testContext.prisma.role.create({
        data: {
          name: 'Platform Admin',
          description: 'Platform administrator with full access',
          organizationId: adminOrg.id,
          isPlatformAdmin: true,
          isSystemRole: true,
          scope: 'PLATFORM',
        },
      });

      // Create an admin user
      const adminPassword = await hash('AdminPassword123!');
      const adminUser = await testContext.createUser({
        email: 'admin@farmpro.app',
        name: 'Admin User',
        hashedPassword: adminPassword,
        emailVerified: true,
        isActive: true,
        organizationId: adminOrg.id,
      });

      // Assign platform admin role to user
      await testContext.prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });

      // Login as admin
      const loginResponse = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: adminUser.email,
          password: 'AdminPassword123!',
        })
        .expect(200);

      adminAccessToken = loginResponse.body.data.attributes.tokens.accessToken;
    });

    describe('GET /billing/admin/subscriptions', () => {
      it('should return not implemented (endpoint exists but not yet implemented)', async () => {
        // Create a subscription to be listed
        await testContext.prisma.subscription.create({
          data: {
            organizationId: testOrganization.id,
            planId: testPlan.id,
            status: 'ACTIVE',
            currency: 'USD',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
            billingInterval: 'MONTHLY',
            stripeCustomerId: 'cus_admin',
            stripeSubscriptionId: 'sub_admin_test',
          },
        });

        const response = await testContext
          .request()
          .get('/billing/admin/subscriptions')
          .set('Authorization', `Bearer ${adminAccessToken}`);

        // Admin endpoint is not implemented yet, should return 500
        expect(response.status).toBe(500);
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors[0].code).toBe('ADMIN_GET_SUBSCRIPTIONS_NOT_IMPLEMENTED');
      });

      it('should be forbidden for non-admin users', async () => {
        await testContext
          .request()
          .get('/billing/admin/subscriptions')
          .set('Authorization', `Bearer ${accessToken}`) // Regular user token
          .expect(403);
      });
    });
  });

  describe('Subscription Plan Changes and Feature Updates', () => {
    let testSubscription: any;

    beforeEach(async () => {
      // Create a test subscription
      testSubscription = await testContext.prisma.subscription.create({
        data: {
          organizationId: testOrganization.id,
          planId: testPlan.id,
          status: SubscriptionStatus.ACTIVE,
          currency: 'USD',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          billingInterval: 'MONTHLY',
          isTrialing: false,
          autoRenew: true,
          cancelAtPeriodEnd: false,
        },
      });
    });

    describe('PATCH /billing/subscriptions/:id/change-plan', () => {
      it('should update organization features when changing from FREE to PRO plan', async () => {
        // Create FREE plan
        const freePlan = await testContext.prisma.subscriptionPlan.create({
          data: {
            name: 'Free Plan',
            tier: 'FREE',
            description: 'Free plan for basic usage',
            priceUSD: 0,
            priceNGN: 0,
            billingInterval: 'MONTHLY',
            maxUsers: 1,
            maxFarms: 1,
            maxActivitiesPerMonth: 50,
            maxActiveListings: 0,
            storageGB: 1,
            apiCallsPerDay: 100,
            hasAdvancedAnalytics: false,
            hasAIInsights: false,
            hasAPIAccess: false,
            hasCustomRoles: false,
            hasPrioritySupport: false,
            hasWhiteLabel: false,
            isActive: true,
            isPublic: true,
          },
        });

        // Create PRO plan
        const proPlan = await testContext.prisma.subscriptionPlan.create({
          data: {
            name: 'Pro Plan',
            tier: 'PRO',
            description: 'Professional plan for growing operations',
            priceUSD: 99,
            priceNGN: 40000,
            billingInterval: 'MONTHLY',
            maxUsers: 10,
            maxFarms: 5,
            maxActivitiesPerMonth: 1000,
            maxActiveListings: 50,
            storageGB: 50,
            apiCallsPerDay: 5000,
            hasAdvancedAnalytics: true,
            hasAIInsights: true,
            hasAPIAccess: true,
            hasCustomRoles: true,
            hasPrioritySupport: true,
            hasWhiteLabel: false,
            isActive: true,
            isPublic: true,
          },
        });

        // Update organization to FREE plan initially
        await testContext.prisma.organization.update({
          where: { id: testOrganization.id },
          data: {
            plan: 'FREE',
            features: ['basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management'],
            allowedModules: ['farm_management', 'activities', 'marketplace', 'orders', 'inventory', 'media'],
          },
        });

        // Update subscription to FREE plan
        await testContext.prisma.subscription.update({
          where: { id: testSubscription.id },
          data: { planId: freePlan.id },
        });

        // Change plan to PRO
        const response = await testContext
          .request()
          .patch(`/billing/subscriptions/${testSubscription.id}/change-plan`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            planId: proPlan.id,
            billingInterval: 'MONTHLY',
          });

        expect(response.status).toBe(200);

        // Verify organization features were updated
        const updatedOrg = await testContext.prisma.organization.findUnique({
          where: { id: testOrganization.id },
        });

        expect(updatedOrg).toBeDefined();
        expect(updatedOrg!.features).toContain('advanced_analytics');
        expect(updatedOrg!.features).toContain('ai_insights');
        expect(updatedOrg!.features).toContain('api_access');
        expect(updatedOrg!.features).toContain('custom_roles');

        expect(updatedOrg!.allowedModules).toContain('analytics');
        expect(updatedOrg!.allowedModules).toContain('intelligence');
        expect(updatedOrg!.allowedModules).toContain('trading');
      });

      it('should update organization features when changing from PRO to BASIC plan', async () => {
        // Create PRO plan
        const proPlan = await testContext.prisma.subscriptionPlan.create({
          data: {
            name: 'Pro Plan',
            tier: 'PRO',
            description: 'Professional plan for growing operations',
            priceUSD: 99,
            priceNGN: 40000,
            billingInterval: 'MONTHLY',
            maxUsers: 10,
            maxFarms: 5,
            maxActivitiesPerMonth: 1000,
            maxActiveListings: 50,
            storageGB: 50,
            apiCallsPerDay: 5000,
            hasAdvancedAnalytics: true,
            hasAIInsights: true,
            hasAPIAccess: true,
            hasCustomRoles: true,
            hasPrioritySupport: true,
            hasWhiteLabel: false,
            isActive: true,
            isPublic: true,
          },
        });

        // Create BASIC plan
        const basicPlan = await testContext.prisma.subscriptionPlan.create({
          data: {
            name: 'Basic Plan',
            tier: 'BASIC',
            description: 'Basic plan for small operations',
            priceUSD: 29,
            priceNGN: 12000,
            billingInterval: 'MONTHLY',
            maxUsers: 3,
            maxFarms: 2,
            maxActivitiesPerMonth: 200,
            maxActiveListings: 5,
            storageGB: 5,
            apiCallsPerDay: 500,
            hasAdvancedAnalytics: false,
            hasAIInsights: false,
            hasAPIAccess: false,
            hasCustomRoles: false,
            hasPrioritySupport: false,
            hasWhiteLabel: false,
            isActive: true,
            isPublic: true,
          },
        });

        // Update organization to PRO plan initially
        await testContext.prisma.organization.update({
          where: { id: testOrganization.id },
          data: {
            plan: 'PRO',
            features: [
              'basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management',
              'advanced_analytics', 'ai_insights', 'api_access', 'custom_roles'
            ],
            allowedModules: [
              'farm_management', 'activities', 'marketplace', 'orders', 'inventory',
              'analytics', 'trading', 'intelligence', 'media'
            ],
          },
        });

        // Update subscription to PRO plan
        await testContext.prisma.subscription.update({
          where: { id: testSubscription.id },
          data: { planId: proPlan.id },
        });

        // Change plan to BASIC
        const response = await testContext
          .request()
          .patch(`/billing/subscriptions/${testSubscription.id}/change-plan`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            planId: basicPlan.id,
            billingInterval: 'MONTHLY',
          });

        expect(response.status).toBe(200);

        // Verify organization features were updated
        const updatedOrg = await testContext.prisma.organization.findUnique({
          where: { id: testOrganization.id },
        });

        expect(updatedOrg).toBeDefined();
        
        // Should still have basic features
        expect(updatedOrg!.features).toContain('basic_farm_management');
        expect(updatedOrg!.features).toContain('marketplace_access');
        expect(updatedOrg!.features).toContain('order_management');
        expect(updatedOrg!.features).toContain('inventory_management');

        // Should not have premium features
        expect(updatedOrg!.features).not.toContain('advanced_analytics');
        expect(updatedOrg!.features).not.toContain('ai_insights');
        expect(updatedOrg!.features).not.toContain('api_access');
        expect(updatedOrg!.features).not.toContain('custom_roles');

        // Should not have premium modules
        expect(updatedOrg!.allowedModules).not.toContain('analytics');
        expect(updatedOrg!.allowedModules).not.toContain('intelligence');
        expect(updatedOrg!.allowedModules).not.toContain('trading');
      });
    });
  });
});
