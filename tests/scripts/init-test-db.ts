import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Minimal permissions needed for tests
const MINIMAL_PERMISSIONS = [
  { resource: 'user', action: 'create', description: 'Create new users' },
  { resource: 'user', action: 'read', description: 'View user information' },
  { resource: 'user', action: 'update', description: 'Update user information' },
  { resource: 'organization', action: 'create', description: 'Create organizations' },
  { resource: 'organization', action: 'read', description: 'View organizations' },
  { resource: 'farm', action: 'create', description: 'Create farms' },
  { resource: 'farm', action: 'read', description: 'View farms' },
];

// Minimal roles for tests (needs organizationId for unique constraint)
const MINIMAL_ROLES = [
  {
    name: 'Platform Admin',
    description: 'System administrator with full access',
    isPlatformAdmin: true,
    isSystemRole: true,
    organizationId: null,
  },
  {
    name: 'Organization Owner',
    description: 'Owner of an organization',
    isPlatformAdmin: false,
    isSystemRole: true,
    organizationId: null,
  },
];

async function initializeMinimalTestDatabase() {
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
    await prisma.$disconnect();
  }
}

initializeMinimalTestDatabase();
