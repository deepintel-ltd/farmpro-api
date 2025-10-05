import {
  FarmSchema,
  CommoditySchema,
  UserSchema,
  JsonApiResourceSchema,
  JsonApiErrorResponseSchema,
  CreateFarmRequestSchema,
  UpdateFarmRequestSchema,
  JsonApiQuerySchema
} from './schemas';
import { OrderSchema } from './orders.schemas';

describe('Core Resource Schemas', () => {
  describe('FarmSchema', () => {
    it('should validate a valid farm object', () => {
      const validFarm = {
        name: 'Green Valley Farm',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: {
            street: '123 Farm Road',
            city: 'Rural County',
            state: 'State',
            zipCode: '12345',
            country: 'US'
          }
        },
        size: 150.5,
        cropTypes: ['corn', 'soybeans', 'wheat'],
        establishedDate: '2020-01-15T00:00:00.000Z',
        certifications: ['organic', 'non-gmo']
      };

      const result = FarmSchema.safeParse(validFarm);
      expect(result.success).toBe(true);
    });

    it('should reject farm with invalid data', () => {
      const invalidFarm = {
        name: '', // Empty name should fail
        location: {
          latitude: 200, // Invalid latitude
          longitude: -74.0060,
          address: {
            street: '123 Farm Road',
            city: 'City',
            state: 'ST',
            zipCode: '12345',
            country: 'US'
          }
        },
        size: -10, // Negative size should fail
        cropTypes: [], // Empty array should fail
        establishedDate: 'invalid-date'
      };

      const result = FarmSchema.safeParse(invalidFarm);
      expect(result.success).toBe(false);
    });
  });

  describe('CommoditySchema', () => {
    it('should validate a valid commodity object', () => {
      const validCommodity = {
        name: 'Premium Corn',
        category: 'grain' as const,
        variety: 'Yellow Dent',
        qualityGrade: 'premium' as const,
        quantity: 1000,
        unit: 'bushel' as const,
        harvestDate: '2023-09-15T00:00:00.000Z',
        storageLocation: 'Silo A-1'
      };

      const result = CommoditySchema.safeParse(validCommodity);
      expect(result.success).toBe(true);
    });

    it('should reject commodity with invalid category', () => {
      const invalidCommodity = {
        name: 'Premium Corn',
        category: 'invalid-category',
        qualityGrade: 'premium',
        quantity: 1000,
        unit: 'bushel',
        harvestDate: '2023-09-15T00:00:00.000Z',
        storageLocation: 'Silo A-1'
      };

      const result = CommoditySchema.safeParse(invalidCommodity);
      expect(result.success).toBe(false);
    });
  });

  describe('OrderSchema', () => {
    it('should validate a valid order object', () => {
      const validOrder = {
        type: 'BUY' as const,
        title: 'Wheat Purchase Order',
        commodityId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 500,
        pricePerUnit: 5.50,
        totalPrice: 2750,
        deliveryDate: '2023-12-01T00:00:00.000Z',
        deliveryLocation: 'Warehouse District, City',
        status: 'PENDING' as const,
        deliveryAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zip: '12345',
          country: 'Country'
        },
        items: [
          {
            commodityId: 'clx1234567890123456789012',
            quantity: 500,
            pricePerUnit: 5.50,
            unit: 'bushels'
          }
        ],
        terms: {
          paymentMethod: 'escrow' as const,
          deliveryTerms: 'FOB destination',
          qualityRequirements: 'Grade A or better'
        }
      };

      const result = OrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('should reject order with invalid UUID', () => {
      const invalidOrder = {
        type: 'BUY',
        title: 'Test Order',
        commodityId: 'invalid-uuid',
        quantity: 500,
        pricePerUnit: 5.50,
        totalPrice: 2750,
        deliveryDate: '2023-12-01T00:00:00.000Z',
        deliveryLocation: 'Warehouse District',
        status: 'PENDING',
        deliveryAddress: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zip: '12345',
          country: 'Country'
        },
        items: [
          {
            commodityId: 'invalid-uuid',
            quantity: 500,
            pricePerUnit: 5.50,
            unit: 'bushels'
          }
        ],
        terms: {
          paymentMethod: 'escrow',
          deliveryTerms: 'FOB destination'
        }
      };

      const result = OrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });
  });

  describe('UserSchema', () => {
    it('should validate a valid user object', () => {
      const validUser = {
        email: 'farmer@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'farmer' as const,
        phone: '+1-555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Farmville',
          state: 'IA',
          zipCode: '12345',
          country: 'US'
        },
        isActive: true
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject user with invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        role: 'farmer'
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });
});

describe('JSON API Schemas', () => {
  describe('JsonApiResourceSchema', () => {
    it('should validate a JSON API resource response', () => {
      const FarmResourceTest = JsonApiResourceSchema(FarmSchema);

      const validResource = {
        data: {
          id: '123',
          type: 'farms',
          attributes: {
            name: 'Test Farm',
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              address: {
                street: '123 Farm Road',
                city: 'City',
                state: 'ST',
                zipCode: '12345',
                country: 'US'
              }
            },
            size: 100,
            cropTypes: ['corn'],
            establishedDate: '2020-01-15T00:00:00.000Z'
          }
        },
        meta: {
          totalCount: 1
        },
        links: {
          self: 'https://api.example.com/farms/123'
        }
      };

      const result = FarmResourceTest.safeParse(validResource);
      expect(result.success).toBe(true);
    });
  });

  describe('JsonApiErrorResponseSchema', () => {
    it('should validate a JSON API error response', () => {
      const validErrorResponse = {
        errors: [
          {
            status: '400',
            code: 'VALIDATION_ERROR',
            title: 'Validation Failed',
            detail: 'The name field is required',
            source: {
              pointer: '/data/attributes/name'
            }
          }
        ]
      };

      const result = JsonApiErrorResponseSchema.safeParse(validErrorResponse);
      expect(result.success).toBe(true);
    });
  });
});

describe('Request Schemas', () => {
  describe('CreateFarmRequestSchema', () => {
    it('should validate a create farm request', () => {
      const validRequest = {
        data: {
          type: 'farms',
          attributes: {
            name: 'New Farm',
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              address: {
                street: '123 New Farm Road',
                city: 'City',
                state: 'ST',
                zipCode: '12345',
                country: 'US'
              }
            },
            size: 200,
            cropTypes: ['corn', 'soybeans'],
            establishedDate: '2023-01-15T00:00:00.000Z'
          }
        }
      };

      const result = CreateFarmRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateFarmRequestSchema', () => {
    it('should validate an update farm request with partial attributes', () => {
      const validRequest = {
        data: {
          id: '123',
          type: 'farms',
          attributes: {
            name: 'Updated Farm Name',
            size: 250
            // Other fields are optional for updates
          }
        }
      };

      const result = UpdateFarmRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });
});

describe('Query Parameter Schema', () => {
  describe('JsonApiQuerySchema', () => {
    it('should validate JSON API query parameters', () => {
      const validQuery = {
        include: 'commodities,orders',
        'fields[farms]': 'name,location',
        sort: 'name,-establishedDate',
        'page[number]': 1,
        'page[size]': 20,
        filter: {
          'name': 'Green Valley',
          'location.state': 'IA'
        }
      };

      const result = JsonApiQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should reject invalid page size', () => {
      const invalidQuery = {
        'page[size]': 200 // Exceeds max of 100
      };

      const result = JsonApiQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });
});
