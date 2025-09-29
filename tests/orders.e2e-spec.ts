import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Orders E2E Tests', () => {
  let testContext: TestContext;
  let testUser: any;
  let testUser2: any;
  let testOrganization: any;
  let testOrganization2: any;
  let testCommodity: any;
  let testInventory: any;
  let accessToken: string;
  let accessToken2: string;
  const nonExistentOrderId = 'cixf02ym000001b66m45ae4k8';

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up orders-related tables before each test
    await testContext.cleanupTables([
      'order_items',
      'orders',
      'inventory',
      'commodities',
      'users',
      'organizations'
    ]);
    
    // Create test organizations
    testOrganization = await testContext.createOrganization({
      name: 'Test Buyer Organization',
      type: 'FARM_OPERATION',
      email: 'buyer@test.com'
    });

    testOrganization2 = await testContext.createOrganization({
      name: 'Test Supplier Organization',
      type: 'COMMODITY_TRADER',
      email: 'supplier@test.com'
    });

    // Create test users
    const hashedPassword = await hash('TestPassword123!');
    testUser = await testContext.createUser({
      email: 'buyer@test.com',
      name: 'Test Buyer User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id
    });

    const hashedPassword2 = await hash('TestPassword123!');
    testUser2 = await testContext.createUser({
      email: 'supplier@test.com',
      name: 'Test Supplier User',
      phone: '+1234567891',
      hashedPassword: hashedPassword2,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization2.id
    });

    // Create test commodity
    testCommodity = await testContext.prisma.commodity.create({
      data: {
        name: 'Test Wheat',
        category: 'GRAIN',
        description: 'High quality wheat for testing',
        quantity: 1000,
        unit: 'kg',
        isActive: true
      }
    });

    // Create test inventory
    testInventory = await testContext.prisma.inventory.create({
      data: {
        commodityId: testCommodity.id,
        organizationId: testOrganization2.id,
        quantity: 1000,
        unit: 'kg',
        quality: 'premium',
        location: 'Warehouse A',
        status: 'AVAILABLE'
      }
    });

    // Login to get access tokens
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'buyer@test.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;

    const loginResponse2 = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'supplier@test.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken2 = loginResponse2.body.data.attributes.tokens.accessToken;
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('POST /orders', () => {
    it('should create a new order successfully', async () => {
      const orderData = {
        data: {
          type: 'orders',
          attributes: {
            type: 'BUY',
            status: 'PENDING',
            title: 'Test Wheat Order',
            description: 'Order for high quality wheat',
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            deliveryAddress: {
              street: '123 Farm Road',
              city: 'Test City',
              state: 'TC',
              zip: '12345',
              coordinates: {
                lat: 40.7128,
                lng: -74.0060
              }
            },
            items: [
              {
                commodityId: testCommodity.id,
                quantity: 100,
                unit: 'kg',
                qualityRequirements: {
                  grade: 'premium',
                  specifications: {
                    moisture: '< 14%',
                    protein: '> 12%'
                  }
                },
                unitPrice: 2.50,
                priceType: 'fixed'
              }
            ],
            paymentTerms: 'Net 30 days',
            specialInstructions: 'Deliver to loading dock',
            isPublic: false,
            metadata: {
              priority: 'normal',
              source: 'manual'
            }
          }
        }
      };

      const response = await testContext
        .request()
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData);

      if (response.status !== 201) {
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }
      
      expect(response.status).toBe(201);

      expect(response.body.data.type).toBe('orders');
      expect(response.body.data.attributes.title).toBe(orderData.data.attributes.title);
      expect(response.body.data.attributes.type).toBe(orderData.data.attributes.type);
      expect(response.body.data.attributes.status).toBe('PENDING');
      expect(response.body.data.attributes.buyerOrgId).toBe(testOrganization.id);
      expect(response.body.data.attributes.createdBy).toBe(testUser.id);
      expect(response.body.data.attributes.items).toHaveLength(1);
    });

    it('should fail to create order with invalid data', async () => {
      const invalidData = {
        data: {
          type: 'orders',
          attributes: {
            type: 'INVALID_TYPE', // Invalid type
            title: '', // Empty title
            deliveryDate: 'invalid-date', // Invalid date
            items: [] // Empty items array
          }
        }
      };

      await testContext
        .request()
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should fail to create order without authentication', async () => {
      const orderData = {
        data: {
          type: 'orders',
          attributes: {
            type: 'BUY',
            title: 'Test Order',
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            items: [
              {
                commodityId: testCommodity.id,
                quantity: 100,
                unit: 'kg'
              }
            ]
          }
        }
      };

      await testContext
        .request()
        .post('/orders')
        .send(orderData)
        .expect(401);
    });

    it('should fail to create order with non-existent commodity', async () => {
      const orderData = {
        data: {
          type: 'orders',
          attributes: {
            type: 'BUY',
            title: 'Test Order',
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            items: [
              {
                commodityId: 'non-existent-commodity-id',
                quantity: 100,
                unit: 'kg'
              }
            ]
          }
        }
      };

      await testContext
        .request()
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(400);
    });
  });

  describe('GET /orders', () => {
    beforeEach(async () => {
      // Create a test order
      await testContext.prisma.order.create({
        data: {
          orderNumber: 'ORD-000001',
          title: 'Test Order for Listing',
          type: 'BUY',
          status: 'PENDING',
          commodityId: testCommodity.id,
          quantity: 100,
          pricePerUnit: 2.50,
          totalPrice: 250.00,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deliveryLocation: '123 Test Road',
          deliveryAddress: {
            street: '123 Test Road',
            city: 'Test City',
            state: 'TC',
            zip: '12345'
          },
          buyerOrgId: testOrganization.id,
          createdById: testUser.id,
          terms: {
            paymentTerms: 'Net 30 days'
          },
          metadata: {
            priority: 'normal'
          }
        }
      });
    });

    it('should get orders list successfully', async () => {
      const response = await testContext
        .request()
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].type).toBe('orders');
    });

    it('should filter orders by type', async () => {
      const response = await testContext
        .request()
        .get('/orders?type=BUY')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((order: any) => {
        expect(order.attributes.type).toBe('BUY');
      });
    });

    it('should filter orders by status', async () => {
      const response = await testContext
        .request()
        .get('/orders?status=DRAFT')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((order: any) => {
        expect(order.attributes.status).toBe('DRAFT');
      });
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/orders?page[number]=1&page[size]=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.totalCount).toBeDefined();
      expect(response.body.meta.page).toBeDefined();
      expect(response.body.meta.pageSize).toBeDefined();
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/orders')
        .expect(401);
    });
  });

  describe('GET /orders/:id', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await testContext.prisma.order.create({
        data: {
          orderNumber: 'ORD-000002',
          title: 'Test Order for Details',
          type: 'BUY',
          status: 'PENDING',
          commodityId: testCommodity.id,
          quantity: 100,
          pricePerUnit: 2.50,
          totalPrice: 250.00,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deliveryLocation: '123 Test Road',
          deliveryAddress: {
            street: '123 Test Road',
            city: 'Test City',
            state: 'TC',
            zip: '12345'
          },
          buyerOrgId: testOrganization.id,
          createdById: testUser.id,
          terms: {
            paymentTerms: 'Net 30 days'
          }
        }
      });
    });

    it('should get order details successfully', async () => {
      const response = await testContext
        .request()
        .get(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('orders');
      expect(response.body.data.attributes.id).toBe(testOrder.id);
      expect(response.body.data.attributes.title).toBe(testOrder.title);
      expect(response.body.data.attributes.type).toBe(testOrder.type);
    });

    it('should fail to get non-existent order', async () => {
      await testContext
        .request()
        .get(`/orders/${nonExistentOrderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/orders/${testOrder.id}`)
        .expect(401);
    });

    it('should fail to access order from different organization', async () => {
      await testContext
        .request()
        .get(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(403);
    });
  });

  describe('PATCH /orders/:id', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await testContext.prisma.order.create({
        data: {
          orderNumber: 'ORD-000003',
          title: 'Test Order for Update',
          type: 'BUY',
          status: 'PENDING',
          commodityId: testCommodity.id,
          quantity: 100,
          pricePerUnit: 2.50,
          totalPrice: 250.00,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deliveryLocation: '123 Test Road',
          deliveryAddress: {
            street: '123 Test Road',
            city: 'Test City',
            state: 'TC',
            zip: '12345'
          },
          buyerOrgId: testOrganization.id,
          createdById: testUser.id,
          terms: {
            paymentTerms: 'Net 30 days'
          }
        }
      });
    });

    it('should update order successfully', async () => {
      const updateData = {
        data: {
          type: 'orders',
          attributes: {
            title: 'Updated Order Title',
            description: 'Updated description',
            specialInstructions: 'Updated instructions'
          }
        }
      };

      const response = await testContext
        .request()
        .patch(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.title).toBe(updateData.data.attributes.title);
      expect(response.body.data.attributes.description).toBe(updateData.data.attributes.description);
      expect(response.body.data.attributes.specialInstructions).toBe(updateData.data.attributes.specialInstructions);
    });

    it('should fail to update non-existent order', async () => {
      const updateData = {
        data: {
          type: 'orders',
          attributes: {
            title: 'Updated Title'
          }
        }
      };

      await testContext
        .request()
        .patch(`/orders/${nonExistentOrderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should fail to update order from different organization', async () => {
      const updateData = {
        data: {
          type: 'orders',
          attributes: {
            title: 'Updated Title'
          }
        }
      };

      await testContext
        .request()
        .patch(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send(updateData)
        .expect(403);
    });

    it('should fail to update order with invalid data', async () => {
      const invalidData = {
        data: {
          type: 'orders',
          attributes: {
            type: 'INVALID_TYPE',
            title: ''
          }
        }
      };

      await testContext
        .request()
        .patch(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /orders/:id', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await testContext.prisma.order.create({
        data: {
          orderNumber: 'ORD-000004',
          title: 'Test Order for Deletion',
          type: 'BUY',
          status: 'PENDING',
          commodityId: testCommodity.id,
          quantity: 100,
          pricePerUnit: 2.50,
          totalPrice: 250.00,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deliveryLocation: '123 Test Road',
          deliveryAddress: {
            street: '123 Test Road',
            city: 'Test City',
            state: 'TC',
            zip: '12345'
          },
          buyerOrgId: testOrganization.id,
          createdById: testUser.id,
          terms: {
            paymentTerms: 'Net 30 days'
          }
        }
      });
    });

    it('should delete order successfully', async () => {
      const response = await testContext
        .request()
        .delete(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');

      // Verify order is deleted
      const deletedOrder = await testContext.prisma.order.findUnique({
        where: { id: testOrder.id }
      });
      expect(deletedOrder).toBeNull();
    });

    it('should fail to delete non-existent order', async () => {
      await testContext
        .request()
        .delete(`/orders/${nonExistentOrderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(404);
    });

    it('should fail to delete order from different organization', async () => {
      await testContext
        .request()
        .delete(`/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send({})
        .expect(403);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .delete(`/orders/${testOrder.id}`)
        .send({})
        .expect(401);
    });
  });

  describe('Order Lifecycle Management', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await testContext.prisma.order.create({
        data: {
          orderNumber: 'ORD-000005',
          title: 'Test Order for Lifecycle',
          type: 'BUY',
          status: 'PENDING',
          commodityId: testCommodity.id,
          quantity: 100,
          pricePerUnit: 2.50,
          totalPrice: 250.00,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deliveryLocation: '123 Test Road',
          deliveryAddress: {
            street: '123 Test Road',
            city: 'Test City',
            state: 'TC',
            zip: '12345'
          },
          buyerOrgId: testOrganization.id,
          createdById: testUser.id,
          terms: {
            paymentTerms: 'Net 30 days'
          }
        }
      });
    });

    describe('POST /orders/:id/publish', () => {
      it('should publish order successfully', async () => {
        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/publish`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
          .expect(200);

        expect(response.body.data.attributes.status).toBe('CONFIRMED');
        expect(response.body.data.attributes.metadata.isPublic).toBe(true);
        expect(response.body.data.attributes.metadata.publishedAt).toBeDefined();
      });

      it('should fail to publish order from different organization', async () => {
        await testContext
          .request()
          .post(`/orders/${testOrder.id}/publish`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send({})
          .expect(403);
      });

      it('should fail to publish non-existent order', async () => {
        await testContext
          .request()
          .post(`/orders/${nonExistentOrderId}/publish`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
          .expect(404);
      });
    });

    describe('POST /orders/:id/accept', () => {
      beforeEach(async () => {
        // First publish the order
        await testContext.prisma.order.update({
          where: { id: testOrder.id },
          data: {
            status: 'CONFIRMED',
            metadata: {
              isPublic: true,
              publishedAt: new Date().toISOString()
            }
          }
        });
      });

      it('should accept order successfully', async () => {
        const acceptData = {
          message: 'We accept this order',
          requiresNegotiation: false
        };

        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/accept`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(acceptData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('CONFIRMED');
        expect(response.body.data.attributes.supplierOrgId).toBe(testOrganization2.id);
        expect(response.body.data.attributes.metadata.acceptedAt).toBeDefined();
        expect(response.body.data.attributes.metadata.acceptanceMessage).toBe(acceptData.message);
      });

      it('should fail to accept order from same organization', async () => {
        const acceptData = {
          message: 'We accept this order',
          requiresNegotiation: false
        };

        await testContext
          .request()
          .post(`/orders/${testOrder.id}/accept`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(acceptData)
          .expect(403);
      });

      it('should fail to accept non-existent order', async () => {
        const acceptData = {
          message: 'We accept this order',
          requiresNegotiation: false
        };

        await testContext
          .request()
          .post(`/orders/${nonExistentOrderId}/accept`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(acceptData)
          .expect(404);
      });
    });

    describe('POST /orders/:id/reject', () => {
      it('should reject order successfully', async () => {
        const rejectData = {
          reason: 'price',
          message: 'Price is too high for our budget'
        };

        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/reject`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(rejectData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('CANCELLED');
        expect(response.body.data.attributes.metadata.rejectedAt).toBeDefined();
        expect(response.body.data.attributes.metadata.rejectionReason).toBe(rejectData.reason);
        expect(response.body.data.attributes.metadata.rejectionMessage).toBe(rejectData.message);
      });

      it('should fail to reject non-existent order', async () => {
        const rejectData = {
          reason: 'price',
          message: 'Price is too high'
        };

        await testContext
          .request()
          .post(`/orders/${nonExistentOrderId}/reject`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(rejectData)
          .expect(404);
      });
    });

    describe('POST /orders/:id/counter-offer', () => {
      it('should make counter offer successfully', async () => {
        const counterOfferData = {
          message: 'We propose a counter offer',
          changes: {
            totalAmount: 200.00,
            deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        };

        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/counter-offer`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(counterOfferData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('PENDING');
        expect(response.body.data.attributes.metadata.counterOfferAt).toBeDefined();
        expect(response.body.data.attributes.metadata.counterOfferMessage).toBe(counterOfferData.message);
        expect(response.body.data.attributes.metadata.counterOfferChanges).toEqual(counterOfferData.changes);
      });

      it('should fail to make counter offer without access', async () => {
        const counterOfferData = {
          message: 'We propose a counter offer',
          changes: {
            totalAmount: 200.00
          },
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        };

        await testContext
          .request()
          .post(`/orders/${testOrder.id}/counter-offer`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(counterOfferData)
          .expect(403);
      });
    });

    describe('POST /orders/:id/confirm', () => {
      beforeEach(async () => {
        // Set up order in confirmed state
        await testContext.prisma.order.update({
          where: { id: testOrder.id },
          data: {
            status: 'CONFIRMED',
            supplierOrgId: testOrganization2.id
          }
        });
      });

      it('should confirm order successfully', async () => {
        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/confirm`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
          .expect(200);

        expect(response.body.data.attributes.status).toBe('CONFIRMED');
        expect(response.body.data.attributes.metadata.confirmedAt).toBeDefined();
      });

      it('should fail to confirm order from different organization', async () => {
        await testContext
          .request()
          .post(`/orders/${testOrder.id}/confirm`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send({})
          .expect(403);
      });
    });

    describe('POST /orders/:id/start-fulfillment', () => {
      beforeEach(async () => {
        // Set up order in confirmed state with supplier
        await testContext.prisma.order.update({
          where: { id: testOrder.id },
          data: {
            status: 'CONFIRMED',
            supplierOrgId: testOrganization2.id
          }
        });
      });

      it('should start fulfillment successfully', async () => {
        const fulfillmentData = {
          estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Starting fulfillment process',
          trackingInfo: {
            batchNumbers: ['BATCH-001', 'BATCH-002'],
            qualityTestResults: {
              moisture: '13.5%',
              protein: '12.8%'
            },
            processingNotes: 'All quality checks passed'
          }
        };

        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/start-fulfillment`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(fulfillmentData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('IN_TRANSIT');
        expect(response.body.data.attributes.metadata.fulfillmentStartedAt).toBeDefined();
        expect(response.body.data.attributes.metadata.estimatedCompletionDate).toBe(fulfillmentData.estimatedCompletionDate);
        expect(response.body.data.attributes.metadata.fulfillmentNotes).toBe(fulfillmentData.notes);
      });

      it('should fail to start fulfillment from buyer organization', async () => {
        const fulfillmentData = {
          estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Starting fulfillment process'
        };

        await testContext
          .request()
          .post(`/orders/${testOrder.id}/start-fulfillment`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(fulfillmentData)
          .expect(403);
      });
    });

    describe('POST /orders/:id/complete', () => {
      beforeEach(async () => {
        // Set up order in transit state
        await testContext.prisma.order.update({
          where: { id: testOrder.id },
          data: {
            status: 'IN_TRANSIT',
            supplierOrgId: testOrganization2.id,
            metadata: {
              fulfillmentStartedAt: new Date().toISOString()
            }
          }
        });
      });

      it('should complete order successfully', async () => {
        const completeData = {
          deliveryConfirmation: {
            deliveredAt: new Date().toISOString(),
            receivedBy: 'John Doe',
            condition: 'excellent',
            notes: 'Delivered in perfect condition'
          },
          qualityAssessment: {
            meetsSpecifications: true,
            actualGrade: 'premium',
            issues: 'None'
          }
        };

        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/complete`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(completeData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('DELIVERED');
        expect(response.body.data.attributes.metadata.completedAt).toBeDefined();
        expect(response.body.data.attributes.metadata.deliveryConfirmation).toEqual(completeData.deliveryConfirmation);
        expect(response.body.data.attributes.metadata.qualityAssessment).toEqual(completeData.qualityAssessment);
      });

      it('should fail to complete order from different organization', async () => {
        const completeData = {
          deliveryConfirmation: {
            deliveredAt: new Date().toISOString(),
            receivedBy: 'John Doe',
            condition: 'excellent'
          },
          qualityAssessment: {
            meetsSpecifications: true
          }
        };

        await testContext
          .request()
          .post(`/orders/${testOrder.id}/complete`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(completeData)
          .expect(403);
      });
    });
  });

  describe('Order Item Management', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await testContext.prisma.order.create({
        data: {
          orderNumber: 'ORD-000006',
          title: 'Test Order for Items',
          type: 'BUY',
          status: 'PENDING',
          commodityId: testCommodity.id,
          quantity: 100,
          pricePerUnit: 2.50,
          totalPrice: 250.00,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deliveryLocation: '123 Test Road',
          deliveryAddress: {
            street: '123 Test Road',
            city: 'Test City',
            state: 'TC',
            zip: '12345'
          },
          buyerOrgId: testOrganization.id,
          createdById: testUser.id,
          terms: {
            paymentTerms: 'Net 30 days'
          }
        }
      });
    });

    describe('GET /orders/:id/items', () => {
      beforeEach(async () => {
        // Create test order items
        await testContext.prisma.orderItem.create({
          data: {
            orderId: testOrder.id,
            commodityId: testCommodity.id,
            inventoryId: testInventory.id,
            quantity: 100,
            unitPrice: 2.50,
            metadata: {
              qualityRequirements: {
                grade: 'premium',
                specifications: {
                  moisture: '< 14%'
                }
              }
            }
          }
        });
      });

      it('should get order items successfully', async () => {
        const response = await testContext
          .request()
          .get(`/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].type).toBe('order-items');
      });

      it('should fail to get items for non-existent order', async () => {
        await testContext
          .request()
          .get(`/orders/${nonExistentOrderId}/items`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });

      it('should fail to get items without access', async () => {
        await testContext
          .request()
          .get(`/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .expect(403);
      });
    });

    describe('POST /orders/:id/items', () => {
      it('should add order item successfully', async () => {
        const itemData = {
          commodityId: testCommodity.id,
          inventoryId: testInventory.id,
          quantity: 50,
          unit: 'kg',
          qualityRequirements: {
            grade: 'standard',
            specifications: {
              protein: '> 10%'
            }
          },
          unitPrice: 2.25,
          priceType: 'fixed'
        };

        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(itemData)
          .expect(201);

        expect(response.body.data.type).toBe('order-items');
        expect(response.body.data.attributes.quantity).toBe(itemData.quantity);
        expect(response.body.data.attributes.unitPrice).toBe(itemData.unitPrice);
        expect(response.body.data.attributes.metadata.qualityRequirements).toEqual(itemData.qualityRequirements);
      });

      it('should fail to add item to non-existent order', async () => {
        const itemData = {
          commodityId: testCommodity.id,
          quantity: 50,
          unit: 'kg'
        };

        await testContext
          .request()
          .post(`/orders/${nonExistentOrderId}/items`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(itemData)
          .expect(404);
      });

      it('should fail to add item without access', async () => {
        const itemData = {
          commodityId: testCommodity.id,
          quantity: 50,
          unit: 'kg'
        };

        await testContext
          .request()
          .post(`/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(itemData)
          .expect(403);
      });

      it('should fail to add item with invalid data', async () => {
        const invalidData = {
          commodityId: 'invalid-commodity-id',
          quantity: -10, // Invalid quantity
          unit: '' // Empty unit
        };

        await testContext
          .request()
          .post(`/orders/${testOrder.id}/items`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(invalidData)
          .expect(400);
      });
    });

    describe('PATCH /orders/:id/items/:itemId', () => {
      let testItem: any;

      beforeEach(async () => {
        testItem = await testContext.prisma.orderItem.create({
          data: {
            orderId: testOrder.id,
            commodityId: testCommodity.id,
            inventoryId: testInventory.id,
            quantity: 100,
            unitPrice: 2.50,
            metadata: {
              qualityRequirements: {
                grade: 'premium'
              }
            }
          }
        });
      });

      it('should update order item successfully', async () => {
        const updateData = {
          quantity: 150,
          unitPrice: 2.75,
          qualityRequirements: {
            grade: 'premium',
            specifications: {
              moisture: '< 13%',
              protein: '> 13%'
            }
          },
          notes: 'Updated quality requirements'
        };

        const response = await testContext
          .request()
          .patch(`/orders/${testOrder.id}/items/${testItem.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.quantity).toBe(updateData.quantity);
        expect(response.body.data.attributes.unitPrice).toBe(updateData.unitPrice);
        expect(response.body.data.attributes.metadata.qualityRequirements).toEqual(updateData.qualityRequirements);
      });

      it('should fail to update non-existent item', async () => {
        const updateData = {
          quantity: 150
        };

        await testContext
          .request()
          .patch(`/orders/${testOrder.id}/items/${nonExistentOrderId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData)
          .expect(404);
      });

      it('should fail to update item without access', async () => {
        const updateData = {
          quantity: 150
        };

        await testContext
          .request()
          .patch(`/orders/${testOrder.id}/items/${testItem.id}`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(updateData)
          .expect(403);
      });
    });

    describe('DELETE /orders/:id/items/:itemId', () => {
      let testItem: any;

      beforeEach(async () => {
        testItem = await testContext.prisma.orderItem.create({
          data: {
            orderId: testOrder.id,
            commodityId: testCommodity.id,
            inventoryId: testInventory.id,
            quantity: 100,
            unitPrice: 2.50
          }
        });
      });

      it('should delete order item successfully', async () => {
        const response = await testContext
          .request()
          .delete(`/orders/${testOrder.id}/items/${testItem.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
          .expect(200);

        expect(response.body.message).toContain('deleted successfully');

        // Verify item is deleted
        const deletedItem = await testContext.prisma.orderItem.findUnique({
          where: { id: testItem.id }
        });
        expect(deletedItem).toBeNull();
      });

      it('should fail to delete non-existent item', async () => {
        await testContext
          .request()
          .delete(`/orders/${testOrder.id}/items/${nonExistentOrderId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
          .expect(404);
      });

      it('should fail to delete item without access', async () => {
        await testContext
          .request()
          .delete(`/orders/${testOrder.id}/items/${testItem.id}`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send({})
          .expect(403);
      });
    });
  });

  describe('Order Marketplace and Search', () => {
    let testOrder: any;

    beforeEach(async () => {
      // Create a published order for marketplace
      testOrder = await testContext.prisma.order.create({
        data: {
          orderNumber: 'ORD-000007',
          title: 'Marketplace Wheat Order',
          type: 'BUY',
          status: 'CONFIRMED',
          commodityId: testCommodity.id,
          quantity: 200,
          pricePerUnit: 2.50,
          totalPrice: 500.00,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deliveryLocation: '123 Test Road',
          deliveryAddress: {
            street: '123 Test Road',
            city: 'Test City',
            state: 'TC',
            zip: '12345'
          },
          buyerOrgId: testOrganization.id,
          createdById: testUser.id,
          metadata: {
            isPublic: true,
            publishedAt: new Date().toISOString()
          }
        }
      });

      // Add order item
      await testContext.prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          commodityId: testCommodity.id,
          quantity: 200,
          unitPrice: 2.50
        }
      });
    });

    describe('GET /orders/marketplace', () => {
      it('should get marketplace orders successfully', async () => {
        const response = await testContext
          .request()
          .get('/orders/marketplace')
          .set('Authorization', `Bearer ${accessToken2}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].type).toBe('orders');
      });

      it('should filter marketplace orders by type', async () => {
        const response = await testContext
          .request()
          .get('/orders/marketplace?type=BUY')
          .set('Authorization', `Bearer ${accessToken2}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        response.body.data.forEach((order: any) => {
          expect(order.attributes.type).toBe('BUY');
        });
      });

      it('should filter marketplace orders by commodity', async () => {
        const response = await testContext
          .request()
          .get(`/orders/marketplace?commodityId=${testCommodity.id}`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        response.body.data.forEach((order: any) => {
          expect(order.attributes.items.some((item: any) => 
            item.commodityId === testCommodity.id
          )).toBe(true);
        });
      });
    });

    describe('GET /orders/marketplace/:id', () => {
      it('should get marketplace order details successfully', async () => {
        const response = await testContext
          .request()
          .get(`/orders/marketplace/${testOrder.id}`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .expect(200);

        expect(response.body.data.type).toBe('orders');
        expect(response.body.data.attributes.id).toBe(testOrder.id);
        expect(response.body.data.attributes.metadata.isPublic).toBe(true);
      });

      it('should fail to get non-existent marketplace order', async () => {
        await testContext
          .request()
          .get(`/orders/marketplace/${nonExistentOrderId}`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .expect(404);
      });
    });

    describe('POST /orders/search', () => {
      it('should search orders successfully', async () => {
        const searchData = {
          filters: {
            commodities: [testCommodity.id],
            priceRange: {
              min: 100,
              max: 1000
            },
            deliveryWindow: {
              start: new Date().toISOString(),
              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          },
          sort: {
            field: 'price',
            direction: 'asc'
          }
        };

        const response = await testContext
          .request()
          .post('/orders/search')
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(searchData)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should search orders with minimal filters', async () => {
        const searchData = {
          filters: {
            commodities: [testCommodity.id]
          }
        };

        const response = await testContext
          .request()
          .post('/orders/search')
          .set('Authorization', `Bearer ${accessToken2}`)
          .send(searchData)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /orders/recommendations', () => {
      it('should get order recommendations successfully', async () => {
        const response = await testContext
          .request()
          .get('/orders/recommendations')
          .set('Authorization', `Bearer ${accessToken2}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should get recommendations with type filter', async () => {
        const response = await testContext
          .request()
          .get('/orders/recommendations?type=BUY')
          .set('Authorization', `Bearer ${accessToken2}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        response.body.data.forEach((order: any) => {
          expect(order.attributes.type).toBe('BUY');
        });
      });
    });
  });

  describe('Order Messaging and Communication', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await testContext.prisma.order.create({
        data: {
          orderNumber: 'ORD-000008',
          title: 'Test Order for Messaging',
          type: 'BUY',
          status: 'CONFIRMED',
          commodityId: testCommodity.id,
          quantity: 120,
          pricePerUnit: 2.50,
          totalPrice: 300.00,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deliveryLocation: '123 Test Road',
          deliveryAddress: {
            street: '123 Test Road',
            city: 'Test City',
            state: 'TC',
            zip: '12345'
          },
          buyerOrgId: testOrganization.id,
          supplierOrgId: testOrganization2.id,
          createdById: testUser.id,
          terms: {
            paymentTerms: 'Net 30 days'
          }
        }
      });
    });

    describe('GET /orders/:id/messages', () => {
      beforeEach(async () => {
        // Create test messages
        await testContext.prisma.message.create({
          data: {
            orderId: testOrder.id,
            content: 'Test message about the order',
            type: 'general',
            userId: testUser.id,
          }
        });
      });

      it('should get order messages successfully', async () => {
        const response = await testContext
          .request()
          .get(`/orders/${testOrder.id}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].type).toBe('messages');
      });

      it('should fail to get messages for non-existent order', async () => {
        await testContext
          .request()
          .get(`/orders/${nonExistentOrderId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });

      it('should fail to get messages without access', async () => {
        // Create order from different organization
        const otherOrder = await testContext.prisma.order.create({
          data: {
            orderNumber: 'ORD-000009',
            title: 'Other Order',
            type: 'BUY',
            status: 'PENDING',
            commodityId: testCommodity.id,
            quantity: 40,
            pricePerUnit: 2.50,
            totalPrice: 100.00,
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            deliveryLocation: '123 Other Road',
            deliveryAddress: {
              street: '123 Other Road',
              city: 'Other City',
              state: 'OC',
              zip: '54321'
            },
            buyerOrgId: testOrganization2.id,
            createdById: testUser2.id
          }
        });

        await testContext
          .request()
          .get(`/orders/${otherOrder.id}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(403);
      });
    });

    describe('POST /orders/:id/messages', () => {
      it('should send order message successfully', async () => {
        const messageData = {
          content: 'This is a test message about the order',
          type: 'inquiry',
          attachments: ['https://example.com/document.pdf'],
          isUrgent: false
        };

        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(messageData)
          .expect(201);

        expect(response.body.data.type).toBe('messages');
        expect(response.body.data.attributes.content).toBe(messageData.content);
        expect(response.body.data.attributes.type).toBe(messageData.type);
        expect(response.body.data.attributes.attachments).toEqual(messageData.attachments);
        expect(response.body.data.attributes.isUrgent).toBe(messageData.isUrgent);
      });

      it('should fail to send message to non-existent order', async () => {
        const messageData = {
          content: 'Test message',
          type: 'general'
        };

        await testContext
          .request()
          .post(`/orders/${nonExistentOrderId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(messageData)
          .expect(404);
      });

      it('should fail to send message without access', async () => {
        const messageData = {
          content: 'Test message',
          type: 'general'
        };

        // Create order from different organization
        const otherOrder = await testContext.prisma.order.create({
          data: {
            orderNumber: 'ORD-000010',
            title: 'Other Order',
            type: 'BUY',
            status: 'PENDING',
            commodityId: testCommodity.id,
            quantity: 40,
            pricePerUnit: 2.50,
            totalPrice: 100.00,
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            deliveryLocation: '123 Other Road',
            deliveryAddress: {
              street: '123 Other Road',
              city: 'Other City',
              state: 'OC',
              zip: '54321'
            },
            buyerOrgId: testOrganization2.id,
            createdById: testUser2.id
          }
        });

        await testContext
          .request()
          .post(`/orders/${otherOrder.id}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(messageData)
          .expect(403);
      });

      it('should fail to send message with invalid data', async () => {
        const invalidData = {
          content: '', // Empty content
          type: 'INVALID_TYPE' // Invalid type
        };

        await testContext
          .request()
          .post(`/orders/${testOrder.id}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(invalidData)
          .expect(400);
      });
    });

    describe('POST /orders/:id/messages/:messageId/read', () => {
      let testMessage: any;

      beforeEach(async () => {
        testMessage = await testContext.prisma.message.create({
          data: {
            orderId: testOrder.id,
            content: 'Test message to mark as read',
            type: 'general',
            userId: testUser.id,
          }
        });
      });

      it('should mark message as read successfully', async () => {
        const response = await testContext
          .request()
          .post(`/orders/${testOrder.id}/messages/${testMessage.id}/read`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send({})
          .expect(200);

        expect(response.body.message).toContain('marked as read');

        // Verify message is marked as read
        const updatedMessage = await testContext.prisma.message.findUnique({
          where: { id: testMessage.id }
        });
        expect(updatedMessage?.readAt).toBeDefined();
      });

      it('should fail to mark non-existent message as read', async () => {
        await testContext
          .request()
          .post(`/orders/${testOrder.id}/messages/${nonExistentOrderId}/read`)
          .set('Authorization', `Bearer ${accessToken2}`)
          .send({})
          .expect(404);
      });
    });
  });

  describe('Order Analytics and Reporting', () => {
    beforeEach(async () => {
      // Create test orders with different statuses for analytics
      await Promise.all([
        testContext.prisma.order.create({
          data: {
            orderNumber: 'ORD-000011',
            title: 'Completed Order 1',
            type: 'BUY',
            status: 'DELIVERED',
            commodityId: testCommodity.id,
            quantity: 200,
            pricePerUnit: 2.50,
            totalPrice: 500.00,
            deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            deliveryLocation: '123 Test Road',
            deliveryAddress: {
              street: '123 Test Road',
              city: 'Test City',
              state: 'TC',
              zip: '12345'
            },
            buyerOrgId: testOrganization.id,
            createdById: testUser.id,
            metadata: {
              completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        }),
        testContext.prisma.order.create({
          data: {
            orderNumber: 'ORD-000012',
            title: 'Completed Order 2',
            type: 'SELL',
            status: 'DELIVERED',
            commodityId: testCommodity.id,
            quantity: 300,
            pricePerUnit: 2.50,
            totalPrice: 750.00,
            deliveryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            deliveryLocation: '123 Test Road',
            deliveryAddress: {
              street: '123 Test Road',
              city: 'Test City',
              state: 'TC',
              zip: '12345'
            },
            buyerOrgId: testOrganization.id,
            supplierOrgId: testOrganization2.id,
            createdById: testUser.id,
            metadata: {
              completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        }),
        testContext.prisma.order.create({
          data: {
            orderNumber: 'ORD-000013',
            title: 'In Progress Order',
            type: 'BUY',
            status: 'IN_TRANSIT',
            commodityId: testCommodity.id,
            quantity: 120,
            pricePerUnit: 2.50,
            totalPrice: 300.00,
            deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            deliveryLocation: '123 Test Road',
            deliveryAddress: {
              street: '123 Test Road',
              city: 'Test City',
              state: 'TC',
              zip: '12345'
            },
            buyerOrgId: testOrganization.id,
            supplierOrgId: testOrganization2.id,
            createdById: testUser.id,
            metadata: {
              fulfillmentStartedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
            }
          }
        })
      ]);
    });

    describe('GET /orders/analytics', () => {
      it('should get order analytics successfully', async () => {
        const response = await testContext
          .request()
          .get('/orders/analytics?period=week')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.type).toBe('analytics');
        expect(response.body.data.attributes).toBeDefined();
        expect(response.body.data.attributes.volume).toBeDefined();
        expect(response.body.data.attributes.successRate).toBeDefined();
        expect(response.body.data.attributes.averageValue).toBeDefined();
      });

      it('should get analytics with type filter', async () => {
        const response = await testContext
          .request()
          .get('/orders/analytics?period=week&type=BUY')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.attributes).toBeDefined();
      });

      it('should get analytics with status filter', async () => {
        const response = await testContext
          .request()
          .get('/orders/analytics?period=week&status=DELIVERED')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.attributes).toBeDefined();
      });
    });

    describe('GET /orders/financial-summary', () => {
      it('should get financial summary successfully', async () => {
        const response = await testContext
          .request()
          .get('/orders/financial-summary?period=week')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.type).toBe('financial-summary');
        expect(response.body.data.attributes).toBeDefined();
        expect(response.body.data.attributes.totalRevenue).toBeDefined();
        expect(response.body.data.attributes.totalCosts).toBeDefined();
        expect(response.body.data.attributes.netMargin).toBeDefined();
        expect(response.body.data.attributes.averageOrderValue).toBeDefined();
      });

      it('should get financial summary with type filter', async () => {
        const response = await testContext
          .request()
          .get('/orders/financial-summary?period=week&type=BUY')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.attributes).toBeDefined();
      });
    });

    describe('GET /orders/performance-metrics', () => {
      it('should get performance metrics successfully', async () => {
        const response = await testContext
          .request()
          .get('/orders/performance-metrics?period=week')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.type).toBe('performance-metrics');
        expect(response.body.data.attributes).toBeDefined();
        expect(response.body.data.attributes.completionRate).toBeDefined();
        expect(response.body.data.attributes.onTimeDeliveryRate).toBeDefined();
      });

      it('should get performance metrics with specific metric', async () => {
        const response = await testContext
          .request()
          .get('/orders/performance-metrics?period=week&metric=completion_rate')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.attributes).toBeDefined();
      });
    });

    describe('POST /orders/reports', () => {
      it('should generate order report successfully', async () => {
        const reportData = {
          reportType: 'financial',
          filters: {
            dateRange: {
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            },
            status: ['DELIVERED', 'IN_TRANSIT']
          },
          format: 'pdf',
          includeCharts: true
        };

        const response = await testContext
          .request()
          .post('/orders/reports')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(reportData)
          .expect(202);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.type).toBe('report-jobs');
        expect(response.body.data.attributes.status).toBe('pending');
        expect(response.body.data.attributes.estimatedCompletion).toBeDefined();
        expect(response.body.links).toBeDefined();
      });

      it('should fail to generate report with invalid data', async () => {
        const invalidData = {
          reportType: 'INVALID_TYPE',
          filters: {
            dateRange: {
              start: 'invalid-date',
              end: 'invalid-date'
            }
          },
          format: 'invalid-format'
        };

        await testContext
          .request()
          .post('/orders/reports')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(invalidData)
          .expect(400);
      });
    });
  });

  describe('Order Integration Tests', () => {
    it('should complete full order lifecycle', async () => {
      // 1. Create order
      const createData = {
        data: {
          type: 'orders',
          attributes: {
            type: 'BUY',
            title: 'Full Lifecycle Order',
            description: 'Test complete order lifecycle',
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            deliveryAddress: {
              street: '123 Lifecycle Road',
              city: 'Test City',
              state: 'TC',
              zip: '12345'
            },
            items: [
              {
                commodityId: testCommodity.id,
                quantity: 100,
                unit: 'kg',
                qualityRequirements: {
                  grade: 'premium'
                },
                unitPrice: 2.50
              }
            ],
            paymentTerms: 'Net 30 days',
            specialInstructions: 'Complete lifecycle test'
          }
        }
      };

      const createResponse = await testContext
        .request()
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createData)
        .expect(201);

      const orderId = createResponse.body.data.attributes.id;

      // 2. Publish order
      await testContext
        .request()
        .post(`/orders/${orderId}/publish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      // 3. Accept order
      const acceptData = {
        message: 'We accept this order',
        requiresNegotiation: false
      };

      await testContext
        .request()
        .post(`/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send(acceptData)
        .expect(200);

      // 4. Start fulfillment
      const fulfillmentData = {
        estimatedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Starting fulfillment process'
      };

      await testContext
        .request()
        .post(`/orders/${orderId}/start-fulfillment`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send(fulfillmentData)
        .expect(200);

      // 5. Complete order
      const completeData = {
        deliveryConfirmation: {
          deliveredAt: new Date().toISOString(),
          receivedBy: 'John Doe',
          condition: 'excellent',
          notes: 'Lifecycle test completed'
        },
        qualityAssessment: {
          meetsSpecifications: true,
          actualGrade: 'premium',
          issues: 'None'
        }
      };

      await testContext
        .request()
        .post(`/orders/${orderId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(completeData)
        .expect(200);

      // 6. Verify final state
      const finalResponse = await testContext
        .request()
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalResponse.body.data.attributes.status).toBe('DELIVERED');
      expect(finalResponse.body.data.attributes.metadata.completedAt).toBeDefined();
    });

    it('should handle order with counter offer and negotiation', async () => {
      // Create and publish order
      const createData = {
        data: {
          type: 'orders',
          attributes: {
            type: 'BUY',
            title: 'Negotiation Order',
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            deliveryAddress: {
              street: '123 Negotiation Road',
              city: 'Test City',
              state: 'TC',
              zip: '12345'
            },
            items: [
              {
                commodityId: testCommodity.id,
                quantity: 100,
                unit: 'kg',
                unitPrice: 3.00
              }
            ]
          }
        }
      };

      const createResponse = await testContext
        .request()
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createData)
        .expect(201);

      const orderId = createResponse.body.data.attributes.id;

      // Publish order
      await testContext
        .request()
        .post(`/orders/${orderId}/publish`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      // Make counter offer
      const counterOfferData = {
        message: 'We propose a counter offer',
        changes: {
          totalAmount: 250.00,
          deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      };

      await testContext
        .request()
        .post(`/orders/${orderId}/counter-offer`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send(counterOfferData)
        .expect(200);

      // Accept counter offer
      const acceptData = {
        message: 'We accept the counter offer',
        requiresNegotiation: false
      };

      await testContext
        .request()
        .post(`/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(acceptData)
        .expect(200);

      // Verify final state
      const finalResponse = await testContext
        .request()
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalResponse.body.data.attributes.status).toBe('CONFIRMED');
      expect(finalResponse.body.data.attributes.supplierOrgId).toBe(testOrganization2.id);
    });
  });
});
