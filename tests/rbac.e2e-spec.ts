import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';

describe('RBAC E2E Tests', () => {
  let testContext: TestContext;

  // Test users with different roles
  let adminUser: any;
  let managerUser: any;
  let employeeUser: any;
  let adminAccessToken: string;
  let employeeAccessToken: string;
  
  // Test roles and permissions
  let customRole: any;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up RBAC-related tables before each test
    await testContext.cleanupTables([
      'role_permissions',
      'user_roles', 
      'permissions',
      'roles',
      'users',
      'organizations'
    ]);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create test organization
    const organization = await testContext.createOrganization({
      name: 'RBAC Test Org',
      type: 'FARM_OPERATION',
      email: 'rbac@test.com',
      phone: '+1234567890',
    });

    // Create test users with different roles
    const hashedPassword = await hash('TestPassword123!');
    
    // Admin user
    adminUser = await testContext.createUser({
      email: 'admin@rbactest.com',
      name: 'Admin User',
      hashedPassword,
      organizationId: organization.id,
      isActive: true,
      emailVerified: true,
    });

    // Manager user
    managerUser = await testContext.createUser({
      email: 'manager@rbactest.com',
      name: 'Manager User',
      hashedPassword,
      organizationId: organization.id,
      isActive: true,
      emailVerified: true,
    });

    // Employee user
    employeeUser = await testContext.createUser({
      email: 'employee@rbactest.com',
      name: 'Employee User',
      hashedPassword,
      organizationId: organization.id,
      isActive: true,
      emailVerified: true,
    });

    // Create test roles and permissions
    await testContext.seedBasicRbacData(organization.id);

    // Get roles to assign to users
    const adminRole = await testContext.prisma.role.findFirst({
      where: { name: 'Admin', organizationId: organization.id }
    });
    const managerRole = await testContext.prisma.role.findFirst({
      where: { name: 'Manager', organizationId: organization.id }
    });
    const employeeRole = await testContext.prisma.role.findFirst({
      where: { name: 'Employee', organizationId: organization.id }
    });

    // Assign roles to users
    if (adminRole) {
      await testContext.prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
          isActive: true,
          assignedBy: adminUser.id,
        }
      });
    }

    if (managerRole) {
      await testContext.prisma.userRole.create({
        data: {
          userId: managerUser.id,
          roleId: managerRole.id,
          isActive: true,
          assignedBy: adminUser.id,
        }
      });
    }

    if (employeeRole) {
      await testContext.prisma.userRole.create({
        data: {
          userId: employeeUser.id,
          roleId: employeeRole.id,
          isActive: true,
          assignedBy: adminUser.id,
        }
      });
    }

    // Get access tokens for each user
    const adminLogin = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'admin@rbactest.com',
        password: 'TestPassword123!'
      })
      .expect(200);
    adminAccessToken = adminLogin.body.data.attributes.tokens.accessToken;

    await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'manager@rbactest.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    const employeeLogin = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'employee@rbactest.com',
        password: 'TestPassword123!'
      })
      .expect(200);
    employeeAccessToken = employeeLogin.body.data.attributes.tokens.accessToken;
  });

  // =============================================================================
  // Role Management Tests
  // =============================================================================

  describe('GET /rbac/roles', () => {
    it('should get all roles for admin user', async () => {
      const response = await testContext
        .request()
        .get('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Should include system roles
      const roleNames = response.body.data.map((role: any) => role.attributes.name);
      expect(roleNames).toContain('Admin');
    });

    it('should filter roles by query parameters', async () => {
      const response = await testContext
        .request()
        .get('/rbac/roles?isSystemRole=true')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      // All returned roles should be system roles
      response.body.data.forEach((role: any) => {
        expect(role.attributes.isSystemRole).toBe(true);
      });
    });

    it('should deny access to unauthorized user', async () => {
      await testContext
        .request()
        .get('/rbac/roles')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(403);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/rbac/roles')
        .expect(401);
    });
  });

  describe('POST /rbac/roles', () => {
    it('should create a new custom role', async () => {
      const roleData = {
        name: 'Custom Manager',
        description: 'Custom manager role for testing',
        level: 50,
      };

      const response = await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleData)
        .expect(201);

      expect(response.body.data.type).toBe('role');
      expect(response.body.data.attributes.name).toBe(roleData.name);
      expect(response.body.data.attributes.description).toBe(roleData.description);
      expect(response.body.data.attributes.level).toBe(roleData.level);
      expect(response.body.data.attributes.isSystemRole).toBe(false);

      customRole = response.body.data;
    });

    it('should fail to create role with duplicate name', async () => {
      const roleData = {
        name: 'Admin', // System role name
        description: 'Duplicate admin role',
        level: 90,
      };

      await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleData)
        .expect(409);
    });

    it('should fail with invalid role data', async () => {
      const invalidRoleData = {
        name: '', // Empty name
        description: 'Invalid role',
        level: -1, // Invalid level
      };

      await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(invalidRoleData)
        .expect(400);
    });

    it('should deny access to non-admin user', async () => {
      const roleData = {
        name: 'Unauthorized Role',
        description: 'Should not be created',
        level: 30,
      };

      await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .send(roleData)
        .expect(403);
    });
  });

  describe('GET /rbac/roles/:roleId', () => {
    beforeEach(async () => {
      // Create a test role first
      const roleData = {
        name: 'Test Role',
        description: 'Role for get tests',
        level: 40,
      };

      const response = await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleData)
        .expect(201);

      customRole = response.body.data;
    });

    it('should get role by ID', async () => {
      const response = await testContext
        .request()
        .get(`/rbac/roles/${customRole.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('role');
      expect(response.body.data.id).toBe(customRole.id);
      expect(response.body.data.attributes.name).toBe('Test Role');
    });

    it('should return 404 for non-existent role', async () => {
      const nonExistentId = 'non-existent-role-id';
      
      await testContext
        .request()
        .get(`/rbac/roles/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    it('should deny access to unauthorized user', async () => {
      await testContext
        .request()
        .get(`/rbac/roles/${customRole.id}`)
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(403);
    });
  });

  describe('PUT /rbac/roles/:roleId', () => {
    beforeEach(async () => {
      // Create a test role first
      const roleData = {
        name: 'Updatable Role',
        description: 'Role for update tests',
        level: 35,
      };

      const response = await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleData)
        .expect(201);

      customRole = response.body.data;
    });

    it('should update custom role', async () => {
      const updateData = {
        name: 'Updated Role Name',
        description: 'Updated description',
        level: 45,
      };

      const response = await testContext
        .request()
        .put(`/rbac/roles/${customRole.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe(updateData.name);
      expect(response.body.data.attributes.description).toBe(updateData.description);
      expect(response.body.data.attributes.level).toBe(updateData.level);
    });

    it('should fail to update system role', async () => {
      // Get admin role ID
      const rolesResponse = await testContext
        .request()
        .get('/rbac/roles?isSystemRole=true')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const adminRole = rolesResponse.body.data.find((role: any) => 
        role.attributes.name === 'Admin'
      );

      const updateData = {
        name: 'Modified Admin',
        description: 'Should not be allowed',
        level: 100,
      };

      await testContext
        .request()
        .put(`/rbac/roles/${adminRole.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent role', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        level: 30,
      };

      await testContext
        .request()
        .put('/rbac/roles/non-existent-id')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should deny access to unauthorized user', async () => {
      const updateData = {
        name: 'Unauthorized Update',
        description: 'Should not work',
        level: 30,
      };

      await testContext
        .request()
        .put(`/rbac/roles/${customRole.id}`)
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('DELETE /rbac/roles/:roleId', () => {
    beforeEach(async () => {
      // Create a test role first
      const roleData = {
        name: 'Deletable Role',
        description: 'Role for delete tests',
        level: 25,
      };

      const response = await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleData)
        .expect(201);

      customRole = response.body.data;
    });

    it('should delete custom role', async () => {
      const response = await testContext
        .request()
        .delete(`/rbac/roles/${customRole.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('roles');
      expect(response.body.data.attributes.message).toContain('deleted');

      // Verify role is deleted
      await testContext
        .request()
        .get(`/rbac/roles/${customRole.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    it('should fail to delete system role', async () => {
      // Get admin role ID
      const rolesResponse = await testContext
        .request()
        .get('/rbac/roles?isSystemRole=true')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const adminRole = rolesResponse.body.data.find((role: any) => 
        role.attributes.name === 'Admin'
      );

      await testContext
        .request()
        .delete(`/rbac/roles/${adminRole.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent role', async () => {
      await testContext
        .request()
        .delete('/rbac/roles/non-existent-id')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    it('should deny access to unauthorized user', async () => {
      await testContext
        .request()
        .delete(`/rbac/roles/${customRole.id}`)
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(403);
    });
  });

  // =============================================================================
  // Permission Management Tests
  // =============================================================================

  describe('GET /rbac/permissions', () => {
    it('should get all permissions', async () => {
      const response = await testContext
        .request()
        .get('/rbac/permissions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check permission structure
      const permission = response.body.data[0];
      expect(permission.type).toBe('permission');
      expect(permission.attributes).toHaveProperty('resource');
      expect(permission.attributes).toHaveProperty('action');
    });

    it('should filter permissions by resource', async () => {
      const response = await testContext
        .request()
        .get('/rbac/permissions?resource=user')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      // All returned permissions should be for 'user' resource
      response.body.data.forEach((permission: any) => {
        expect(permission.attributes.resource).toBe('user');
      });
    });

    it('should deny access to unauthorized user', async () => {
      await testContext
        .request()
        .get('/rbac/permissions')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(403);
    });
  });

  // =============================================================================
  // Permission Checking Tests
  // =============================================================================

  describe('POST /rbac/check-permission', () => {
    it('should check single permission for admin user', async () => {
      const permissionCheck = {
        resource: 'role',
        action: 'create',
      };

      const response = await testContext
        .request()
        .post('/rbac/check-permission')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(permissionCheck)
        .expect(200);

      expect(response.body.data.type).toBe('permission-check');
      expect(response.body.data.attributes.granted).toBe(true);
      expect(response.body.data.attributes.resource).toBe('role');
      expect(response.body.data.attributes.action).toBe('create');
    });

    it('should deny permission for unauthorized action', async () => {
      const permissionCheck = {
        resource: 'role',
        action: 'create',
      };

      const response = await testContext
        .request()
        .post('/rbac/check-permission')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .send(permissionCheck)
        .expect(200);

      expect(response.body.data.attributes.granted).toBe(false);
    });

    it('should fail with invalid permission check data', async () => {
      const invalidCheck = {
        resource: '', // Empty resource
        action: 'create',
      };

      await testContext
        .request()
        .post('/rbac/check-permission')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(invalidCheck)
        .expect(400);
    });
  });

  describe('POST /rbac/check-permissions', () => {
    it('should check multiple permissions', async () => {
      const permissionsCheck = {
        permissions: [
          { resource: 'role', action: 'create' },
          { resource: 'role', action: 'read' },
          { resource: 'user', action: 'read' },
        ],
      };

      const response = await testContext
        .request()
        .post('/rbac/check-permissions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(permissionsCheck)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(3);
      
      response.body.data.forEach((check: any) => {
        expect(check.type).toBe('permission-check');
        expect(check.attributes).toHaveProperty('granted');
        expect(check.attributes).toHaveProperty('resource');
        expect(check.attributes).toHaveProperty('action');
      });
    });

    it('should handle empty permissions array', async () => {
      const permissionsCheck = {
        permissions: [],
      };

      const response = await testContext
        .request()
        .post('/rbac/check-permissions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(permissionsCheck)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('GET /rbac/user-permissions', () => {
    it('should get current user permissions', async () => {
      const response = await testContext
        .request()
        .get('/rbac/user-permissions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check permission structure
      const permission = response.body.data[0];
      expect(permission.type).toBe('permission');
      expect(permission.attributes).toHaveProperty('resource');
      expect(permission.attributes).toHaveProperty('action');
      expect(permission.attributes).toHaveProperty('granted');
    });

    it('should filter user permissions by resource', async () => {
      const response = await testContext
        .request()
        .get('/rbac/user-permissions?resource=role')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      // All returned permissions should be for 'role' resource
      response.body.data.forEach((permission: any) => {
        expect(permission.attributes.resource).toBe('role');
      });
    });
  });

  // =============================================================================
  // User Role Management Tests
  // =============================================================================

  describe('GET /rbac/users/:userId/roles', () => {
    it('should get user roles', async () => {
      const response = await testContext
        .request()
        .get(`/rbac/users/${adminUser.id}/roles`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const userRole = response.body.data[0];
        expect(userRole.type).toBe('user-role');
        expect(userRole.attributes).toHaveProperty('userId');
        expect(userRole.attributes).toHaveProperty('roleId');
        expect(userRole.attributes).toHaveProperty('isActive');
      }
    });

    it('should return 404 for non-existent user', async () => {
      await testContext
        .request()
        .get('/rbac/users/non-existent-user-id/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    it('should deny access to unauthorized user viewing other user roles', async () => {
      await testContext
        .request()
        .get(`/rbac/users/${adminUser.id}/roles`)
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .expect(403);
    });
  });

  // =============================================================================
  // Bulk Operations Tests
  // =============================================================================

  describe('POST /rbac/bulk/assign-roles', () => {
    beforeEach(async () => {
      // Create a test role for bulk assignment
      const roleData = {
        name: 'Bulk Test Role',
        description: 'Role for bulk assignment tests',
        level: 20,
      };

      const response = await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleData)
        .expect(201);

      customRole = response.body.data;
    });

    it('should bulk assign role to multiple users', async () => {
      const bulkAssignment = {
        roleId: customRole.id,
        userIds: [managerUser.id, employeeUser.id],
        isActive: true,
      };

      const response = await testContext
        .request()
        .post('/rbac/bulk/assign-roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(bulkAssignment)
        .expect(200);

      expect(response.body.data.type).toBe('bulk-operation');
      expect(response.body.data.attributes.successCount).toBe(2);
      expect(response.body.data.attributes.failureCount).toBe(0);
      expect(response.body.data.attributes.results).toHaveLength(2);
    });

    it('should handle partial failures in bulk assignment', async () => {
      const bulkAssignment = {
        roleId: customRole.id,
        userIds: [managerUser.id, 'non-existent-user-id'],
        isActive: true,
      };

      const response = await testContext
        .request()
        .post('/rbac/bulk/assign-roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(bulkAssignment)
        .expect(200);

      expect(response.body.data.attributes.successCount).toBe(1);
      expect(response.body.data.attributes.failureCount).toBe(1);
      expect(response.body.data.attributes.results).toHaveLength(2);
    });

    it('should fail with non-existent role', async () => {
      const bulkAssignment = {
        roleId: 'non-existent-role-id',
        userIds: [managerUser.id],
        isActive: true,
      };

      await testContext
        .request()
        .post('/rbac/bulk/assign-roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(bulkAssignment)
        .expect(404);
    });

    it('should deny access to unauthorized user', async () => {
      const bulkAssignment = {
        roleId: customRole.id,
        userIds: [managerUser.id],
        isActive: true,
      };

      await testContext
        .request()
        .post('/rbac/bulk/assign-roles')
        .set('Authorization', `Bearer ${employeeAccessToken}`)
        .send(bulkAssignment)
        .expect(403);
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('RBAC Integration Tests', () => {
    it('should complete full role lifecycle', async () => {
      // 1. Create custom role
      const roleData = {
        name: 'Integration Test Role',
        description: 'Full lifecycle test role',
        level: 30,
      };

      const createResponse = await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleData)
        .expect(201);

      const roleId = createResponse.body.data.id;

      // 2. Get the created role
      await testContext
        .request()
        .get(`/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // 3. Update the role
      const updateData = {
        name: 'Updated Integration Role',
        description: 'Updated description',
        level: 35,
      };

      await testContext
        .request()
        .put(`/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(200);

      // 4. Assign role to user
      const bulkAssignment = {
        roleId: roleId,
        userIds: [employeeUser.id],
        isActive: true,
      };

      await testContext
        .request()
        .post('/rbac/bulk/assign-roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(bulkAssignment)
        .expect(200);

      // 5. Verify user has role
      const userRolesResponse = await testContext
        .request()
        .get(`/rbac/users/${employeeUser.id}/roles`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const assignedRole = userRolesResponse.body.data.find((ur: any) => 
        ur.attributes.roleId === roleId
      );
      expect(assignedRole).toBeDefined();
      expect(assignedRole.attributes.isActive).toBe(true);

      // 6. Delete the role (should fail if user is assigned)
      await testContext
        .request()
        .delete(`/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(400); // Should fail because role is in use
    });

    it('should handle permission inheritance through roles', async () => {
      // 1. Create a custom role
      const roleData = {
        name: 'Permission Test Role',
        description: 'Role for testing permission inheritance',
        level: 40,
      };

      const roleResponse = await testContext
        .request()
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleData)
        .expect(201);

      const roleId = roleResponse.body.data.id;

      // 2. Assign role to user
      const bulkAssignment = {
        roleId: roleId,
        userIds: [managerUser.id],
        isActive: true,
      };

      await testContext
        .request()
        .post('/rbac/bulk/assign-roles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(bulkAssignment)
        .expect(200);

      // 3. Get manager login token (to test with updated roles)
      const managerLogin = await testContext
        .request()
        .post('/auth/login')
        .send({
          email: 'manager@rbactest.com',
          password: 'TestPassword123!'
        })
        .expect(200);
      
      const updatedManagerToken = managerLogin.body.data.attributes.tokens.accessToken;

      // 4. Check user's permissions
      const permissionsResponse = await testContext
        .request()
        .get('/rbac/user-permissions')
        .set('Authorization', `Bearer ${updatedManagerToken}`)
        .expect(200);

      expect(permissionsResponse.body.data).toBeInstanceOf(Array);
    });
  });
});
