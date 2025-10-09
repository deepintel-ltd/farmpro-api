import { PrismaClient } from '@prisma/client';

// Comprehensive permissions needed for tests
const MINIMAL_PERMISSIONS = [
  // User permissions
  { resource: 'user', action: 'create', description: 'Create new users' },
  { resource: 'user', action: 'read', description: 'View user information' },
  { resource: 'user', action: 'update', description: 'Update user information' },
  
  // Organization permissions
  { resource: 'organization', action: 'create', description: 'Create organizations' },
  { resource: 'organization', action: 'read', description: 'View organizations' },
  { resource: 'organization', action: 'update', description: 'Update organizations' },
  { resource: 'organization', action: 'delete', description: 'Delete organizations' },
  { resource: 'organization', action: 'export', description: 'Export organization data' },
  { resource: 'organization', action: 'backup', description: 'Backup organization data' },
  
  // Farm permissions
  { resource: 'farm', action: 'create', description: 'Create farms' },
  { resource: 'farm', action: 'read', description: 'View farms' },
  { resource: 'farm', action: 'update', description: 'Update farms' },
  { resource: 'farm', action: 'delete', description: 'Delete farms' },
  
  // Activity permissions
  { resource: 'activities', action: 'read', description: 'View activities' },
  { resource: 'activities', action: 'create', description: 'Create activities' },
  { resource: 'activities', action: 'update', description: 'Update activities' },
  { resource: 'activities', action: 'delete', description: 'Delete activities' },
  { resource: 'activities', action: 'execute', description: 'Execute activities' },
  { resource: 'activities', action: 'assign', description: 'Assign activities' },
  { resource: 'activities', action: 'bulk_schedule', description: 'Bulk schedule activities' },
  
  // Order permissions
  { resource: 'orders', action: 'read', description: 'View orders' },
  { resource: 'orders', action: 'create', description: 'Create orders' },
  { resource: 'orders', action: 'update', description: 'Update orders' },
  { resource: 'orders', action: 'delete', description: 'Delete orders' },
  
  // Inventory permissions
  { resource: 'inventory', action: 'read', description: 'View inventory' },
  { resource: 'inventory', action: 'create', description: 'Create inventory' },
  { resource: 'inventory', action: 'update', description: 'Update inventory' },
  { resource: 'inventory', action: 'delete', description: 'Delete inventory' },
  
  // Marketplace permissions
  { resource: 'marketplace', action: 'browse', description: 'Browse marketplace' },
  { resource: 'marketplace', action: 'read', description: 'View marketplace' },
  { resource: 'marketplace', action: 'create', description: 'Create marketplace items' },
  { resource: 'marketplace', action: 'update', description: 'Update marketplace items' },
  { resource: 'marketplace', action: 'delete', description: 'Delete marketplace items' },
  { resource: 'marketplace', action: 'create_listing', description: 'Create marketplace listings' },
  { resource: 'marketplace', action: 'generate_contract', description: 'Generate contracts' },
  
  // Analytics permissions
  { resource: 'analytics', action: 'read', description: 'View analytics' },
  { resource: 'analytics', action: 'export', description: 'Export analytics' },
  
  // Intelligence permissions
  { resource: 'intelligence', action: 'read', description: 'View intelligence' },
  { resource: 'intelligence', action: 'create', description: 'Create intelligence' },
  
  // Media permissions
  { resource: 'media', action: 'read', description: 'View media' },
  { resource: 'media', action: 'create', description: 'Create media' },
  { resource: 'media', action: 'update', description: 'Update media' },
  { resource: 'media', action: 'delete', description: 'Delete media' },
  
  // RBAC permissions
  { resource: 'rbac', action: 'read', description: 'View RBAC' },
  { resource: 'rbac', action: 'create', description: 'Create RBAC' },
  { resource: 'rbac', action: 'update', description: 'Update RBAC' },
  { resource: 'rbac', action: 'delete', description: 'Delete RBAC' },
];

// Minimal roles for tests (needs organizationId for unique constraint)
const MINIMAL_ROLES = [
  {
    name: 'Platform Admin',
    description: 'System administrator with full access',
    isPlatformAdmin: true,
    isSystemRole: true,
    organizationId: null,
    scope: 'PLATFORM' as const,
  },
  {
    name: 'Organization Owner',
    description: 'Owner of an organization',
    isPlatformAdmin: false,
    isSystemRole: true,
    organizationId: null,
    scope: 'ORGANIZATION' as const,
  },
];

async function initializeMinimalTestDatabase(prismaClient?: PrismaClient) {
  const prisma = prismaClient || new PrismaClient();
  try {
    console.log('🔧 Initializing minimal test database...');

    // Initialize permissions
    console.log('🔑 Initializing minimal permissions...');
    const permissionMap = new Map();

    for (const perm of MINIMAL_PERMISSIONS) {
      const permission = await prisma.permission.upsert({
        where: {
          resource_action: {
            resource: perm.resource,
            action: perm.action,
          },
        },
        update: {},
        create: perm,
      });
      permissionMap.set(`${perm.resource}:${perm.action}`, permission.id);
    }
    console.log(`✅ Created ${MINIMAL_PERMISSIONS.length} permissions`);

    // Initialize roles
    console.log('👥 Initializing minimal roles...');

    for (const role of MINIMAL_ROLES) {
      // Check if role exists
      let createdRole = await prisma.role.findFirst({
        where: {
          name: role.name,
          organizationId: null,
        },
      });

      // Create if it doesn't exist
      if (!createdRole) {
        createdRole = await prisma.role.create({
          data: role,
        });
      }

      // Assign all permissions to roles for simplicity in tests
      const permissionIds = Array.from(permissionMap.values());

      for (const permissionId of permissionIds) {
        const exists = await prisma.rolePermission.findFirst({
          where: {
            roleId: createdRole.id,
            permissionId: permissionId,
          },
        });

        if (!exists) {
          await prisma.rolePermission.create({
            data: {
              roleId: createdRole.id,
              permissionId: permissionId,
            },
          });
        }
      }
    }
    console.log(`✅ Created ${MINIMAL_ROLES.length} roles`);

    console.log('✅ Minimal test database initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing test database:', error);
    throw error;
  } finally {
    // Only disconnect if this script is run directly, not when imported
    if (require.main === module) {
      await prisma.$disconnect();
    }
  }
}

// Only run if this script is executed directly, not when imported
if (require.main === module) {
  initializeMinimalTestDatabase();
}

export { initializeMinimalTestDatabase };
