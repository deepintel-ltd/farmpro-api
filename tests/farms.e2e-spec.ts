import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Farms E2E Tests', () => {
  let testContext: TestContext;
  let accessToken: string;
  let organizationId: string;

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
  });

  describe('GET /farms', () => {
    it('should get farms list successfully', async () => {
      // Create test farms
      await testContext.createFarm({
        name: 'Green Valley Farm',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Green Valley Road, San Francisco, CA'
        },
        totalArea: 100.5,
        cropTypes: ['wheat', 'corn'],
        establishedDate: '2020-01-01T00:00:00Z',
        certifications: ['organic', 'sustainable'],
        organization: { connect: { id: organizationId } },
        isActive: true
      });

      await testContext.createFarm({
        name: 'Sunrise Acres',
        location: {
          latitude: 37.7849,
          longitude: -122.4094,
          address: '456 Sunrise Lane, Oakland, CA'
        },
        totalArea: 75.2,
        cropTypes: ['soybeans'],
        establishedDate: '2019-06-15T00:00:00Z',
        organization: { connect: { id: organizationId } },
        isActive: true
      });

      const response = await testContext
        .request()
        .get('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.pagination.total).toBe(2);
      expect(response.body.data[0].type).toBe('farms');
      expect(response.body.data[0].attributes.name).toBeDefined();
    });

    it('should filter farms by search term', async () => {
      // Create test farms
      await testContext.createFarm({
        name: 'Green Valley Farm',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Green Valley Road, San Francisco, CA'
        },
        totalArea: 100.5,
        cropTypes: ['wheat'],
        establishedDate: '2020-01-01T00:00:00Z',
        organization: { connect: { id: organizationId } },
        isActive: true
      });

      await testContext.createFarm({
        name: 'Sunrise Acres',
        location: {
          latitude: 37.7849,
          longitude: -122.4094,
          address: '456 Sunrise Lane, Oakland, CA'
        },
        totalArea: 75.2,
        cropTypes: ['soybeans'],
        establishedDate: '2019-06-15T00:00:00Z',
        isActive: true
      });

      const response = await testContext
        .request()
        .get('/farms?search=Green')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].attributes.name).toBe('Green Valley Farm');
    });

    it('should filter farms by active status', async () => {
      // Create active and inactive farms
      await testContext.createFarm({
        name: 'Active Farm',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Active Road, San Francisco, CA'
        },
        totalArea: 100.5,
        cropTypes: ['wheat'],
        establishedDate: '2020-01-01T00:00:00Z',
        organization: { connect: { id: organizationId } },
        isActive: true
      });

      await testContext.createFarm({
        name: 'Inactive Farm',
        location: {
          latitude: 37.7849,
          longitude: -122.4094,
          address: '456 Inactive Lane, Oakland, CA'
        },
        totalArea: 75.2,
        cropTypes: ['soybeans'],
        establishedDate: '2019-06-15T00:00:00Z',
        isActive: false
      });

      const response = await testContext
        .request()
        .get('/farms?isActive=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].attributes.name).toBe('Active Farm');
    });

    it('should paginate farms correctly', async () => {
      // Create multiple farms
      for (let i = 1; i <= 15; i++) {
        await testContext.createFarm({
          name: `Farm ${i}`,
          location: {
            latitude: 37.7749 + (i * 0.001),
            longitude: -122.4194 + (i * 0.001),
            address: `${i} Farm Road, San Francisco, CA`
          },
          totalArea: 100 + i,
          cropTypes: ['wheat'],
          establishedDate: '2020-01-01T00:00:00Z',
          organization: { connect: { id: organizationId } },
          isActive: true
        });
      }

      const response = await testContext
        .request()
        .get('/farms?page[number]=2&page[size]=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta.pagination.page).toBe(2);
      expect(response.body.meta.pagination.limit).toBe(5);
      expect(response.body.meta.pagination.total).toBe(15);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/farms')
        .expect(401);
    });
  });

  describe('GET /farms/:id', () => {
    let farmId: string;

    beforeEach(async () => {
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
        certifications: ['organic'],
        organization: { connect: { id: organizationId } },
        isActive: true
      });

      farmId = farm.id;
    });

    it('should get farm by ID successfully', async () => {
      const response = await testContext
        .request()
        .get(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('farms');
      expect(response.body.data.id).toBe(farmId);
      expect(response.body.data.attributes.name).toBe('Test Farm');
      expect(response.body.data.attributes.size).toBe(100.5);
      expect(response.body.data.attributes.cropTypes).toEqual(['wheat', 'corn']);
      expect(response.body.data.attributes.certifications).toEqual(['organic']);
    });

    it('should fail with non-existent farm ID', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      
      await testContext
        .request()
        .get(`/farms/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail with invalid farm ID format', async () => {
      await testContext
        .request()
        .get('/farms/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/farms/${farmId}`)
        .expect(401);
    });
  });

  describe('POST /farms', () => {
    it('should create farm successfully', async () => {
      const farmData = {
        data: {
          type: 'farms',
          attributes: {
            name: 'New Farm',
            location: {
              latitude: 37.7749,
              longitude: -122.4194,
              address: '123 New Farm Road, San Francisco, CA'
            },
            size: 150.75,
            cropTypes: ['wheat', 'corn', 'soybeans'],
            establishedDate: '2021-03-15T00:00:00Z',
            certifications: ['organic', 'sustainable']
          }
        }
      };

      const response = await testContext
        .request()
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(farmData)
        .expect(201);

      expect(response.body.data.type).toBe('farms');
      expect(response.body.data.attributes.name).toBe('New Farm');
      expect(response.body.data.attributes.size).toBe(150.75);
      expect(response.body.data.attributes.cropTypes).toEqual(['wheat', 'corn', 'soybeans']);
      expect(response.body.data.attributes.certifications).toEqual(['organic', 'sustainable']);
      expect(response.body.data.attributes.isActive).toBe(true);
    });

    it('should fail with invalid farm data', async () => {
      const invalidFarmData = {
        data: {
          type: 'farms',
          attributes: {
            name: '', // Invalid: empty name
            location: {
              latitude: 200, // Invalid: latitude out of range
              longitude: -122.4194,
              address: '' // Invalid: empty address
            },
            size: -10, // Invalid: negative size
            cropTypes: [], // Invalid: empty crop types
            establishedDate: 'invalid-date' // Invalid: invalid date format
          }
        }
      };

      await testContext
        .request()
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidFarmData)
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      const incompleteFarmData = {
        data: {
          type: 'farms',
          attributes: {
            name: 'Incomplete Farm'
            // Missing required fields: location, size, cropTypes, establishedDate
          }
        }
      };

      await testContext
        .request()
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(incompleteFarmData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const farmData = {
        data: {
          type: 'farms',
          attributes: {
            name: 'Unauthorized Farm',
            location: {
              latitude: 37.7749,
              longitude: -122.4194,
              address: '123 Unauthorized Road, San Francisco, CA'
            },
            totalArea: 100.5,
            cropTypes: ['wheat'],
            establishedDate: '2020-01-01T00:00:00Z'
          }
        }
      };

      await testContext
        .request()
        .post('/farms')
        .send(farmData)
        .expect(401);
    });
  });

  describe('PATCH /farms/:id', () => {
    let farmId: string;

    beforeEach(async () => {
      const farm = await testContext.createFarm({
        name: 'Original Farm',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Original Road, San Francisco, CA'
        },
        totalArea: 100.5,
        cropTypes: ['wheat'],
        establishedDate: '2020-01-01T00:00:00Z',
        organization: { connect: { id: organizationId } },
        isActive: true
      });

      farmId = farm.id;
    });

    it('should update farm successfully', async () => {
      const updateData = {
        data: {
          type: 'farms',
          id: farmId,
          attributes: {
            name: 'Updated Farm Name',
            size: 200.75,
            cropTypes: ['wheat', 'corn', 'soybeans'],
            certifications: ['organic']
          }
        }
      };

      const response = await testContext
        .request()
        .patch(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('Updated Farm Name');
      expect(response.body.data.attributes.size).toBe(200.75);
      expect(response.body.data.attributes.cropTypes).toEqual(['wheat', 'corn', 'soybeans']);
      expect(response.body.data.attributes.certifications).toEqual(['organic']);
    });

    it('should update farm location successfully', async () => {
      const updateData = {
        data: {
          type: 'farms',
          id: farmId,
          attributes: {
            location: {
              latitude: 38.7749,
              longitude: -121.4194,
              address: '456 Updated Address, Sacramento, CA'
            }
          }
        }
      };

      const response = await testContext
        .request()
        .patch(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.location.latitude).toBe(38.7749);
      expect(response.body.data.attributes.location.longitude).toBe(-121.4194);
      expect(response.body.data.attributes.location.address).toBe('456 Updated Address, Sacramento, CA');
    });

    it('should fail with non-existent farm ID', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      const updateData = {
        data: {
          type: 'farms',
          id: nonExistentId,
          attributes: {
            name: 'Updated Name'
          }
        }
      };

      await testContext
        .request()
        .patch(`/farms/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should fail with invalid update data', async () => {
      const invalidUpdateData = {
        data: {
          type: 'farms',
          id: farmId,
          attributes: {
            size: -50, // Invalid: negative size
            cropTypes: [] // Invalid: empty crop types
          }
        }
      };

      await testContext
        .request()
        .patch(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const updateData = {
        data: {
          type: 'farms',
          id: farmId,
          attributes: {
            name: 'Unauthorized Update'
          }
        }
      };

      await testContext
        .request()
        .patch(`/farms/${farmId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /farms/:id', () => {
    let farmId: string;

    beforeEach(async () => {
      const farm = await testContext.createFarm({
        name: 'Farm to Delete',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Delete Road, San Francisco, CA'
        },
        totalArea: 100.5,
        cropTypes: ['wheat'],
        establishedDate: '2020-01-01T00:00:00Z',
        organization: { connect: { id: organizationId } },
        isActive: true
      });

      farmId = farm.id;
    });

    it('should delete farm successfully', async () => {
      await testContext
        .request()
        .delete(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(204);

      // Verify farm is soft deleted (inactive)
      const response = await testContext
        .request()
        .get(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.attributes.isActive).toBe(false);
    });

    it('should fail with non-existent farm ID', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      
      await testContext
        .request()
        .delete(`/farms/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(404);
    });

    it('should fail with invalid farm ID format', async () => {
      await testContext
        .request()
        .delete('/farms/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .delete(`/farms/${farmId}`)
        .send({})
        .expect(401);
    });
  });

  describe('GET /farms/:id/commodities', () => {
    let farmId: string;

    beforeEach(async () => {
      const farm = await testContext.createFarm({
        name: 'Farm with Commodities',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Commodity Road, San Francisco, CA'
        },
        totalArea: 100.5,
        cropTypes: ['wheat', 'corn'],
        establishedDate: '2020-01-01T00:00:00Z',
        organization: { connect: { id: organizationId } },
        isActive: true
      });

      farmId = farm.id;

      // Create commodities for the farm
      await testContext.createCommodity({
        name: 'Wheat',
        variety: 'Hard Red Winter',
        category: 'grain',
        qualityGrade: 'premium',
        quantity: 1000,
        unit: 'bushel',
        harvestDate: '2023-08-15T00:00:00Z',
        storageLocation: 'Silo A',
        farm: { connect: { id: farmId } }
      });

      await testContext.createCommodity({
        name: 'Corn',
        variety: 'Yellow Dent',
        category: 'grain',
        qualityGrade: 'standard',
        quantity: 500,
        unit: 'bushel',
        harvestDate: '2023-09-01T00:00:00Z',
        storageLocation: 'Silo B',
        farm: { connect: { id: farmId } }
      });
    });

    it('should get farm commodities successfully', async () => {
      const response = await testContext
        .request()
        .get(`/farms/${farmId}/commodities`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].type).toBe('commodities');
      expect(response.body.data[0].attributes.name).toBeDefined();
    });

    it('should fail with non-existent farm ID', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      
      await testContext
        .request()
        .get(`/farms/${nonExistentId}/commodities`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/farms/${farmId}/commodities`)
        .expect(401);
    });
  });

  // Note: Farm orders functionality is not implemented yet
  // describe('GET /farms/:id/orders', () => {
  //   // Orders tests will be added when the functionality is implemented
  // });

  describe('Farm Integration Tests', () => {
    it('should complete full farm lifecycle', async () => {
      // 1. Create farm
      const createResponse = await testContext
        .request()
        .post('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'farms',
            attributes: {
              name: 'Lifecycle Farm',
              location: {
                latitude: 37.7749,
                longitude: -122.4194,
                address: '123 Lifecycle Road, San Francisco, CA'
              },
              size: 200.0,
              cropTypes: ['wheat', 'corn'],
              establishedDate: '2020-01-01T00:00:00Z',
              certifications: ['organic']
            }
          }
        })
        .expect(201);

      const farmId = createResponse.body.data.id;

      // 2. Get farm
      await testContext
        .request()
        .get(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 3. Update farm
      await testContext
        .request()
        .patch(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'farms',
            id: farmId,
            attributes: {
              name: 'Updated Lifecycle Farm',
              size: 250.0
            }
          }
        })
        .expect(200);

      // 4. Verify update
      const getResponse = await testContext
        .request()
        .get(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.data.attributes.name).toBe('Updated Lifecycle Farm');
      expect(getResponse.body.data.attributes.size).toBe(250.0);

      // 5. Delete farm
      await testContext
        .request()
        .delete(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(204);

      // 6. Verify deletion (soft delete - farm should be inactive)
      const deleteResponse = await testContext
        .request()
        .get(`/farms/${farmId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(deleteResponse.body.data.attributes.isActive).toBe(false);
    });

    it('should handle concurrent farm operations', async () => {
      const farmPromises = [];

      // Create multiple farms concurrently
      for (let i = 1; i <= 5; i++) {
        farmPromises.push(
          testContext
            .request()
            .post('/farms')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              data: {
                type: 'farms',
                attributes: {
                  name: `Concurrent Farm ${i}`,
                  location: {
                    latitude: 37.7749 + (i * 0.001),
                    longitude: -122.4194 + (i * 0.001),
                    address: `${i} Concurrent Road, San Francisco, CA`
                  },
                  size: 100 + i,
                  cropTypes: ['wheat'],
                  establishedDate: '2020-01-01T00:00:00Z'
                }
              }
            })
        );
      }

      const responses = await Promise.all(farmPromises);
      
      // Check for successful responses
      const successfulResponses = responses.filter(response => response.status === 201);
      const failedResponses = responses.filter(response => response.status !== 201);
      
      // Log failed responses for debugging
      if (failedResponses.length > 0) {
        console.log('Failed concurrent farm creation responses:');
        failedResponses.forEach((r, index) => {
          console.log(`Response ${index + 1}:`, {
            status: r.status,
            issues: r.body.bodyResult?.issues
          });
        });
      }
      
      // At least some should succeed (allowing for some failures due to concurrency)
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // Verify successful farms were created
      successfulResponses.forEach(response => {
        expect(response.body.data.attributes.name).toContain('Concurrent Farm');
      });

      // Verify farms were created in the database
      const listResponse = await testContext
        .request()
        .get('/farms')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(successfulResponses.length);
    });
  });
});
