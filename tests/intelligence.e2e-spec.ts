import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Intelligence E2E Tests', () => {
  let testContext: TestContext;
  let testUser: any;
  let testOrganization: any;
  let testFarm: any;
  let accessToken: string;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up intelligence-related tables before each test
    await testContext.cleanupTables([
      'activity_optimizations',
      'market_analyses',
      'farm_analyses',
      'intelligence_responses',
      'farms',
      'users',
      'organizations'
    ]);
    
    // Create test organization
    testOrganization = await testContext.createOrganization({
      name: 'Test Intelligence Organization',
      type: 'FARM_OPERATION',
      email: 'test@intelligence.com'
    });

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    testUser = await testContext.createUser({
      email: 'testuser@intelligence.com',
      name: 'Test Intelligence User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id
    });

    // Create test farm
    testFarm = await testContext.prisma.farm.create({
      data: {
        name: 'Test Intelligence Farm',
        organizationId: testOrganization.id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Intelligence Farm Road, Test City, TC 12345'
        },
        totalArea: 100,
        cropTypes: ['wheat', 'corn'],
        establishedDate: new Date('2020-01-01'),
        isActive: true
      }
    });

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'testuser@intelligence.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('POST /intelligence/generate', () => {
    it('should generate AI response successfully', async () => {
      const requestData = {
        prompt: 'What are the best practices for corn planting in spring?',
        context: 'I have a 100-acre farm in the Midwest with clay soil',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        farmId: testFarm.id
      };

      const response = await testContext
        .request()
        .post('/intelligence/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(200);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.content).toBeDefined();
      expect(response.body.model).toBe(requestData.model);
      expect(response.body.usage).toBeDefined();
      expect(response.body.usage.promptTokens).toBeGreaterThan(0);
      expect(response.body.usage.completionTokens).toBeGreaterThan(0);
      expect(response.body.usage.totalTokens).toBeGreaterThan(0);
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.farmId).toBe(testFarm.id);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should generate response without farm context', async () => {
      const requestData = {
        prompt: 'What are the current market trends for wheat?',
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 500
      };

      const response = await testContext
        .request()
        .post('/intelligence/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.content).toBeDefined();
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.farmId).toBeUndefined();
    });

    it('should fail with invalid model', async () => {
      const requestData = {
        prompt: 'Test prompt',
        model: 'invalid-model',
        temperature: 0.7,
        maxTokens: 1000
      };

      await testContext
        .request()
        .post('/intelligence/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);
    });

    it('should fail with invalid temperature', async () => {
      const requestData = {
        prompt: 'Test prompt',
        model: 'gpt-3.5-turbo',
        temperature: 3.0, // Invalid temperature > 2
        maxTokens: 1000
      };

      await testContext
        .request()
        .post('/intelligence/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);
    });

    it('should fail with invalid max tokens', async () => {
      const requestData = {
        prompt: 'Test prompt',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 5000 // Invalid max tokens > 4000
      };

      await testContext
        .request()
        .post('/intelligence/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const requestData = {
        prompt: 'Test prompt',
        model: 'gpt-3.5-turbo'
      };

      await testContext
        .request()
        .post('/intelligence/generate')
        .send(requestData)
        .expect(401);
    });

    it('should fail with empty prompt', async () => {
      const requestData = {
        prompt: '',
        model: 'gpt-3.5-turbo'
      };

      await testContext
        .request()
        .post('/intelligence/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);
    });
  });

  describe('POST /intelligence/farm/analyze', () => {
    it('should analyze farm data successfully', async () => {
      const requestData = {
        farmId: testFarm.id,
        analysisType: 'crop_health',
        data: {
          cropType: 'corn',
          plantingDate: '2024-04-15',
          soilMoisture: 0.6,
          temperature: 22,
          rainfall: 150,
          pestIncidents: 2,
          diseaseIncidents: 1
        }
      };

      const response = await testContext
        .request()
        .post('/intelligence/farm/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.farmId).toBe(testFarm.id);
      expect(response.body.analysisType).toBe(requestData.analysisType);
      expect(response.body.insights).toBeDefined();
      expect(Array.isArray(response.body.insights)).toBe(true);
      expect(response.body.recommendations).toBeDefined();
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.confidence).toBeLessThanOrEqual(1);
      expect(response.body.data).toBeDefined();
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should analyze different analysis types', async () => {
      const analysisTypes = [
        'yield_prediction',
        'pest_detection',
        'soil_analysis',
        'weather_impact',
        'market_optimization',
        'resource_efficiency',
        'sustainability_score'
      ];

      for (const analysisType of analysisTypes) {
        const requestData = {
          farmId: testFarm.id,
          analysisType,
          data: {
            cropType: 'wheat',
            area: 50,
            plantingDate: '2024-03-01'
          }
        };

        const response = await testContext
          .request()
          .post('/intelligence/farm/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(requestData)
          .expect(200);

        expect(response.body.analysisType).toBe(analysisType);
        expect(response.body.insights).toBeDefined();
        expect(response.body.recommendations).toBeDefined();
      }
    });

    it('should fail with non-existent farm', async () => {
      const requestData = {
        farmId: 'non-existent-farm-id',
        analysisType: 'crop_health',
        data: { cropType: 'corn' }
      };

      await testContext
        .request()
        .post('/intelligence/farm/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(404);
    });

    it('should fail with invalid analysis type', async () => {
      const requestData = {
        farmId: testFarm.id,
        analysisType: 'invalid_analysis_type',
        data: { cropType: 'corn' }
      };

      await testContext
        .request()
        .post('/intelligence/farm/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const requestData = {
        farmId: testFarm.id,
        analysisType: 'crop_health',
        data: { cropType: 'corn' }
      };

      await testContext
        .request()
        .post('/intelligence/farm/analyze')
        .send(requestData)
        .expect(401);
    });
  });

  describe('GET /intelligence/farm/analysis/:id', () => {
    let farmAnalysisId: string;

    beforeEach(async () => {
      // Create a farm analysis first
      const analysisData = {
        farmId: testFarm.id,
        analysisType: 'crop_health',
        data: { cropType: 'corn', health: 'good' }
      };

      const createResponse = await testContext
        .request()
        .post('/intelligence/farm/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(analysisData)
        .expect(200);

      farmAnalysisId = createResponse.body.id;
    });

    it('should get farm analysis by ID successfully', async () => {
      const response = await testContext
        .request()
        .get(`/intelligence/farm/analysis/${farmAnalysisId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(farmAnalysisId);
      expect(response.body.farmId).toBe(testFarm.id);
      expect(response.body.analysisType).toBe('crop_health');
      expect(response.body.insights).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
      expect(response.body.confidence).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should fail with non-existent analysis ID', async () => {
      await testContext
        .request()
        .get('/intelligence/farm/analysis/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/intelligence/farm/analysis/${farmAnalysisId}`)
        .expect(401);
    });
  });

  describe('GET /intelligence/farm/analyses', () => {
    beforeEach(async () => {
      // Create multiple farm analyses
      const analyses = [
        {
          farmId: testFarm.id,
          analysisType: 'crop_health',
          data: { cropType: 'corn' }
        },
        {
          farmId: testFarm.id,
          analysisType: 'yield_prediction',
          data: { cropType: 'wheat' }
        }
      ];

      for (const analysis of analyses) {
        await testContext
          .request()
          .post('/intelligence/farm/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(analysis)
          .expect(200);
      }
    });

    it('should list farm analyses successfully', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/farm/analyses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBeDefined();
      expect(response.body.pagination.limit).toBeDefined();
      expect(response.body.pagination.total).toBeDefined();
      expect(response.body.pagination.totalPages).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/farm/analyses?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should filter by farm ID', async () => {
      const response = await testContext
        .request()
        .get(`/intelligence/farm/analyses?farmId=${testFarm.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      response.body.data.forEach((analysis: any) => {
        expect(analysis.farmId).toBe(testFarm.id);
      });
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/intelligence/farm/analyses')
        .expect(401);
    });
  });

  describe('POST /intelligence/market/analyze', () => {
    it('should analyze market conditions successfully', async () => {
      const requestData = {
        commodity: 'wheat',
        region: 'North America',
        timeframe: 'monthly',
        analysisType: 'price_prediction'
      };

      const response = await testContext
        .request()
        .post('/intelligence/market/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.commodity).toBe(requestData.commodity);
      expect(response.body.region).toBe(requestData.region);
      expect(response.body.analysisType).toBe(requestData.analysisType);
      expect(response.body.predictions).toBeDefined();
      expect(Array.isArray(response.body.predictions)).toBe(true);
      expect(response.body.insights).toBeDefined();
      expect(Array.isArray(response.body.insights)).toBe(true);
      expect(response.body.recommendations).toBeDefined();
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.riskFactors).toBeDefined();
      expect(Array.isArray(response.body.riskFactors)).toBe(true);
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should analyze different market analysis types', async () => {
      const analysisTypes = [
        'demand_forecast',
        'supply_analysis',
        'trend_analysis',
        'risk_assessment',
        'opportunity_identification'
      ];

      for (const analysisType of analysisTypes) {
        const requestData = {
          commodity: 'corn',
          analysisType,
          timeframe: 'weekly'
        };

        const response = await testContext
          .request()
          .post('/intelligence/market/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(requestData)
          .expect(200);

        expect(response.body.analysisType).toBe(analysisType);
        expect(response.body.insights).toBeDefined();
        expect(response.body.recommendations).toBeDefined();
      }
    });

    it('should analyze with different timeframes', async () => {
      const timeframes = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

      for (const timeframe of timeframes) {
        const requestData = {
          commodity: 'soybeans',
          analysisType: 'price_prediction',
          timeframe
        };

        const response = await testContext
          .request()
          .post('/intelligence/market/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(requestData)
          .expect(200);

        expect(response.body.insights).toBeDefined();
        expect(response.body.recommendations).toBeDefined();
      }
    });

    it('should fail with invalid analysis type', async () => {
      const requestData = {
        commodity: 'wheat',
        analysisType: 'invalid_analysis_type',
        timeframe: 'monthly'
      };

      await testContext
        .request()
        .post('/intelligence/market/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);
    });

    it('should fail with invalid timeframe', async () => {
      const requestData = {
        commodity: 'wheat',
        analysisType: 'price_prediction',
        timeframe: 'invalid_timeframe'
      };

      await testContext
        .request()
        .post('/intelligence/market/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const requestData = {
        commodity: 'wheat',
        analysisType: 'price_prediction',
        timeframe: 'monthly'
      };

      await testContext
        .request()
        .post('/intelligence/market/analyze')
        .send(requestData)
        .expect(401);
    });
  });

  describe('GET /intelligence/market/analysis/:id', () => {
    let marketAnalysisId: string;

    beforeEach(async () => {
      // Create a market analysis first
      const analysisData = {
        commodity: 'wheat',
        region: 'North America',
        timeframe: 'monthly',
        analysisType: 'price_prediction'
      };

      const createResponse = await testContext
        .request()
        .post('/intelligence/market/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(analysisData)
        .expect(200);

      marketAnalysisId = createResponse.body.id;
    });

    it('should get market analysis by ID successfully', async () => {
      const response = await testContext
        .request()
        .get(`/intelligence/market/analysis/${marketAnalysisId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(marketAnalysisId);
      expect(response.body.commodity).toBe('wheat');
      expect(response.body.region).toBe('North America');
      expect(response.body.analysisType).toBe('price_prediction');
      expect(response.body.predictions).toBeDefined();
      expect(response.body.insights).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
      expect(response.body.riskFactors).toBeDefined();
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should fail with non-existent analysis ID', async () => {
      await testContext
        .request()
        .get('/intelligence/market/analysis/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/intelligence/market/analysis/${marketAnalysisId}`)
        .expect(401);
    });
  });

  describe('GET /intelligence/market/analyses', () => {
    beforeEach(async () => {
      // Create multiple market analyses
      const analyses = [
        {
          commodity: 'wheat',
          analysisType: 'price_prediction',
          timeframe: 'monthly'
        },
        {
          commodity: 'corn',
          analysisType: 'demand_forecast',
          timeframe: 'weekly'
        }
      ];

      for (const analysis of analyses) {
        await testContext
          .request()
          .post('/intelligence/market/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(analysis)
          .expect(200);
      }
    });

    it('should list market analyses successfully', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/market/analyses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/market/analyses?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/intelligence/market/analyses')
        .expect(401);
    });
  });

  describe('POST /intelligence/activity/optimize', () => {
    it('should optimize farm activities successfully', async () => {
      const requestData = {
        farmId: testFarm.id,
        activityType: 'planting',
        constraints: {
          budget: 10000,
          time: 30,
          resources: ['tractor', 'seeds', 'fertilizer'],
          weather: {
            temperature: 20,
            humidity: 60,
            precipitation: 0.1
          }
        },
        objectives: ['maximize_yield', 'minimize_cost', 'minimize_time']
      };

      const response = await testContext
        .request()
        .post('/intelligence/activity/optimize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData);

      if (response.status !== 200) {
        console.log('Activity optimization response status:', response.status);
        console.log('Activity optimization response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.farmId).toBe(testFarm.id);
      expect(response.body.activityType).toBe(requestData.activityType);
      expect(response.body.optimizedPlan).toBeDefined();
      expect(response.body.optimizedPlan.schedule).toBeDefined();
      expect(Array.isArray(response.body.optimizedPlan.schedule)).toBe(true);
      expect(response.body.optimizedPlan.totalCost).toBeDefined();
      expect(response.body.optimizedPlan.totalDuration).toBeDefined();
      expect(response.body.optimizedPlan.riskScore).toBeDefined();
      expect(response.body.alternatives).toBeDefined();
      expect(Array.isArray(response.body.alternatives)).toBe(true);
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should optimize with different objectives', async () => {
      const objectives = [
        ['maximize_yield'],
        ['minimize_cost'],
        ['minimize_time'],
        ['maximize_quality'],
        ['minimize_risk']
      ];

      for (const objective of objectives) {
        const requestData = {
          farmId: testFarm.id,
          activityType: 'harvesting',
          constraints: {
            budget: 5000,
            time: 15
          },
          objectives: objective
        };

        const response = await testContext
          .request()
          .post('/intelligence/activity/optimize')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(requestData)
          .expect(200);

        expect(response.body.optimizedPlan).toBeDefined();
        expect(response.body.alternatives).toBeDefined();
      }
    });

    it('should fail with non-existent farm', async () => {
      const requestData = {
        farmId: 'non-existent-farm-id',
        activityType: 'planting',
        constraints: { budget: 1000 },
        objectives: ['maximize_yield']
      };

      await testContext
        .request()
        .post('/intelligence/activity/optimize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(404);
    });

    it('should fail with invalid objectives', async () => {
      const requestData = {
        farmId: testFarm.id,
        activityType: 'planting',
        constraints: { budget: 1000 },
        objectives: ['invalid_objective']
      };

      await testContext
        .request()
        .post('/intelligence/activity/optimize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const requestData = {
        farmId: testFarm.id,
        activityType: 'planting',
        constraints: { budget: 1000 },
        objectives: ['maximize_yield']
      };

      await testContext
        .request()
        .post('/intelligence/activity/optimize')
        .send(requestData)
        .expect(401);
    });
  });

  describe('GET /intelligence/activity/optimization/:id', () => {
    let optimizationId: string;

    beforeEach(async () => {
      // Create an activity optimization first
      const optimizationData = {
        farmId: testFarm.id,
        activityType: 'planting',
        constraints: { budget: 5000, time: 20 },
        objectives: ['maximize_yield', 'minimize_cost']
      };

      const createResponse = await testContext
        .request()
        .post('/intelligence/activity/optimize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(optimizationData)
        .expect(200);

      optimizationId = createResponse.body.id;
    });

    it('should get activity optimization by ID successfully', async () => {
      const response = await testContext
        .request()
        .get(`/intelligence/activity/optimization/${optimizationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(optimizationId);
      expect(response.body.farmId).toBe(testFarm.id);
      expect(response.body.activityType).toBe('planting');
      expect(response.body.optimizedPlan).toBeDefined();
      expect(response.body.alternatives).toBeDefined();
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should fail with non-existent optimization ID', async () => {
      await testContext
        .request()
        .get('/intelligence/activity/optimization/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/intelligence/activity/optimization/${optimizationId}`)
        .expect(401);
    });
  });

  describe('GET /intelligence/activity/optimizations', () => {
    beforeEach(async () => {
      // Create multiple activity optimizations
      const optimizations = [
        {
          farmId: testFarm.id,
          activityType: 'planting',
          constraints: { budget: 5000 },
          objectives: ['maximize_yield']
        },
        {
          farmId: testFarm.id,
          activityType: 'harvesting',
          constraints: { budget: 3000 },
          objectives: ['minimize_cost']
        }
      ];

      for (const optimization of optimizations) {
        await testContext
          .request()
          .post('/intelligence/activity/optimize')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(optimization)
          .expect(200);
      }
    });

    it('should list activity optimizations successfully', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/activity/optimizations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/activity/optimizations?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/intelligence/activity/optimizations')
        .expect(401);
    });
  });

  describe('GET /intelligence/history', () => {
    beforeEach(async () => {
      // Create various intelligence responses
      const responses = [
        {
          prompt: 'What is the best time to plant corn?',
          model: 'gpt-3.5-turbo',
          farmId: testFarm.id
        },
        {
          prompt: 'How to improve soil quality?',
          model: 'gpt-4',
          farmId: testFarm.id
        }
      ];

      for (const response of responses) {
        await testContext
          .request()
          .post('/intelligence/generate')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(response)
          .expect(200);
      }
    });

    it('should get intelligence history successfully', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by farm ID', async () => {
      const response = await testContext
        .request()
        .get(`/intelligence/history?farmId=${testFarm.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      response.body.data.forEach((item: any) => {
        expect(item.farmId).toBe(testFarm.id);
      });
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/history?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/intelligence/history')
        .expect(401);
    });
  });

  describe('GET /intelligence/response/:id', () => {
    let responseId: string;

    beforeEach(async () => {
      // Create an intelligence response first
      const requestData = {
        prompt: 'What are the benefits of crop rotation?',
        model: 'gpt-3.5-turbo',
        farmId: testFarm.id
      };

      const createResponse = await testContext
        .request()
        .post('/intelligence/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestData)
        .expect(200);

      responseId = createResponse.body.id;
    });

    it('should get intelligence response by ID successfully', async () => {
      const response = await testContext
        .request()
        .get(`/intelligence/response/${responseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(responseId);
      expect(response.body.content).toBeDefined();
      expect(response.body.model).toBe('gpt-3.5-turbo');
      expect(response.body.usage).toBeDefined();
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.farmId).toBe(testFarm.id);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should fail with non-existent response ID', async () => {
      await testContext
        .request()
        .get('/intelligence/response/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/intelligence/response/${responseId}`)
        .expect(401);
    });
  });

  describe('GET /intelligence/health', () => {
    it('should get health status successfully', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/health')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
      expect(response.body.models).toBeDefined();
      expect(Array.isArray(response.body.models)).toBe(true);
    });

    it('should work without authentication (health check is public)', async () => {
      const response = await testContext
        .request()
        .get('/intelligence/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
    });
  });

  describe('Intelligence Integration Tests', () => {
    it('should complete full intelligence workflow', async () => {
      // 1. Generate AI response
      const generateData = {
        prompt: 'What are the best practices for sustainable farming?',
        model: 'gpt-3.5-turbo',
        farmId: testFarm.id
      };

      const generateResponse = await testContext
        .request()
        .post('/intelligence/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(generateData)
        .expect(200);

      const responseId = generateResponse.body.id;

      // 2. Analyze farm data
      const farmAnalysisData = {
        farmId: testFarm.id,
        analysisType: 'sustainability_score',
        data: {
          cropTypes: ['corn', 'wheat'],
          area: 100,
          practices: ['crop_rotation', 'cover_crops']
        }
      };

      const farmAnalysisResponse = await testContext
        .request()
        .post('/intelligence/farm/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(farmAnalysisData)
        .expect(200);

      const farmAnalysisId = farmAnalysisResponse.body.id;

      // 3. Analyze market conditions
      const marketAnalysisData = {
        commodity: 'corn',
        region: 'North America',
        timeframe: 'monthly',
        analysisType: 'price_prediction'
      };

      const marketAnalysisResponse = await testContext
        .request()
        .post('/intelligence/market/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(marketAnalysisData)
        .expect(200);

      const marketAnalysisId = marketAnalysisResponse.body.id;

      // 4. Optimize activities
      const optimizationData = {
        farmId: testFarm.id,
        activityType: 'planting',
        constraints: {
          budget: 15000,
          time: 45,
          resources: ['tractor', 'seeds', 'fertilizer']
        },
        objectives: ['maximize_yield', 'minimize_cost', 'maximize_quality']
      };

      const optimizationResponse = await testContext
        .request()
        .post('/intelligence/activity/optimize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(optimizationData)
        .expect(200);

      const optimizationId = optimizationResponse.body.id;

      // 5. Retrieve all created items
      await testContext
        .request()
        .get(`/intelligence/response/${responseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await testContext
        .request()
        .get(`/intelligence/farm/analysis/${farmAnalysisId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await testContext
        .request()
        .get(`/intelligence/market/analysis/${marketAnalysisId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await testContext
        .request()
        .get(`/intelligence/activity/optimization/${optimizationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 6. Verify all items appear in history
      const historyResponse = await testContext
        .request()
        .get('/intelligence/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(historyResponse.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle concurrent intelligence requests', async () => {
      const requests = [
        {
          prompt: 'What is crop rotation?',
          model: 'gpt-3.5-turbo'
        },
        {
          prompt: 'How to manage pests?',
          model: 'gpt-3.5-turbo'
        },
        {
          prompt: 'Best irrigation practices?',
          model: 'gpt-3.5-turbo'
        }
      ];

      const promises = requests.map(request =>
        testContext
          .request()
          .post('/intelligence/generate')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(request)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBeDefined();
        expect(response.body.content).toBeDefined();
      });
    });
  });
});
