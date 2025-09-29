import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Market E2E Tests', () => {
  let testContext: TestContext;
  let accessToken: string;
  let testOrganization: any;
  let testFarm: any;
  let testCommodity: any;
  let testInventory: any;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up market-related tables before each test
    await testContext.cleanupTables([
      'inventory',
      'commodities',
      'farms',
      'users',
      'organizations'
    ]);
    
    // Create test user and organization
    const hashedPassword = await hash('TestPassword123!');
    testOrganization = await testContext.createOrganization({
      name: 'Test Farm Organization',
      type: 'FARM_OPERATION',
      email: 'testfarm@example.com',
      isActive: true
    });

    await testContext.createUser({
      email: 'testuser@example.com',
      name: 'Test User',
      organizationId: testOrganization.id,
      hashedPassword,
      emailVerified: true,
      isActive: true
    });

    // Create test farm
    testFarm = await testContext.createFarm({
      name: 'Test Farm',
      organization: { connect: { id: testOrganization.id } },
      totalArea: 100.0,
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Farm Road, Test City, TC 12345'
      },
      cropTypes: ['corn', 'wheat'],
      establishedDate: new Date('2020-01-01'),
      certifications: ['organic'],
      isActive: true
    });

    // Create test commodity
    testCommodity = await testContext.createCommodity({
      name: 'Test Corn',
      category: 'grain',
      variety: 'yellow',
      qualityGrade: 'premium',
      quantity: 1000.0,
      unit: 'bushel',
      harvestDate: new Date(),
      storageLocation: 'Main Silo',
      farm: { connect: { id: testFarm.id } },
      isActive: true,
      isGlobal: false
    });

    // Create test inventory
    testInventory = await testContext.createInventory({
      organization: { connect: { id: testOrganization.id } },
      commodity: { connect: { id: testCommodity.id } },
      farm: { connect: { id: testFarm.id } },
      quantity: 500.0,
      unit: 'bushel',
      quality: 'Grade A',
      location: 'Warehouse A',
      status: 'AVAILABLE'
    });

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  // =============================================================================
  // Market Discovery & Browse Tests
  // =============================================================================

  describe('GET /marketplace/commodities', () => {
    it('should get marketplace commodities successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/commodities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter commodities by category', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/commodities?category=grain')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter commodities by quality grade', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/commodities?qualityGrade=premium')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter commodities by organic status', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/commodities?organic=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/commodities?page[number]=1&page[size]=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/commodities')
        .expect(401);
    });
  });

  describe('GET /marketplace/suppliers', () => {
    it('should get marketplace suppliers successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter suppliers by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/suppliers?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter suppliers by location', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/suppliers?location=Test City')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter suppliers by rating', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/suppliers?rating=4')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/suppliers')
        .expect(401);
    });
  });

  describe('GET /marketplace/suppliers/:supplierId', () => {
    it('should get specific supplier successfully', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/suppliers/${testOrganization.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('marketplace-suppliers');
      expect(response.body.data.attributes).toBeDefined();
    });

    it('should fail with non-existent supplier', async () => {
      const fakeId = 'cmg5ll4nm00041cwada47hf8n'; // Valid CUID format but non-existent
      await testContext
        .request()
        .get(`/marketplace/suppliers/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/marketplace/suppliers/${testOrganization.id}`)
        .expect(401);
    });
  });

  describe('GET /marketplace/buyers', () => {
    it('should get marketplace buyers successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/buyers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter buyers by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/buyers?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter buyers by payment terms', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/buyers?paymentTerms=cash,credit')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/buyers')
        .expect(401);
    });
  });

  describe('POST /marketplace/search', () => {
    it('should perform marketplace search successfully', async () => {
      const searchRequest = {
        query: 'corn',
        filters: {
          location: {
            center: {
              lat: 37.7749,
              lng: -122.4194
            },
            radius: 50
          }
        },
        sort: {
          field: 'price',
          direction: 'asc'
        },
        limit: 20
      };

      const response = await testContext
        .request()
        .post('/marketplace/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(searchRequest)
        .expect(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('marketplace-search-results');
      expect(response.body.data.attributes).toBeDefined();
    });

    it('should handle empty search query', async () => {
      const searchRequest = {
        query: '',
        filters: {},
        sort: {
          field: 'price',
          direction: 'asc'
        },
        limit: 20
      };

      const response = await testContext
        .request()
        .post('/marketplace/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(searchRequest)
        .expect(200);
      expect(response.body.data).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const searchRequest = {
        query: 'corn',
        filters: {},
        sort: 'relevance',
        limit: 20
      };

      await testContext
        .request()
        .post('/marketplace/search')
        .send(searchRequest)
        .expect(401);
    });
  });

  // =============================================================================
  // Market Intelligence & Pricing Tests
  // =============================================================================

  describe('GET /marketplace/price-trends', () => {
    it('should get price trends successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/price-trends')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.commodityId).toBeDefined();
      expect(response.body.commodityName).toBeDefined();
      expect(response.body.currentPrice).toBeDefined();
      expect(response.body.priceChange).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter price trends by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/price-trends?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.commodityId).toBe(testCommodity.id);
    });

    it('should filter price trends by region', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/price-trends?region=North America')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.region).toBe('North America');
    });

    it('should filter price trends by period', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/price-trends?period=30d')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.period).toBe('30d');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/price-trends')
        .expect(401);
    });
  });

  describe('GET /marketplace/price-alerts', () => {
    it('should get price alerts successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/price-alerts')
        .expect(401);
    });
  });

  describe('POST /marketplace/price-alerts', () => {
    it('should create price alert successfully', async () => {
      const alertData = {
        data: {
          type: 'price-alerts',
          attributes: {
            commodityId: testCommodity.id,
            alertType: 'above',
            threshold: 300.0,
            notifications: ['email', 'push']
          }
        }
      };

      const response = await testContext
        .request()
        .post('/marketplace/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(alertData)
        .expect(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('price-alerts');
      expect(response.body.data.attributes).toBeDefined();
    });

    it('should fail with invalid alert data', async () => {
      const invalidAlertData = {
        data: {
          type: 'price-alerts',
          attributes: {
            commodityId: 'invalid-id',
            condition: 'invalid-condition',
            targetPrice: -100
          }
        }
      };

      await testContext
        .request()
        .post('/marketplace/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidAlertData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const alertData = {
        data: {
          type: 'price-alerts',
          attributes: {
            commodityId: testCommodity.id,
            condition: 'above',
            targetPrice: 300.0
          }
        }
      };

      await testContext
        .request()
        .post('/marketplace/price-alerts')
        .send(alertData)
        .expect(401);
    });
  });

  describe('DELETE /marketplace/price-alerts/:alertId', () => {
    it('should delete price alert successfully', async () => {
      const alertId = 'cmg5ll4nm00041cwada47hf8n'; // Valid CUID format
      
      const response = await testContext
        .request()
        .delete(`/marketplace/price-alerts/${alertId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(response.body.message).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const alertId = 'test-alert-id';
      
      await testContext
        .request()
        .delete(`/marketplace/price-alerts/${alertId}`)
        .expect(401);
    });
  });

  describe('GET /marketplace/market-analysis', () => {
    it('should get market analysis successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/market-analysis')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.commodityId).toBeDefined();
      expect(response.body.commodityName).toBeDefined();
      expect(response.body.supplyAnalysis).toBeDefined();
      expect(response.body.demandAnalysis).toBeDefined();
      expect(response.body.priceForecast).toBeDefined();
    });

    it('should filter analysis by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/market-analysis?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.commodityId).toBe(testCommodity.id);
    });

    it('should filter analysis by region', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/market-analysis?region=North America')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.region).toBe('North America');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/market-analysis')
        .expect(401);
    });
  });

  // =============================================================================
  // Demand & Supply Matching Tests
  // =============================================================================

  describe('GET /marketplace/demand-forecast', () => {
    it('should get demand forecast successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/demand-forecast')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.commodityId).toBeDefined();
      expect(response.body.commodityName).toBeDefined();
      expect(response.body.currentDemand).toBeDefined();
      expect(response.body.forecast).toBeDefined();
      expect(Array.isArray(response.body.forecast)).toBe(true);
    });

    it('should filter forecast by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/demand-forecast?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.commodityId).toBe(testCommodity.id);
    });

    it('should filter forecast by timeframe', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/demand-forecast?timeframe=3m')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.timeframe).toBe('3m');
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/demand-forecast')
        .expect(401);
    });
  });

  describe('GET /marketplace/supply-opportunities', () => {
    it('should get supply opportunities successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/supply-opportunities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter opportunities by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/supply-opportunities?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/supply-opportunities')
        .expect(401);
    });
  });

  describe('GET /marketplace/buying-opportunities', () => {
    it('should get buying opportunities successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/buying-opportunities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter opportunities by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/buying-opportunities?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/buying-opportunities')
        .expect(401);
    });
  });

  describe('POST /marketplace/match-requests', () => {
    it('should create match request successfully', async () => {
      const matchData = {
        data: {
          type: 'match-requests',
          attributes: {
            type: 'supply',
            commodityId: testCommodity.id,
            quantity: 100,
            location: {
              lat: 37.7749,
              lng: -122.4194
            },
            maxDistance: 50,
            deliveryDate: '2024-12-31T23:59:59Z',
            priceRange: { min: 200, max: 300 }
          }
        }
      };

      const response = await testContext
        .request()
        .post('/marketplace/match-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(matchData)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.body.matches).toBeDefined();
      expect(response.body.totalMatches).toBeDefined();
      expect(response.body.searchCriteria).toBeDefined();
    });

    it('should fail with invalid match data', async () => {
      const invalidMatchData = {
        data: {
          type: 'match-requests',
          attributes: {
            commodityId: 'invalid-id',
            quantity: -100,
            maxDistance: -50
          }
        }
      };

      await testContext
        .request()
        .post('/marketplace/match-requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidMatchData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const matchData = {
        data: {
          type: 'match-requests',
          attributes: {
            commodityId: testCommodity.id,
            quantity: 100,
            maxDistance: 50
          }
        }
      };

      await testContext
        .request()
        .post('/marketplace/match-requests')
        .send(matchData)
        .expect(401);
    });
  });

  // =============================================================================
  // Contract Templates & Standards Tests
  // =============================================================================

  describe('GET /marketplace/contract-templates', () => {
    it('should get contract templates successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/contract-templates')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter templates by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/contract-templates?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter templates by type', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/contract-templates?type=purchase')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/contract-templates')
        .expect(401);
    });
  });

  describe('GET /marketplace/contract-templates/:templateId', () => {
    it('should get specific contract template successfully', async () => {
      const templateId = 'cmg5ll4nm00041cwada47hf8n'; // Valid CUID format
      
      const response = await testContext
        .request()
        .get(`/marketplace/contract-templates/${templateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('contract-templates');
      expect(response.body.data.attributes).toBeDefined();
    });

    it('should fail with non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await testContext
        .request()
        .get(`/marketplace/contract-templates/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      const templateId = 'test-template-id';
      
      await testContext
        .request()
        .get(`/marketplace/contract-templates/${templateId}`)
        .expect(401);
    });
  });

  describe('POST /marketplace/contracts/generate', () => {
    it('should generate contract successfully', async () => {
      const contractData = {
        data: {
          type: 'contract-generation-requests',
          attributes: {
            templateId: 'test-template-id',
            orderId: 'test-order-id',
            customizations: {
              price: 250.0,
              quantity: 100,
              deliveryDate: new Date().toISOString()
            }
          }
        }
      };

      const response = await testContext
        .request()
        .post('/marketplace/contracts/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(contractData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.contractId).toBeDefined();
      expect(response.body.templateId).toBeDefined();
      expect(response.body.generatedContract).toBeDefined();
    });

    it('should fail with invalid contract data', async () => {
      const invalidContractData = {
        data: {
          type: 'contract-generation-requests',
          attributes: {
            templateId: 'invalid-id',
            orderId: '',
            customizations: {}
          }
        }
      };

      await testContext
        .request()
        .post('/marketplace/contracts/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidContractData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const contractData = {
        data: {
          type: 'contract-generation-requests',
          attributes: {
            templateId: 'test-template-id',
            orderId: 'test-order-id',
            customizations: {}
          }
        }
      };

      await testContext
        .request()
        .post('/marketplace/contracts/generate')
        .send(contractData)
        .expect(401);
    });
  });

  // =============================================================================
  // Market Participation & Listings Tests
  // =============================================================================

  describe('GET /marketplace/my-listings', () => {
    it('should get user listings successfully', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/my-listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter listings by status', async () => {
      const response = await testContext
        .request()
        .get('/marketplace/my-listings?status=active')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter listings by commodity', async () => {
      const response = await testContext
        .request()
        .get(`/marketplace/my-listings?commodityId=${testCommodity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/marketplace/my-listings')
        .expect(401);
    });
  });

  describe('POST /marketplace/listings', () => {
    it('should create listing successfully', async () => {
      const listingData = {
        data: {
          type: 'marketplace-listings',
          attributes: {
            inventoryId: testInventory.id,
            title: 'Test Corn Listing',
            description: 'High quality test corn',
            quantity: 100,
            unitPrice: 25.50,
            priceType: 'fixed',
            minQuantity: 10,
            qualityGrade: 'grade_a',
            certifications: ['organic'],
            availableFrom: new Date().toISOString(),
            availableUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            deliveryOptions: ['pickup', 'delivery'],
            deliveryRadius: 50,
            paymentTerms: ['cash', 'credit'],
            isPublic: true
          }
        }
      };

      const response = await testContext
        .request()
        .post('/marketplace/listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(listingData)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('marketplace-listings');
      expect(response.body.data.attributes).toBeDefined();
    });

    it('should fail with invalid listing data', async () => {
      const invalidListingData = {
        data: {
          type: 'marketplace-listings',
          attributes: {
            inventoryId: 'invalid-id',
            title: '',
            quantity: -100,
            unitPrice: -25.50
          }
        }
      };

      await testContext
        .request()
        .post('/marketplace/listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidListingData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const listingData = {
        data: {
          type: 'marketplace-listings',
          attributes: {
            inventoryId: testInventory.id,
            title: 'Test Corn Listing',
            quantity: 100,
            unitPrice: 25.50
          }
        }
      };

      await testContext
        .request()
        .post('/marketplace/listings')
        .send(listingData)
        .expect(401);
    });
  });

  describe('PATCH /marketplace/listings/:listingId', () => {
    it('should update listing successfully', async () => {
      const listingId = 'test-listing-id';
      const updateData = {
        data: {
          type: 'marketplace-listings',
          attributes: {
            title: 'Updated Test Corn Listing',
            description: 'Updated description',
            unitPrice: 30.00
          }
        }
      };

      const response = await testContext
        .request()
        .patch(`/marketplace/listings/${listingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('marketplace-listings');
      expect(response.body.data.attributes).toBeDefined();
    });

    it('should fail with non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateData = {
        data: {
          type: 'marketplace-listings',
          attributes: {
            title: 'Updated Title'
          }
        }
      };

      await testContext
        .request()
        .patch(`/marketplace/listings/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      const listingId = 'test-listing-id';
      const updateData = {
        data: {
          type: 'marketplace-listings',
          attributes: {
            title: 'Updated Title'
          }
        }
      };

      await testContext
        .request()
        .patch(`/marketplace/listings/${listingId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /marketplace/listings/:listingId', () => {
    it('should delete listing successfully', async () => {
      const listingId = 'test-listing-id';
      
      const response = await testContext
        .request()
        .delete(`/marketplace/listings/${listingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBeDefined();
    });

    it('should fail with non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await testContext
        .request()
        .delete(`/marketplace/listings/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      const listingId = 'test-listing-id';
      
      await testContext
        .request()
        .delete(`/marketplace/listings/${listingId}`)
        .expect(401);
    });
  });

  describe('GET /marketplace/listings/:listingId', () => {
    it('should get specific listing successfully', async () => {
      const listingId = 'test-listing-id';
      
      const response = await testContext
        .request()
        .get(`/marketplace/listings/${listingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('marketplace-listings');
      expect(response.body.data.attributes).toBeDefined();
    });

    it('should fail with non-existent listing', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await testContext
        .request()
        .get(`/marketplace/listings/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      const listingId = 'test-listing-id';
      
      await testContext
        .request()
        .get(`/marketplace/listings/${listingId}`)
        .expect(401);
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Market Flow Integration Tests', () => {
    it('should complete full marketplace flow', async () => {
      // 1. Browse commodities
      const commoditiesResponse = await testContext
        .request()
        .get('/marketplace/commodities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(commoditiesResponse.body.data).toBeDefined();

      // 2. Search marketplace
      const searchResponse = await testContext
        .request()
        .post('/marketplace/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'corn',
          filters: { category: 'grain' },
          sort: 'price_asc',
          limit: 20
        })
        .expect(200);

      expect(searchResponse.body.data).toBeDefined();

      // 3. Get price trends
      const priceTrendsResponse = await testContext
        .request()
        .get('/marketplace/price-trends')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(priceTrendsResponse.body).toBeDefined();

      // 4. Create price alert
      const alertResponse = await testContext
        .request()
        .post('/marketplace/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'price-alerts',
            attributes: {
              commodityId: testCommodity.id,
              condition: 'above',
              targetPrice: 300.0,
              isActive: true
            }
          }
        })
        .expect(201);

      expect(alertResponse.body.data).toBeDefined();

      // 5. Create listing
      const listingResponse = await testContext
        .request()
        .post('/marketplace/listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'marketplace-listings',
            attributes: {
              inventoryId: testInventory.id,
              title: 'Integration Test Corn',
              description: 'High quality corn for testing',
              quantity: 100,
              unitPrice: 25.50,
              priceType: 'fixed',
              minQuantity: 10,
              qualityGrade: 'grade_a',
              availableFrom: new Date().toISOString(),
              availableUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              deliveryOptions: ['pickup'],
              deliveryRadius: 25,
              paymentTerms: ['cash'],
              isPublic: true
            }
          }
        })
        .expect(201);

      expect(listingResponse.body.data).toBeDefined();

      // 6. Get user listings
      const myListingsResponse = await testContext
        .request()
        .get('/marketplace/my-listings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(myListingsResponse.body.data).toBeDefined();
    });

    it('should handle concurrent marketplace requests', async () => {
      const promises = [
        testContext
          .request()
          .get('/marketplace/commodities')
          .set('Authorization', `Bearer ${accessToken}`),
        testContext
          .request()
          .get('/marketplace/suppliers')
          .set('Authorization', `Bearer ${accessToken}`),
        testContext
          .request()
          .get('/marketplace/buyers')
          .set('Authorization', `Bearer ${accessToken}`),
        testContext
          .request()
          .get('/marketplace/price-trends')
          .set('Authorization', `Bearer ${accessToken}`),
        testContext
          .request()
          .get('/marketplace/market-analysis')
          .set('Authorization', `Bearer ${accessToken}`)
      ];

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle invalid UUID parameters', async () => {
      await testContext
        .request()
        .get('/marketplace/suppliers/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should handle malformed JSON in POST requests', async () => {
      await testContext
        .request()
        .post('/marketplace/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await testContext
        .request()
        .post('/marketplace/price-alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'price-alerts',
            attributes: {}
          }
        })
        .expect(400);
    });

    it('should handle invalid query parameters', async () => {
      await testContext
        .request()
        .get('/marketplace/commodities?page=invalid&limit=invalid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
