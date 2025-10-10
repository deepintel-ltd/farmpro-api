import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Activities E2E Tests', () => {
  let testContext: TestContext;
  let testUser: any;
  let testOrganization: any;
  let testFarm: any;
  let testArea: any;
  let accessToken: string;
  const nonExistentFarmId = 'cixf02ym000001b66m45ae4k8';

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up activities-related tables before each test
    // Note: We preserve system roles and permissions
    await testContext.prisma.$executeRaw`SET session_replication_role = replica;`;
    await testContext.prisma.$executeRaw`TRUNCATE TABLE "activity_notes" CASCADE;`;
    await testContext.prisma.$executeRaw`TRUNCATE TABLE "activity_costs" CASCADE;`;
    await testContext.prisma.$executeRaw`TRUNCATE TABLE "activity_assignments" CASCADE;`;
    await testContext.prisma.$executeRaw`TRUNCATE TABLE "farm_activities" CASCADE;`;
    await testContext.prisma.$executeRaw`TRUNCATE TABLE "farms" CASCADE;`;
    await testContext.prisma.$executeRaw`TRUNCATE TABLE "areas" CASCADE;`;
    await testContext.prisma.$executeRaw`DELETE FROM "user_roles";`;
    await testContext.prisma.$executeRaw`DELETE FROM "users";`;
    await testContext.prisma.$executeRaw`DELETE FROM "role_permissions" WHERE "roleId" IN (SELECT id FROM roles WHERE "isSystemRole" = false);`;
    await testContext.prisma.$executeRaw`DELETE FROM "roles" WHERE "isSystemRole" = false;`;
    await testContext.prisma.$executeRaw`DELETE FROM "organizations";`;
    await testContext.prisma.$executeRaw`SET session_replication_role = DEFAULT;`;
    
    // Create test organization
    testOrganization = await testContext.createOrganization({
      name: 'Test Farm Organization',
      type: 'FARM_OPERATION',
      email: 'test@farm.com'
    });

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    testUser = await testContext.createUser({
      email: 'testuser@farm.com',
      name: 'Test Farm User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id
    });

    // Create test farm
    testFarm = await testContext.prisma.farm.create({
      data: {
        name: 'Test Farm',
        organizationId: testOrganization.id,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Test Farm Road, Test City, TC 12345'
        },
        totalArea: 100,
        cropTypes: ['wheat', 'corn'],
        establishedDate: new Date('2020-01-01'),
        isActive: true
      }
    });

    // Create test area
    testArea = await testContext.prisma.area.create({
      data: {
        name: 'Test Field A',
        farmId: testFarm.id,
        size: 50,
        isActive: true
      }
    });

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'testuser@farm.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('POST /activities', () => {
    it('should create a new activity successfully', async () => {
      const activityData = {
        name: 'Test Planting Activity',
        description: 'Plant corn seeds in field A',
        type: 'PLANTING',
        priority: 'NORMAL',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        estimatedDuration: 120, // 2 hours
        farmId: testFarm.id,
        areaId: testArea.id,
        instructions: 'Plant seeds 2 inches deep, 6 inches apart',
        safetyNotes: 'Wear protective gear',
        estimatedCost: 150.00,
        resources: [
          {
            type: 'equipment',
            resourceId: 'tractor-001',
            quantity: 1,
            unit: 'unit'
          },
          {
            type: 'material',
            resourceId: 'corn-seeds',
            quantity: 50,
            unit: 'kg'
          }
        ],
        location: {
          lat: 40.7128,
          lng: -74.0060
        }
      };

      const response = await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(activityData)
        .expect(201);

      expect(response.body.data.type).toBe('activities');
      expect(response.body.data.attributes.name).toBe(activityData.name);
      expect(response.body.data.attributes.type).toBe(activityData.type);
      expect(response.body.data.attributes.status).toBe('PLANNED');
      expect(response.body.data.attributes.farmId).toBe(testFarm.id);
      expect(response.body.data.attributes.areaId).toBe(testArea.id);
      expect(response.body.data.attributes.createdBy).toBe(testUser.id);
    });

    it('should fail to create activity with invalid data', async () => {
      const invalidData = {
        name: '', // Empty name
        type: 'INVALID_TYPE', // Invalid type
        priority: 'INVALID_PRIORITY', // Invalid priority
        farmId: 'invalid-farm-id', // Invalid farm ID
        scheduledAt: 'invalid-date' // Invalid date
      };

      await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should fail to create activity without authentication', async () => {
      const activityData = {
        name: 'Test Activity',
        type: 'PLANTING',
        priority: 'NORMAL',
        farmId: testFarm.id
      };

      await testContext
        .request()
        .post('/activities')
        .send(activityData)
        .expect(401);
    });

    it('should fail to create activity for non-existent farm', async () => {
      const activityData = {
        name: 'Test Activity',
        type: 'PLANTING',
        priority: 'NORMAL',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        farmId: nonExistentFarmId
      };

      await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(activityData)
        .expect(404);
    });
  });

  describe('GET /activities', () => {
    beforeEach(async () => {
      // Create a test activity
      await testContext.prisma.farmActivity.create({
        data: {
          name: 'Test Activity for Listing',
          description: 'Test activity description',
          type: 'PLANTING',
          status: 'PLANNED',
          priority: 'NORMAL',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          estimatedDuration: 120,
          farmId: testFarm.id,
          areaId: testArea.id,
          createdById: testUser.id
        }
      });
    });

    it('should get activities list successfully', async () => {
      const response = await testContext
        .request()
        .get('/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].type).toBe('activities');
    });

    it('should filter activities by farm ID', async () => {
      const response = await testContext
        .request()
        .get(`/activities?farmId=${testFarm.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((activity: any) => {
        expect(activity.attributes.farmId).toBe(testFarm.id);
      });
    });

    it('should filter activities by status', async () => {
      const response = await testContext
        .request()
        .get('/activities?status=PLANNED')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((activity: any) => {
        expect(activity.attributes.status).toBe('PLANNED');
      });
    });

    it('should filter activities by type', async () => {
      const response = await testContext
        .request()
        .get('/activities?type=PLANTING')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((activity: any) => {
        expect(activity.attributes.type).toBe('PLANTING');
      });
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/activities?page=1&pageSize=10')
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
        .get('/activities')
        .expect(401);
    });
  });

  describe('GET /activities/:activityId', () => {
    let testActivity: any;

    beforeEach(async () => {
      testActivity = await testContext.prisma.farmActivity.create({
        data: {
          name: 'Test Activity for Details',
          description: 'Test activity description',
          type: 'PLANTING',
          status: 'PLANNED',
          priority: 'NORMAL',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          estimatedDuration: 120,
          farmId: testFarm.id,
          areaId: testArea.id,
          createdById: testUser.id,
        }
      });
    });

    it('should get activity details successfully', async () => {
      const response = await testContext
        .request()
        .get(`/activities/${testActivity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('activities');
      expect(response.body.data.attributes.id).toBe(testActivity.id);
      expect(response.body.data.attributes.name).toBe(testActivity.name);
      expect(response.body.data.attributes.type).toBe(testActivity.type);
    });

    it('should fail to get non-existent activity', async () => {
      await testContext
        .request()
        .get('/activities/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/activities/${testActivity.id}`)
        .expect(401);
    });
  });

  describe('PATCH /activities/:activityId', () => {
    let testActivity: any;

    beforeEach(async () => {
      testActivity = await testContext.prisma.farmActivity.create({
        data: {
          name: 'Test Activity for Update',
          description: 'Test activity description',
          type: 'PLANTING',
          status: 'PLANNED',
          priority: 'NORMAL',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          estimatedDuration: 120,
          farmId: testFarm.id,
          areaId: testArea.id,
          createdById: testUser.id,
        }
      });
    });

    it('should update activity successfully', async () => {
      const updateData = {
        name: 'Updated Activity Name',
        description: 'Updated description',
        priority: 'HIGH',
        estimatedDuration: 180
      };

      const response = await testContext
        .request()
        .patch(`/activities/${testActivity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe(updateData.name);
      expect(response.body.data.attributes.description).toBe(updateData.description);
      expect(response.body.data.attributes.priority).toBe(updateData.priority);
      expect(response.body.data.attributes.estimatedDuration).toBe(updateData.estimatedDuration);
    });

    it('should fail to update non-existent activity', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      await testContext
        .request()
        .put('/activities/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should fail to update with invalid data', async () => {
      const invalidData = {
        type: 'INVALID_TYPE',
        priority: 'INVALID_PRIORITY'
      };

      await testContext
        .request()
        .patch(`/activities/${testActivity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      await testContext
        .request()
        .patch(`/activities/${testActivity.id}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /activities/:activityId', () => {
    let testActivity: any;

    beforeEach(async () => {
      testActivity = await testContext.prisma.farmActivity.create({
        data: {
          name: 'Test Activity for Deletion',
          description: 'Test activity description',
          type: 'PLANTING',
          status: 'PLANNED',
          priority: 'NORMAL',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          estimatedDuration: 120,
          farmId: testFarm.id,
          areaId: testArea.id,
          createdById: testUser.id,
        }
      });
    });

    it('should delete activity successfully', async () => {
      const response = await testContext
        .request()
        .delete(`/activities/${testActivity.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.attributes.success).toBe(true);
      expect(response.body.data.attributes.message).toContain('cancelled successfully');

      // Verify activity is cancelled (not deleted)
      const cancelledActivity = await testContext.prisma.farmActivity.findUnique({
        where: { id: testActivity.id }
      });
      expect(cancelledActivity).toBeDefined();
      expect(cancelledActivity?.status).toBe('CANCELLED');
    });

    it('should fail to delete non-existent activity', async () => {
      await testContext
        .request()
        .delete('/activities/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .delete(`/activities/${testActivity.id}`)
        .expect(401);
    });
  });

  describe('Activity Execution Workflow', () => {
    let testActivity: any;

    beforeEach(async () => {
      testActivity = await testContext.prisma.farmActivity.create({
        data: {
          name: 'Test Activity for Execution',
          description: 'Test activity for execution workflow',
          type: 'PLANTING',
          status: 'PLANNED',
          priority: 'NORMAL',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          estimatedDuration: 120,
          farmId: testFarm.id,
          areaId: testArea.id,
          createdById: testUser.id,
        }
      });
    });

    describe('PATCH /activities/:activityId/status (Start)', () => {
      it('should start activity successfully', async () => {
        const startData = {
          data: {
            type: 'activities',
            id: testActivity.id,
            attributes: {
              status: 'IN_PROGRESS',
              executionContext: {
                startNotes: 'Starting the planting activity',
                actualResources: [
                  {
                    type: 'equipment',
                    resourceId: 'tractor-001',
                    quantity: 1,
                    unit: 'unit'
                  }
                ]
              }
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(startData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('IN_PROGRESS');
        expect(response.body.data.attributes.startedAt).toBeDefined();
        expect(response.body.data.attributes.percentComplete).toBe(0);
      });

      it('should fail to start already started activity', async () => {
        // First start
        await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: {
              type: 'activities',
              id: testActivity.id,
              attributes: {
                status: 'IN_PROGRESS',
                executionContext: { startNotes: 'Starting' }
              }
            }
          })
          .expect(200);

        // Try to start again
        await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: {
              type: 'activities',
              id: testActivity.id,
              attributes: {
                status: 'IN_PROGRESS',
                executionContext: { startNotes: 'Starting again' }
              }
            }
          })
          .expect(400);
      });

      it('should fail to start non-existent activity', async () => {
        await testContext
          .request()
          .patch('/activities/non-existent-id/status')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: {
              type: 'activities',
              id: 'non-existent-id',
              attributes: {
                status: 'IN_PROGRESS',
                executionContext: { startNotes: 'Starting' }
              }
            }
          })
          .expect(404);
      });
    });

    describe('PATCH /activities/:activityId (Progress Update)', () => {
      beforeEach(async () => {
        // Start the activity first
        await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: {
              type: 'activities',
              id: testActivity.id,
              attributes: {
                status: 'IN_PROGRESS',
                executionContext: { startNotes: 'Starting' }
              }
            }
          })
          .expect(200);
      });

      it('should update progress successfully', async () => {
        const progressData = {
          percentComplete: 50,
          notes: 'Half way through planting',
          actualResources: [
            {
              type: 'material',
              resourceId: 'corn-seeds',
              quantity: 25,
              unit: 'kg'
            }
          ]
        };

        const response = await testContext
          .request()
          .patch(`/activities/${testActivity.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(progressData)
          .expect(200);

        expect(response.body.data.attributes.percentComplete).toBe(50);
      });

      it('should fail with invalid progress percentage', async () => {
        const progressData = {
          percentComplete: 150, // Invalid percentage
          notes: 'Invalid progress'
        };

        await testContext
          .request()
          .patch(`/activities/${testActivity.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(progressData)
          .expect(400);
      });
    });

    describe('PATCH /activities/:activityId/status (Pause)', () => {
      beforeEach(async () => {
        // Start the activity first
        await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: {
              type: 'activities',
              id: testActivity.id,
              attributes: {
                status: 'IN_PROGRESS',
                executionContext: { startNotes: 'Starting' }
              }
            }
          })
          .expect(200);
      });

      it('should pause activity successfully', async () => {
        const pauseData = {
          data: {
            type: 'activities',
            id: testActivity.id,
            attributes: {
              status: 'PAUSED',
              executionContext: {
                pauseReason: 'weather',
                pauseNotes: 'Pausing due to rain',
                estimatedResumeTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
              }
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(pauseData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('PAUSED');
      });

      it('should fail to pause non-started activity', async () => {
        // Create a new activity that's not started
        const newActivity = await testContext.prisma.farmActivity.create({
          data: {
            name: 'New Activity',
            type: 'PLANTING',
            status: 'PLANNED',
            priority: 'NORMAL',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            estimatedDuration: 120,
            farmId: testFarm.id,
            createdById: testUser.id
          }
        });

        const pauseData = {
          data: {
            type: 'activities',
            id: newActivity.id,
            attributes: {
              status: 'PAUSED',
              executionContext: {
                pauseReason: 'weather',
                pauseNotes: 'Pausing'
              }
            }
          }
        };

        await testContext
          .request()
          .patch(`/activities/${newActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(pauseData)
          .expect(400);
      });
    });

    describe('PATCH /activities/:activityId/status (Resume)', () => {
      beforeEach(async () => {
        // Start and pause the activity
        await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: {
              type: 'activities',
              id: testActivity.id,
              attributes: {
                status: 'IN_PROGRESS',
                executionContext: { startNotes: 'Starting' }
              }
            }
          })
          .expect(200);

        await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: {
              type: 'activities',
              id: testActivity.id,
              attributes: {
                status: 'PAUSED',
                executionContext: {
                  pauseReason: 'weather',
                  pauseNotes: 'Pausing'
                }
              }
            }
          })
          .expect(200);
      });

      it('should resume activity successfully', async () => {
        const resumeData = {
          data: {
            type: 'activities',
            id: testActivity.id,
            attributes: {
              status: 'IN_PROGRESS',
              executionContext: {
                progressNotes: 'Resuming after weather delay'
              }
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(resumeData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('IN_PROGRESS');
      });

      it('should fail to resume non-paused activity', async () => {
        // Create a new activity that's in progress
        const newActivity = await testContext.prisma.farmActivity.create({
          data: {
            name: 'New Activity',
            type: 'PLANTING',
            status: 'IN_PROGRESS',
            priority: 'NORMAL',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            estimatedDuration: 120,
            farmId: testFarm.id,
            createdById: testUser.id
          }
        });

        const resumeData = {
          data: {
            type: 'activities',
            id: newActivity.id,
            attributes: {
              status: 'IN_PROGRESS',
              executionContext: {
                progressNotes: 'Resuming'
              }
            }
          }
        };

        await testContext
          .request()
          .patch(`/activities/${newActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(resumeData)
          .expect(400);
      });
    });

    describe('PATCH /activities/:activityId/status (Complete)', () => {
      beforeEach(async () => {
        // Start the activity first
        await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            data: {
              type: 'activities',
              id: testActivity.id,
              attributes: {
                status: 'IN_PROGRESS',
                executionContext: { startNotes: 'Starting' }
              }
            }
          })
          .expect(200);
      });

      it('should complete activity successfully', async () => {
        const completeData = {
          data: {
            type: 'activities',
            id: testActivity.id,
            attributes: {
              status: 'COMPLETED',
              executionContext: {
                actualDuration: 110,
                actualCost: 95.00,
                results: {
                  quality: 'good',
                  quantityAchieved: 100,
                  observations: 'Successfully completed planting'
                },
                issues: 'Minor equipment delay',
                recommendations: 'Consider using newer equipment next time',
                progressNotes: 'Activity completed successfully'
              }
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/activities/${testActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(completeData)
          .expect(200);

        expect(response.body.data.attributes.status).toBe('COMPLETED');
        expect(response.body.data.attributes.completedAt).toBeDefined();
        expect(response.body.data.attributes.actualDuration).toBe(110);
        expect(response.body.data.attributes.actualCost).toBe(95.00);
        expect(response.body.data.attributes.percentComplete).toBe(100);
      });

      it('should fail to complete non-started activity', async () => {
        // Create a new activity that's not started
        const newActivity = await testContext.prisma.farmActivity.create({
          data: {
            name: 'New Activity',
            type: 'PLANTING',
            status: 'PLANNED',
            priority: 'NORMAL',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            estimatedDuration: 120,
            farmId: testFarm.id,
            createdById: testUser.id
          }
        });

        const completeData = {
          data: {
            type: 'activities',
            id: newActivity.id,
            attributes: {
              status: 'COMPLETED',
              executionContext: {
                actualDuration: 120,
                progressNotes: 'Completing'
              }
            }
          }
        };

        await testContext
          .request()
          .patch(`/activities/${newActivity.id}/status`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(completeData)
          .expect(400);
      });
    });
  });

  describe('Calendar and Scheduling', () => {

    beforeEach(async () => {
      // Create multiple test activities for calendar
      await Promise.all([
        testContext.prisma.farmActivity.create({
          data: {
            name: 'Morning Planting',
            type: 'PLANTING',
            status: 'PLANNED',
            priority: 'NORMAL',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            estimatedDuration: 120,
            farmId: testFarm.id,
            areaId: testArea.id,
            createdById: testUser.id
          }
        }),
        testContext.prisma.farmActivity.create({
          data: {
            name: 'Afternoon Irrigation',
            type: 'IRRIGATION',
            status: 'PLANNED',
            priority: 'HIGH',
            scheduledAt: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
            estimatedDuration: 60,
            farmId: testFarm.id,
            areaId: testArea.id,
            createdById: testUser.id
          }
        })
      ]);
    });

    describe('GET /activities/calendar', () => {
      it('should get calendar events successfully', async () => {
        const startDate = new Date(Date.now()).toISOString();
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

        const response = await testContext
          .request()
          .get(`/activities/calendar?farmId=${testFarm.id}&startDate=${startDate}&endDate=${endDate}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.meta).toBeDefined();
        expect(response.body.meta.period).toBeDefined();
      });

      it('should filter calendar events by user', async () => {
        const startDate = new Date(Date.now()).toISOString();
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const response = await testContext
          .request()
          .get(`/activities/calendar?farmId=${testFarm.id}&startDate=${startDate}&endDate=${endDate}&userId=${testUser.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should fail without required parameters', async () => {
        await testContext
          .request()
          .get('/activities/calendar')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });
    });

    describe('GET /activities/my-tasks', () => {
      it('should get user tasks successfully', async () => {
        const response = await testContext
          .request()
          .get('/activities/my-tasks')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter tasks by status', async () => {
        const response = await testContext
          .request()
          .get('/activities/my-tasks?status=PLANNED')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        response.body.data.forEach((task: any) => {
          expect(task.attributes.status).toBe('PLANNED');
        });
      });
    });
  });

  describe('Analytics and Reporting', () => {

    beforeEach(async () => {
      // Create test activities with different statuses for analytics
      await Promise.all([
        testContext.prisma.farmActivity.create({
          data: {
            name: 'Completed Activity 1',
            type: 'PLANTING',
            status: 'COMPLETED',
            priority: 'NORMAL',
            scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            estimatedDuration: 120,
            actualDuration: 110,
            farmId: testFarm.id,
            areaId: testArea.id,
            createdById: testUser.id
          }
        }),
        testContext.prisma.farmActivity.create({
          data: {
            name: 'Completed Activity 2',
            type: 'IRRIGATION',
            status: 'COMPLETED',
            priority: 'HIGH',
            scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            estimatedDuration: 60,
            actualDuration: 55,
            farmId: testFarm.id,
            areaId: testArea.id,
            createdById: testUser.id
          }
        }),
        testContext.prisma.farmActivity.create({
          data: {
            name: 'In Progress Activity',
            type: 'FERTILIZING',
            status: 'IN_PROGRESS',
            priority: 'NORMAL',
            scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
            estimatedDuration: 90,
            farmId: testFarm.id,
            areaId: testArea.id,
            createdById: testUser.id
          }
        })
      ]);
    });

    describe('GET /activities/analytics', () => {
      it('should get analytics data successfully', async () => {
        const response = await testContext
          .request()
          .get(`/activities/analytics?farmId=${testFarm.id}&period=week`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.type).toBe('activity-analytics');
        expect(response.body.data.attributes).toBeDefined();
      });

      it('should get completion rates', async () => {
        const response = await testContext
          .request()
          .get(`/activities/completion-rates?farmId=${testFarm.id}&period=week`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.type).toBe('completion-rates');
        expect(response.body.data.attributes).toBeDefined();
      });

      it('should get cost analysis', async () => {
        const response = await testContext
          .request()
          .get(`/activities/cost-analysis?farmId=${testFarm.id}&period=week`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.type).toBe('cost-analysis');
        expect(response.body.data.attributes).toBeDefined();
      });
    });

    describe('POST /activities/reports', () => {
      it('should generate report successfully', async () => {
        const reportData = {
          reportType: 'efficiency',
          filters: {
            farmId: testFarm.id,
            dateRange: {
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            }
          },
          format: 'pdf',
          includeCharts: true
        };

        const response = await testContext
          .request()
          .post('/activities/reports')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(reportData);

        expect(response.status).toBe(202);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.attributes).toBeDefined();
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /activities/bulk-create', () => {
      it('should create multiple activities successfully', async () => {
        const activitiesData = {
          activities: [
            {
              name: 'Bulk Activity 1',
              type: 'PLANTING',
              priority: 'NORMAL',
              scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              farmId: testFarm.id,
              areaId: testArea.id
            },
            {
              name: 'Bulk Activity 2',
              type: 'IRRIGATION',
              priority: 'HIGH',
              scheduledAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
              farmId: testFarm.id,
              areaId: testArea.id
            }
          ]
        };

        const response = await testContext
          .request()
          .post('/activities/bulk-create')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(activitiesData)
          .expect(201);

        expect(response.body.data.attributes.created).toBe(2);
        expect(response.body.data.attributes.failed).toBe(0);
      });

      it('should handle partial failures in bulk create', async () => {
        const activitiesData = {
          activities: [
            {
              name: 'Valid Activity',
              type: 'PLANTING',
              priority: 'NORMAL',
              scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              farmId: testFarm.id
            },
            {
              name: 'Activity with Non-existent Farm',
              type: 'PLANTING',
              priority: 'NORMAL',
              scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              farmId: 'non-existent-farm-id' // Invalid - non-existent farm
            }
          ]
        };

        const response = await testContext
          .request()
          .post('/activities/bulk-create')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(activitiesData)
          .expect(201);


        expect(response.body.data.attributes.created).toBe(1);
        expect(response.body.data.attributes.failed).toBe(1);
      });
    });

    describe('PATCH /activities/bulk-update', () => {
      let testActivities: any[];

      beforeEach(async () => {
        testActivities = await Promise.all([
          testContext.prisma.farmActivity.create({
            data: {
              name: 'Bulk Update Activity 1',
              type: 'PLANTING',
              status: 'PLANNED',
              priority: 'NORMAL',
              scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              farmId: testFarm.id,
              createdById: testUser.id
            }
          }),
          testContext.prisma.farmActivity.create({
            data: {
              name: 'Bulk Update Activity 2',
              type: 'IRRIGATION',
              status: 'PLANNED',
              priority: 'NORMAL',
              scheduledAt: new Date(Date.now() + 25 * 60 * 60 * 1000),
              farmId: testFarm.id,
              createdById: testUser.id
            }
          })
        ]);
      });

      it('should update multiple activities successfully', async () => {
        const updateData = {
          activities: [
            {
              id: testActivities[0].id,
              updates: {
                priority: 'HIGH',
                name: 'Updated Activity 1'
              }
            },
            {
              id: testActivities[1].id,
              updates: {
                priority: 'URGENT',
                name: 'Updated Activity 2'
              }
            }
          ]
        };

        const response = await testContext
          .request()
          .patch('/activities/bulk-update')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.updated).toBe(2);
        expect(response.body.data.attributes.failed).toBe(0);
      });
    });

    describe('POST /activities/bulk-delete', () => {
      let testActivities: any[];

      beforeEach(async () => {
        testActivities = await Promise.all([
          testContext.prisma.farmActivity.create({
            data: {
              name: 'Bulk Delete Activity 1',
              type: 'PLANTING',
              status: 'PLANNED',
              priority: 'NORMAL',
              scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              farmId: testFarm.id,
              createdById: testUser.id
            }
          }),
          testContext.prisma.farmActivity.create({
            data: {
              name: 'Bulk Delete Activity 2',
              type: 'IRRIGATION',
              status: 'PLANNED',
              priority: 'NORMAL',
              scheduledAt: new Date(Date.now() + 25 * 60 * 60 * 1000),
              farmId: testFarm.id,
              createdById: testUser.id
            }
          })
        ]);
      });

      it('should delete multiple activities successfully', async () => {
        const deleteData = {
          activityIds: [testActivities[0].id, testActivities[1].id],
          reason: 'Bulk deletion test'
        };

        const response = await testContext
          .request()
          .post('/activities/bulk-delete')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(deleteData)
          .expect(200);

        expect(response.body.data.attributes.deleted).toBe(2);
        expect(response.body.data.attributes.failed).toBe(0);
      });
    });
  });

  describe('Team Assignment and Performance', () => {
    let testActivity: any;
    let testUser2: any;

    beforeEach(async () => {
      // Create a second test user for assignment tests
      const hashedPassword2 = await hash('TestPassword123!');
      testUser2 = await testContext.createUser({
        email: 'testuser2@farm.com',
        name: 'Test Farm User 2',
        phone: '+1234567891',
        hashedPassword: hashedPassword2,
        emailVerified: true,
        isActive: true,
        organizationId: testOrganization.id
      });

      // Create test activity
      testActivity = await testContext.prisma.farmActivity.create({
        data: {
          name: 'Team Assignment Activity',
          description: 'Test activity for team assignment',
          type: 'PLANTING',
          status: 'PLANNED',
          priority: 'NORMAL',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          estimatedDuration: 120,
          farmId: testFarm.id,
          areaId: testArea.id,
          createdById: testUser.id
        }
      });
    });

    describe('POST /activities/:activityId/assign', () => {
      it('should assign activity to users successfully', async () => {
        const assignData = {
          assignedTo: [testUser2.id],
          reassignReason: 'Better skill match',
          notifyUsers: true
        };

        const response = await testContext
          .request()
          .put(`/activities/${testActivity.id}/assign`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(assignData)
          .expect(200);

        expect(response.body.data.attributes.assignedTo).toContain(testUser2.id);
      });

      it('should fail to assign to non-existent user', async () => {
        const assignData = {
          assignedTo: ['non-existent-user-id'],
          reassignReason: 'Test assignment',
          notifyUsers: false
        };

        await testContext
          .request()
          .put(`/activities/${testActivity.id}/assign`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(assignData)
          .expect(400);
      });

      it('should fail to assign non-existent activity', async () => {
        const assignData = {
          assignedTo: [testUser2.id],
          reassignReason: 'Test assignment',
          notifyUsers: false
        };

        await testContext
          .request()
          .put('/activities/non-existent-id/assign')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(assignData)
          .expect(404);
      });
    });

    describe('POST /activities/:activityId/request-help', () => {
      it('should send help request successfully', async () => {
        const helpData = {
          message: 'Need assistance with equipment setup',
          skillsNeeded: ['equipment_operation', 'safety_protocols'],
          urgency: 'high'
        };

        // First assign the user to the activity so they can request help
        await testContext
          .request()
          .put(`/activities/${testActivity.id}/assign`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            assignedTo: [testUser.id],
            notifyUsers: false
          });

        const response = await testContext
          .request()
          .post(`/activities/${testActivity.id}/request-help`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(helpData)
          .expect(200);

        expect(response.body.data.attributes.success).toBe(true);
        expect(response.body.data.attributes.message).toContain('Help request sent successfully');
      });

      it('should fail to send help request for non-existent activity', async () => {
        const helpData = {
          message: 'Need assistance',
          skillsNeeded: ['equipment_operation'],
          urgency: 'normal'
        };

        await testContext
          .request()
          .post('/activities/non-existent-id/request-help')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(helpData)
          .expect(404);
      });
    });

    describe('GET /activities/team-performance', () => {
      it('should get team performance data successfully', async () => {
        const response = await testContext
          .request()
          .get(`/activities/team-performance?farmId=${testFarm.id}&period=week`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter team performance by metric', async () => {
        const response = await testContext
          .request()
          .get(`/activities/team-performance?farmId=${testFarm.id}&period=week&metric=completion`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('Activity Templates', () => {
    let testTemplate: any;

    beforeEach(async () => {
      // Create a test activity template
      testTemplate = await testContext.prisma.activityTemplate.create({
        data: {
          name: 'Corn Planting Template',
          type: 'PLANTING',
          description: 'Standard corn planting template',
          defaultDuration: 120,
          instructions: 'Plant corn seeds 2 inches deep, 6 inches apart',
          safetyNotes: 'Wear protective gear, check weather conditions',
          applicableCrops: ['CORN'],
          organizationId: testOrganization.id
        }
      });
    });

    describe('GET /activities/templates', () => {
      it('should get activity templates successfully', async () => {
        const response = await testContext
          .request()
          .get('/activities/templates')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should filter templates by type', async () => {
        const response = await testContext
          .request()
          .get('/activities/templates?type=PLANTING')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        response.body.data.forEach((template: any) => {
          expect(template.attributes.type).toBe('PLANTING');
        });
      });

      it('should search templates by name', async () => {
        const response = await testContext
          .request()
          .get('/activities/templates?search=corn')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });

    describe('GET /activities/templates/:templateId', () => {
      it('should get template details successfully', async () => {
        const response = await testContext
          .request()
          .get(`/activities/templates/${testTemplate.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.data.type).toBe('activity-templates');
        expect(response.body.data.attributes.name).toBe(testTemplate.name);
        expect(response.body.data.attributes.type).toBe(testTemplate.type);
      });

      it('should fail to get non-existent template', async () => {
        await testContext
          .request()
          .get('/activities/templates/non-existent-id')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });
    });

    describe('POST /activities/templates', () => {
      it('should create template successfully', async () => {
        const templateData = {
          name: 'Wheat Harvesting Template',
          type: 'HARVESTING',
          description: 'Standard wheat harvesting template',
          defaultDuration: 180,
          instructions: 'Harvest wheat when moisture content is below 14%',
          safetyNotes: 'Check equipment before starting, wear safety gear',
          applicableCrops: ['WHEAT'],
          defaultResources: [
            {
              type: 'equipment',
              resourceId: 'harvester-001',
              quantity: 1,
              unit: 'unit'
            }
          ]
        };

        const response = await testContext
          .request()
          .post('/activities/templates')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(templateData)
          .expect(201);

        expect(response.body.data.type).toBe('activity-templates');
        expect(response.body.data.attributes.name).toBe(templateData.name);
        expect(response.body.data.attributes.type).toBe(templateData.type);
      });

      it('should fail to create template with invalid data', async () => {
        const invalidData = {
          name: '', // Empty name
          type: 'INVALID_TYPE', // Invalid type
          description: 'Invalid template'
        };

        await testContext
          .request()
          .post('/activities/templates')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(invalidData)
          .expect(400);
      });
    });

    describe('POST /activities/from-template/:templateId', () => {
      it('should create activity from template successfully', async () => {
        const createData = {
          name: 'Corn Planting from Template',
          farmId: testFarm.id,
          areaId: testArea.id,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: 'NORMAL',
          assignedTo: [testUser.id]
        };

        const response = await testContext
          .request()
          .post(`/activities/from-template/${testTemplate.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createData)
          .expect(201);

        expect(response.body.data.type).toBe('activities');
        expect(response.body.data.attributes.name).toBe(createData.name);
        expect(response.body.data.attributes.type).toBe(testTemplate.type);
        expect(response.body.data.attributes.instructions).toBe(testTemplate.instructions);
        expect(response.body.data.attributes.safetyNotes).toBe(testTemplate.safetyNotes);
      });

      it('should fail to create from non-existent template', async () => {
        const createData = {
          name: 'Activity from Template',
          farmId: testFarm.id,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        await testContext
          .request()
          .post('/activities/from-template/non-existent-id')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createData)
          .expect(404);
      });
    });
  });

  describe('Activity Integration Tests', () => {
    it('should complete full activity lifecycle', async () => {
      // 1. Create activity
      const createData = {
        name: 'Full Lifecycle Activity',
        description: 'Test complete activity lifecycle',
        type: 'PLANTING',
        priority: 'NORMAL',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 120,
        farmId: testFarm.id,
        areaId: testArea.id,
        instructions: 'Complete lifecycle test',
        safetyNotes: 'Test safety',
        estimatedCost: 100.00
      };

      const createResponse = await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createData)
        .expect(201);

      const activityId = createResponse.body.data.attributes.id;

      // 2. Start activity
      await testContext
        .request()
        .patch(`/activities/${activityId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'activities',
            id: activityId,
            attributes: {
              status: 'IN_PROGRESS',
              executionContext: { startNotes: 'Starting lifecycle test' }
            }
          }
        })
        .expect(200);

      // 3. Update progress
      await testContext
        .request()
        .patch(`/activities/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ percentComplete: 50, notes: 'Half way through' })
        .expect(200);

      // 4. Complete activity
      const completeData = {
        data: {
          type: 'activities',
          id: activityId,
          attributes: {
            status: 'COMPLETED',
            executionContext: {
              actualDuration: 110,
              actualCost: 95.00,
              results: {
                quality: 'good',
                quantityAchieved: 100,
                observations: 'Lifecycle test completed'
              },
              progressNotes: 'Full lifecycle completed successfully'
            }
          }
        }
      };

      await testContext
        .request()
        .patch(`/activities/${activityId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(completeData)
        .expect(200);

      // 5. Verify final state
      const finalResponse = await testContext
        .request()
        .get(`/activities/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalResponse.body.data.attributes.status).toBe('COMPLETED');
      expect(finalResponse.body.data.attributes.percentComplete).toBe(100);
      expect(finalResponse.body.data.attributes.completedAt).toBeDefined();
    });

    it('should handle activity with pause and resume', async () => {
      // Create and start activity
      const createData = {
        name: 'Pause Resume Activity',
        type: 'PLANTING',
        priority: 'NORMAL',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 120,
        farmId: testFarm.id
      };

      const createResponse = await testContext
        .request()
        .post('/activities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createData)
        .expect(201);

      const activityId = createResponse.body.data.attributes.id;

      // Start
      await testContext
        .request()
        .patch(`/activities/${activityId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'activities',
            id: activityId,
            attributes: {
              status: 'IN_PROGRESS',
              executionContext: { startNotes: 'Starting' }
            }
          }
        })
        .expect(200);

      // Pause
      await testContext
        .request()
        .patch(`/activities/${activityId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'activities',
            id: activityId,
            attributes: {
              status: 'PAUSED',
              executionContext: {
                pauseReason: 'weather',
                pauseNotes: 'Pausing due to rain'
              }
            }
          }
        })
        .expect(200);

      // Resume
      await testContext
        .request()
        .patch(`/activities/${activityId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'activities',
            id: activityId,
            attributes: {
              status: 'IN_PROGRESS',
              executionContext: {
                progressNotes: 'Resuming after weather delay'
              }
            }
          }
        })
        .expect(200);

      // Complete
      await testContext
        .request()
        .patch(`/activities/${activityId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          data: {
            type: 'activities',
            id: activityId,
            attributes: {
              status: 'COMPLETED',
              executionContext: {
                actualDuration: 120,
                progressNotes: 'Completed with pause/resume'
              }
            }
          }
        })
        .expect(200);

      // Verify final state
      const finalResponse = await testContext
        .request()
        .get(`/activities/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalResponse.body.data.attributes.status).toBe('COMPLETED');
    });
  });
});
