import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyInitialization() {
  try {
    console.log('🔍 Verifying database initialization...\n');

    // Check permissions
    const permissionCount = await prisma.permission.count();
    console.log(`✅ Permissions: ${permissionCount} created`);

    // Check roles
    const roleCount = await prisma.role.count();
    console.log(`✅ Roles: ${roleCount} created`);

    // Check organizations
    const orgCount = await prisma.organization.count();
    console.log(`✅ Organizations: ${orgCount} created`);

    // Check users
    const userCount = await prisma.user.count();
    console.log(`✅ Users: ${userCount} created`);

    // Check farms
    const farmCount = await prisma.farm.count();
    console.log(`✅ Farms: ${farmCount} created`);

    // Check commodities
    const commodityCount = await prisma.commodity.count();
    console.log(`✅ Commodities: ${commodityCount} created`);

    // Check user roles
    const userRoleCount = await prisma.userRole.count();
    console.log(`✅ User Role Assignments: ${userRoleCount} created`);

    // Check role permissions
    const rolePermissionCount = await prisma.rolePermission.count();
    console.log(`✅ Role Permission Assignments: ${rolePermissionCount} created`);

    // Show sample users
    console.log('\n👤 Sample Users:');
    const users = await prisma.user.findMany({
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    users.forEach(user => {
      const roles = user.userRoles.map(ur => ur.role.name).join(', ');
      console.log(`   • ${user.email} (${roles}) - ${user.organization.name}`);
    });

    // Show organizations
    console.log('\n🏢 Organizations:');
    const orgs = await prisma.organization.findMany();
    orgs.forEach(org => {
      console.log(`   • ${org.name} (${org.type}) - ${org.plan} plan`);
    });

    // Show roles
    console.log('\n👥 System Roles:');
    const roles = await prisma.role.findMany({
      where: { isSystemRole: true },
      orderBy: { level: 'desc' }
    });
    roles.forEach(role => {
      console.log(`   • ${role.name} (Level ${role.level}) - ${role.description}`);
    });

    console.log('\n🎉 Database initialization verification completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${permissionCount} permissions`);
    console.log(`   • ${roleCount} roles`);
    console.log(`   • ${orgCount} organizations`);
    console.log(`   • ${userCount} users`);
    console.log(`   • ${farmCount} farms`);
    console.log(`   • ${commodityCount} commodities`);
    console.log(`   • ${userRoleCount} user role assignments`);
    console.log(`   • ${rolePermissionCount} role permission assignments`);

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyInitialization();
}

export { verifyInitialization };
