import { describe, it, expect } from '@jest/globals';
import { 
  apiContract, 
  validateRequestBody, 
  validateQueryParams, 
  validatePathParams,
  ContractValidator,
  getContractMetadata
} from './contracts';
import { 
  CreateFarmRequestSchema, 
  JsonApiQuerySchema 
} from './schemas';

describe('API Contracts', () => {
  describe('Contract Structure', () => {
    it('should have all required resource contracts', () => {
      expect(apiContract.farms).toBeDefined();
      expect(apiContract.commodities).toBeDefined();
      expect(apiContract.ordersCrud).toBeDefined();
      expect(apiContract.ordersMarketplace).toBeDefined();
      expect(apiContract.ordersMessaging).toBeDefined();
      expect(apiContract.ordersAnalytics).toBeDefined();
      expect(apiContract.ordersDisputes).toBeDefined();
      expect(apiContract.ordersRelationships).toBeDefined();
      expect(apiContract.users).toBeDefined();
      expect(apiContract.health).toBeDefined();
    });

    it('should have CRUD operations for farms', () => {
      expect(apiContract.farms.getFarms).toBeDefined();
      expect(apiContract.farms.getFarm).toBeDefined();
      expect(apiContract.farms.createFarm).toBeDefined();
      expect(apiContract.farms.updateFarm).toBeDefined();
      expect(apiContract.farms.deleteFarm).toBeDefined();
    });

    it('should have relationship endpoints for farms', () => {
      expect(apiContract.farms.getFarmCommodities).toBeDefined();
      expect(apiContract.farms.getFarmOrders).toBeDefined();
      expect(apiContract.farms.getFarmCommodityRelationships).toBeDefined();
      expect(apiContract.farms.getFarmOrderRelationships).toBeDefined();
    });

    it('should have correct HTTP methods', () => {
      expect(apiContract.farms.getFarms.method).toBe('GET');
      expect(apiContract.farms.createFarm.method).toBe('POST');
      expect(apiContract.farms.updateFarm.method).toBe('PATCH');
      expect(apiContract.farms.deleteFarm.method).toBe('DELETE');
    });

    it('should have correct paths', () => {
      expect(apiContract.farms.getFarms.path).toBe('/api/farms');
      expect(apiContract.farms.getFarm.path).toBe('/api/farms/:id');
      expect(apiContract.farms.createFarm.path).toBe('/api/farms');
      expect(apiContract.farms.updateFarm.path).toBe('/api/farms/:id');
      expect(apiContract.farms.deleteFarm.path).toBe('/api/farms/:id');
    });
  });

  describe('Validation Utilities', () => {
    it('should validate valid request body', () => {
      const validFarmRequest = {
        data: {
          type: 'farms',
          attributes: {
            name: 'Test Farm',
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              address: '123 Farm Road, Test City, NY'
            },
            size: 100,
            cropTypes: ['corn', 'wheat'],
            establishedDate: '2020-01-01T00:00:00Z'
          }
        }
      };

      const result = validateRequestBody(CreateFarmRequestSchema, validFarmRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.attributes.name).toBe('Test Farm');
      }
    });

    it('should reject invalid request body', () => {
      const invalidFarmRequest = {
        data: {
          type: 'farms',
          attributes: {
            name: '', // Invalid: empty name
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              address: '123 Farm Road'
            },
            size: -10, // Invalid: negative size
            cropTypes: [], // Invalid: empty array
            establishedDate: 'invalid-date' // Invalid: bad date format
          }
        }
      };

      const result = validateRequestBody(CreateFarmRequestSchema, invalidFarmRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect((result as { success: false; errors: any }).errors.issues.length).toBeGreaterThan(0);
      }
    });

    it('should validate query parameters', () => {
      const validQuery = {
        include: 'commodities,orders',
        sort: 'name,-establishedDate',
        'page[number]': '1',
        'page[size]': '10'
      };

      const result = validateQueryParams(JsonApiQuerySchema, validQuery);
      expect(result.success).toBe(true);
    });

    it('should validate path parameters', () => {
      const validPathParams = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const pathSchema = apiContract.farms.getFarm.pathParams;
      const result = validatePathParams(pathSchema, validPathParams);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID in path parameters', () => {
      const invalidPathParams = {
        id: 'not-a-uuid'
      };

      const pathSchema = apiContract.farms.getFarm.pathParams;
      const result = validatePathParams(pathSchema, invalidPathParams);
      expect(result.success).toBe(false);
    });
  });

  describe('Contract Validator', () => {
    it('should validate JSON API structure for single resource', () => {
      const validJsonApiResource = {
        data: {
          id: '123',
          type: 'farms',
          attributes: {
            name: 'Test Farm'
          }
        }
      };

      expect(ContractValidator.validateJsonApiStructure(validJsonApiResource)).toBe(true);
    });

    it('should validate JSON API structure for collection', () => {
      const validJsonApiCollection = {
        data: [
          {
            id: '123',
            type: 'farms',
            attributes: {
              name: 'Test Farm 1'
            }
          },
          {
            id: '456',
            type: 'farms',
            attributes: {
              name: 'Test Farm 2'
            }
          }
        ]
      };

      expect(ContractValidator.validateJsonApiStructure(validJsonApiCollection)).toBe(true);
    });

    it('should reject invalid JSON API structure', () => {
      const invalidStructure = {
        farms: [
          { name: 'Test Farm' }
        ]
      };

      expect(ContractValidator.validateJsonApiStructure(invalidStructure)).toBe(false);
    });

    it('should validate include parameter', () => {
      const validIncludes = ['commodities', 'orders', 'owner'];
      
      expect(ContractValidator.validateIncludeParameter('commodities', validIncludes)).toBe(true);
      expect(ContractValidator.validateIncludeParameter('commodities,orders', validIncludes)).toBe(true);
      expect(ContractValidator.validateIncludeParameter('invalid', validIncludes)).toBe(false);
      expect(ContractValidator.validateIncludeParameter('', validIncludes)).toBe(true);
    });

    it('should validate sort parameter', () => {
      const validFields = ['name', 'establishedDate', 'size'];
      
      expect(ContractValidator.validateSortParameter('name', validFields)).toBe(true);
      expect(ContractValidator.validateSortParameter('-name', validFields)).toBe(true);
      expect(ContractValidator.validateSortParameter('name,-establishedDate', validFields)).toBe(true);
      expect(ContractValidator.validateSortParameter('invalid', validFields)).toBe(false);
      expect(ContractValidator.validateSortParameter('', validFields)).toBe(true);
    });
  });

  describe('Contract Metadata', () => {
    it('should return contract metadata', () => {
      const metadata = getContractMetadata();
      
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.title).toBe('FarmPro API');
      expect(metadata.description).toBe('JSON API compliant agricultural platform API');
      expect(metadata.endpoints.farms).toBeDefined();
      expect(metadata.endpoints.commodities).toBeDefined();
      expect(metadata.endpoints.ordersCrud).toBeDefined();
      expect(metadata.endpoints.ordersMarketplace).toBeDefined();
      expect(metadata.endpoints.ordersMessaging).toBeDefined();
      expect(metadata.endpoints.ordersAnalytics).toBeDefined();
      expect(metadata.endpoints.ordersDisputes).toBeDefined();
      expect(metadata.endpoints.ordersRelationships).toBeDefined();
      expect(metadata.endpoints.users).toBeDefined();
    });
  });

  describe('Response Status Codes', () => {
    it('should have correct status codes for CRUD operations', () => {
      // GET operations should return 200
      expect(apiContract.farms.getFarms.responses[200]).toBeDefined();
      expect(apiContract.farms.getFarm.responses[200]).toBeDefined();
      
      // POST operations should return 201
      expect(apiContract.farms.createFarm.responses[201]).toBeDefined();
      
      // PATCH operations should return 200
      expect(apiContract.farms.updateFarm.responses[200]).toBeDefined();
      
      // DELETE operations should return 204
      expect(apiContract.farms.deleteFarm.responses[204]).toBeDefined();
      
      // All operations should have error responses
      expect(apiContract.farms.getFarms.responses[400]).toBeDefined();
      expect(apiContract.farms.getFarms.responses[500]).toBeDefined();
      expect(apiContract.farms.getFarm.responses[404]).toBeDefined();
    });
  });

  describe('Relationship Endpoints', () => {
    it('should have relationship endpoints for all resources', () => {
      // Farm relationships
      expect(apiContract.farms.getFarmCommodities.path).toBe('/api/farms/:id/commodities');
      expect(apiContract.farms.getFarmOrders.path).toBe('/api/farms/:id/orders');
      expect(apiContract.farms.getFarmCommodityRelationships.path).toBe('/api/farms/:id/relationships/commodities');
      expect(apiContract.farms.getFarmOrderRelationships.path).toBe('/api/farms/:id/relationships/orders');
      
      // User relationships
      expect(apiContract.users.getUserFarms.path).toBe('/users/:id/farms');
      expect(apiContract.users.getUserOrders.path).toBe('/users/:id/orders');
      expect(apiContract.users.getUserFarmRelationships.path).toBe('/users/:id/relationships/farms');
      expect(apiContract.users.getUserOrderRelationships.path).toBe('/users/:id/relationships/orders');
      
      // Order relationships
      expect(apiContract.ordersRelationships.getOrderBuyer.path).toBe('/orders/:id/buyer');
      expect(apiContract.ordersRelationships.getOrderSeller.path).toBe('/orders/:id/seller');
      expect(apiContract.ordersRelationships.getOrderBuyerRelationship.path).toBe('/orders/:id/relationships/buyer');
      expect(apiContract.ordersRelationships.getOrderSellerRelationship.path).toBe('/orders/:id/relationships/seller');
      
      // Commodity relationships
      expect(apiContract.commodities.getCommodityOrders.path).toBe('/commodities/:id/orders');
      expect(apiContract.commodities.getCommodityOrderRelationships.path).toBe('/commodities/:id/relationships/orders');
    });
  });

  describe('Query Parameter Support', () => {
    it('should support include parameters on all GET endpoints', () => {
      expect(apiContract.farms.getFarms.query).toBeDefined();
      expect(apiContract.farms.getFarm.query).toBeDefined();
      expect(apiContract.commodities.getCommodities.query).toBeDefined();
      expect(apiContract.ordersCrud.getOrders.query).toBeDefined();
      expect(apiContract.users.getUsers.query).toBeDefined();
    });

    it('should support pagination parameters', () => {
      const farmQuery = apiContract.farms.getFarms.query;
      // The query schema should accept page parameters
      const testQuery = {
        'page[number]': '1',
        'page[size]': '10'
      };
      
      const result = farmQuery.safeParse(testQuery);
      expect(result.success).toBe(true);
    });

    it('should support sorting parameters', () => {
      const farmQuery = apiContract.farms.getFarms.query;
      const testQuery = {
        sort: 'name,-establishedDate'
      };
      
      const result = farmQuery.safeParse(testQuery);
      expect(result.success).toBe(true);
    });

    it('should support field selection parameters', () => {
      const farmQuery = apiContract.farms.getFarms.query;
      const testQuery = {
        'fields[farms]': 'name,location',
        'fields[commodities]': 'name,category'
      };
      
      const result = farmQuery.safeParse(testQuery);
      expect(result.success).toBe(true);
    });
  });
});
