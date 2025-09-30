import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('Platform Admin E2E Tests', () => {
  let testContext: TestContext;
  let platformAdminUser: any;
  let regularUser: any;
  let testOrganization: any;
  let testOrganization2: any;
  let platformAdminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up platform admin related tables before each test
    await testContext.cleanupTables([
      'user_roles',
      'roles',
      'users',
      'organizations',
      'farms',
      'orders'
    ]);

    // Create test organizations
    testOrganization = await testContext.createOrganization({
      name: 'Test Farm Organization',
      type: 'FARM_OPERATION',
      email: 'farm@test.com',
      plan: 'basic',
      features: ['farms', 'inventory'],
      allowedModules: ['farms', 'inventory']
    });

    testOrganization2 = await testContext.createOrganization({
      name: 'Test Trader Organization',
      type: 'COMMODITY_TRADER',
      email: 'trader@test.com',
      plan: 'professional',
      features: ['market', 'orders'],
      allowedModules: ['market', 'orders']
    });

    // Create platform admin user
    const hashedPassword = await hash('PlatformAdmin123!');
    platformAdminUser = await testContext.createUser({
      email: 'platform-admin@test.com',
      name: 'Platform Admin User',
      phone: '+1234567890',
      hashedPassword,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id
    });

    // Create platform admin role
    const platformAdminRole = await testContext.prisma.role.create({
      data: {
        name: 'Platform Administrator',
        description: 'Platform-wide administrator role',
        isPlatformAdmin: true,
        isSystemRole: true,
        scope: 'PLATFORM',
        level: 1000
      }
    });

    // Assign platform admin role to user
    await testContext.prisma.userRole.create({
      data: {
        userId: platformAdminUser.id,
        roleId: platformAdminRole.id,
        isActive: true
      }
    });

    // Create regular user
    const hashedPassword2 = await hash('RegularUser123!');
    regularUser = await testContext.createUser({
      email: 'regular@test.com',
      name: 'Regular User',
      phone: '+1234567891',
      hashedPassword: hashedPassword2,
      emailVerified: true,
      isActive: true,
      organizationId: testOrganization.id
    });

    // Login to get access tokens
    const platformAdminLoginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'platform-admin@test.com',
        password: 'PlatformAdmin123!'
      })
      .expect(200);

    platformAdminToken = platformAdminLoginResponse.body.data.attributes.tokens.accessToken;

    const regularUserLoginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'regular@test.com',
        password: 'RegularUser123!'
      })
      .expect(200);

    regularUserToken = regularUserLoginResponse.body.data.attributes.tokens.accessToken;

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Authorization Tests', () => {
    it('should allow platform admin to access all endpoints', async () => {
      await testContext
        .request()
        .get('/platform-admin/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);
    });

    it('should deny regular user access to platform admin endpoints', async () => {
      await testContext
        .request()
        .get('/platform-admin/organizations')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should deny access without authentication', async () => {
      await testContext
        .request()
        .get('/platform-admin/organizations')
        .expect(401);
    });
  });

  describe('GET /platform-admin/organizations', () => {
    it('should get all organizations with pagination', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/organizations')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(20);
      expect(response.body.meta.pages).toBe(1);
    });

    it('should filter organizations by type', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/organizations?type=FARM_OPERATION')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('FARM_OPERATION');
    });

    it('should filter organizations by active status', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/organizations?isActive=true')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(org => org.isActive)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/organizations?page=1&limit=1')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(1);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.pages).toBe(2);
    });
  });

  describe('PATCH /platform-admin/organizations/:id (Consolidated Update)', () => {
    describe('Status Management', () => {
      it('should suspend an organization successfully', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization2.id,
            attributes: {
              status: 'suspended',
              suspensionReason: 'Violation of terms of service and multiple complaints'
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.suspendedAt).toBeDefined();
        expect(response.body.data.attributes.suspensionReason).toBe(updateData.data.attributes.suspensionReason);
        expect(response.body.data.attributes.isActive).toBe(false);
      });

      it('should reactivate a suspended organization', async () => {
        // First suspend the organization
        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send({
            data: {
              type: 'organizations',
              id: testOrganization2.id,
              attributes: {
                status: 'suspended',
                suspensionReason: 'Test suspension for reactivation'
              }
            }
          })
          .expect(200);

        // Then reactivate
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization2.id,
            attributes: {
              status: 'active'
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.suspendedAt).toBeNull();
        expect(response.body.data.attributes.suspensionReason).toBeNull();
        expect(response.body.data.attributes.isActive).toBe(true);
      });

      it('should fail to suspend without reason', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization2.id,
            attributes: {
              status: 'suspended'
            }
          }
        };

        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(400);
      });

      it('should fail to suspend already suspended organization', async () => {
        // First suspend
        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send({
            data: {
              type: 'organizations',
              id: testOrganization2.id,
              attributes: {
                status: 'suspended',
                suspensionReason: 'First suspension reason'
              }
            }
          })
          .expect(200);

        // Try to suspend again
        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send({
            data: {
              type: 'organizations',
              id: testOrganization2.id,
              attributes: {
                status: 'suspended',
                suspensionReason: 'Second suspension reason'
              }
            }
          })
          .expect(400);
      });

      it('should fail to reactivate non-suspended organization', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              status: 'active'
            }
          }
        };

        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(400);
      });
    });

    describe('Verification Management', () => {
      it('should verify an organization', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization2.id,
            attributes: {
              isVerified: true
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.isVerified).toBe(true);
        expect(response.body.data.attributes.verifiedAt).toBeDefined();
        expect(response.body.data.attributes.verifiedBy).toBe(platformAdminUser.id);
      });

      it('should unverify an organization', async () => {
        // First verify
        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send({
            data: {
              type: 'organizations',
              id: testOrganization2.id,
              attributes: {
                isVerified: true
              }
            }
          })
          .expect(200);

        // Then unverify
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization2.id,
            attributes: {
              isVerified: false
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.isVerified).toBe(false);
        expect(response.body.data.attributes.verifiedAt).toBeNull();
        expect(response.body.data.attributes.verifiedBy).toBeNull();
      });

      it('should fail to verify already verified organization', async () => {
        // First verify
        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send({
            data: {
              type: 'organizations',
              id: testOrganization2.id,
              attributes: {
                isVerified: true
              }
            }
          })
          .expect(200);

        // Try to verify again
        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send({
            data: {
              type: 'organizations',
              id: testOrganization2.id,
              attributes: {
                isVerified: true
              }
            }
          })
          .expect(400);
      });
    });

    describe('Organization Type Management', () => {
      it('should change organization type', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              organizationType: 'INTEGRATED_FARM'
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.type).toBe('INTEGRATED_FARM');
        expect(response.body.data.attributes.allowedModules).toBeDefined();
        expect(response.body.data.attributes.features).toBeDefined();
      });

      it('should fail to change to same type', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              organizationType: 'FARM_OPERATION'
            }
          }
        };

        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(400);
      });

      it('should fail with invalid organization type', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              organizationType: 'INVALID_TYPE'
            }
          }
        };

        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(400);
      });
    });

    describe('Plan Management', () => {
      it('should update organization plan', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              plan: 'enterprise'
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.plan).toBe('enterprise');
        expect(response.body.data.attributes.allowedModules).toBeDefined();
        expect(response.body.data.attributes.features).toBeDefined();
      });

      it('should fail with invalid plan', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              plan: 'invalid_plan'
            }
          }
        };

        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(400);
      });
    });

    describe('Feature Management', () => {
      it('should enable a feature for organization', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              features: {
                analytics: true
              }
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.features).toContain('analytics');
      });

      it('should disable a feature for organization', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              features: {
                farms: false
              }
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.features).not.toContain('farms');
      });

      it('should fail to enable feature not available for organization type', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization.id,
            attributes: {
              features: {
                market: true // Not available for FARM_OPERATION
              }
            }
          }
        };

        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(400);
      });
    });

    describe('Combined Updates', () => {
      it('should handle multiple updates in a single request', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: testOrganization2.id,
            attributes: {
              isVerified: true,
              plan: 'professional',
              features: {
                analytics: true,
                orders: false
              }
            }
          }
        };

        const response = await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization2.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.attributes.isVerified).toBe(true);
        expect(response.body.data.attributes.plan).toBe('professional');
        expect(response.body.data.attributes.features).toContain('analytics');
        expect(response.body.data.attributes.features).not.toContain('orders');
      });
    });

    describe('Error Handling', () => {
      it('should fail to update non-existent organization', async () => {
        const updateData = {
          data: {
            type: 'organizations',
            id: 'non-existent-id',
            attributes: {
              isVerified: true
            }
          }
        };

        await testContext
          .request()
          .patch('/platform-admin/organizations/non-existent-id')
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(404);
      });

      it('should fail with invalid JSON:API format', async () => {
        const updateData = {
          isVerified: true // Missing data wrapper
        };

        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(400);
      });

      it('should fail with invalid organization type in data', async () => {
        const updateData = {
          data: {
            type: 'invalid-type',
            id: testOrganization.id,
            attributes: {
              isVerified: true
            }
          }
        };

        await testContext
          .request()
          .patch(`/platform-admin/organizations/${testOrganization.id}`)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .send(updateData)
          .expect(400);
      });
    });
  });

  describe('GET /platform-admin/analytics', () => {
    it('should get system analytics', async () => {
      const response = await testContext
        .request()
        .get('/platform-admin/analytics')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.organizations).toBeDefined();
      expect(response.body.organizations.total).toBe(2);
      expect(response.body.organizations.active).toBe(2);
      expect(response.body.organizations.suspended).toBe(0);
      expect(response.body.organizations.byType).toBeDefined();
      expect(response.body.users).toBeDefined();
      expect(response.body.users.total).toBe(2);
      expect(response.body.users.active).toBe(2);
      expect(response.body.farms).toBeDefined();
      expect(response.body.orders).toBeDefined();
    });
  });

  describe('GET /platform-admin/users/:id', () => {
    it('should get user details', async () => {
      const response = await testContext
        .request()
        .get(`/platform-admin/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.id).toBe(regularUser.id);
      expect(response.body.email).toBe(regularUser.email);
      expect(response.body.name).toBe(regularUser.name);
      expect(response.body.organization).toBeDefined();
      expect(response.body.userRoles).toBeDefined();
    });

    it('should fail to get details for non-existent user', async () => {
      await testContext
        .request()
        .get('/platform-admin/users/non-existent-id')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await testContext
        .request()
        .post(`/platform-admin/organizations/${testOrganization.id}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({})
        .expect(400);
    });

    it('should handle invalid UUID format', async () => {
      await testContext
        .request()
        .get('/platform-admin/users/invalid-uuid')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404);
    });
  });
});
