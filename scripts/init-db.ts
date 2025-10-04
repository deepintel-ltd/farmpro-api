import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

// =============================================================================
// PERMISSIONS INITIALIZATION
// =============================================================================

const SYSTEM_PERMISSIONS = [
  // User Management
  { resource: 'user', action: 'create', description: 'Create new users' },
  { resource: 'user', action: 'read', description: 'View user information' },
  { resource: 'user', action: 'update', description: 'Update user information' },
  { resource: 'user', action: 'delete', description: 'Delete users' },
  { resource: 'user', action: 'manage', description: 'Full user management' },

  // Organization Management
  { resource: 'organization', action: 'create', description: 'Create organizations' },
  { resource: 'organization', action: 'read', description: 'View organization information' },
  { resource: 'organization', action: 'update', description: 'Update organization settings' },
  { resource: 'organization', action: 'delete', description: 'Delete organizations' },
  { resource: 'organization', action: 'manage', description: 'Full organization management' },

  // Farm Management
  { resource: 'farm', action: 'create', description: 'Create farms' },
  { resource: 'farm', action: 'read', description: 'View farm information' },
  { resource: 'farm', action: 'update', description: 'Update farm details' },
  { resource: 'farm', action: 'delete', description: 'Delete farms' },
  { resource: 'farm', action: 'manage', description: 'Full farm management' },

  // Activity Management
  { resource: 'activity', action: 'create', description: 'Create farm activities' },
  { resource: 'activity', action: 'read', description: 'View activities' },
  { resource: 'activity', action: 'update', description: 'Update activities' },
  { resource: 'activity', action: 'delete', description: 'Delete activities' },
  { resource: 'activity', action: 'assign', description: 'Assign activities to users' },
  { resource: 'activity', action: 'execute', description: 'Execute activities' },
  { resource: 'activity', action: 'manage', description: 'Full activity management' },

  // Inventory Management
  { resource: 'inventory', action: 'create', description: 'Create inventory items' },
  { resource: 'inventory', action: 'read', description: 'View inventory' },
  { resource: 'inventory', action: 'update', description: 'Update inventory' },
  { resource: 'inventory', action: 'delete', description: 'Delete inventory items' },
  { resource: 'inventory', action: 'manage', description: 'Full inventory management' },

  // Order Management
  { resource: 'order', action: 'create', description: 'Create orders' },
  { resource: 'order', action: 'read', description: 'View orders' },
  { resource: 'order', action: 'update', description: 'Update orders' },
  { resource: 'order', action: 'delete', description: 'Delete orders' },
  { resource: 'order', action: 'fulfill', description: 'Fulfill orders' },
  { resource: 'order', action: 'manage', description: 'Full order management' },

  // Commodity Management
  { resource: 'commodity', action: 'create', description: 'Create commodities' },
  { resource: 'commodity', action: 'read', description: 'View commodities' },
  { resource: 'commodity', action: 'update', description: 'Update commodities' },
  { resource: 'commodity', action: 'delete', description: 'Delete commodities' },
  { resource: 'commodity', action: 'manage', description: 'Full commodity management' },

  // Analytics & Reporting
  { resource: 'analytics', action: 'read', description: 'View analytics and reports' },
  { resource: 'analytics', action: 'export', description: 'Export analytics data' },
  { resource: 'analytics', action: 'manage', description: 'Full analytics management' },

  // Role & Permission Management
  { resource: 'role', action: 'create', description: 'Create roles' },
  { resource: 'role', action: 'read', description: 'View roles' },
  { resource: 'role', action: 'update', description: 'Update roles' },
  { resource: 'role', action: 'delete', description: 'Delete roles' },
  { resource: 'role', action: 'assign', description: 'Assign roles to users' },
  { resource: 'role', action: 'manage', description: 'Full role management' },

  { resource: 'permission', action: 'read', description: 'View permissions' },
  { resource: 'permission', action: 'manage', description: 'Manage permissions' },

  // Media Management
  { resource: 'media', action: 'create', description: 'Create/upload media files' },
  { resource: 'media', action: 'upload', description: 'Upload media files' },
  { resource: 'media', action: 'read', description: 'View media files' },
  { resource: 'media', action: 'update', description: 'Update media files' },
  { resource: 'media', action: 'delete', description: 'Delete media files' },
  { resource: 'media', action: 'manage', description: 'Full media management' },

  // Intelligence & AI
  { resource: 'intelligence', action: 'query', description: 'Query AI intelligence' },
  { resource: 'intelligence', action: 'analyze', description: 'Run farm analysis' },
  { resource: 'intelligence', action: 'optimize', description: 'Run activity optimization' },
  { resource: 'intelligence', action: 'manage', description: 'Full intelligence management' },

  // Marketplace Management
  { resource: 'marketplace', action: 'browse', description: 'Browse marketplace' },
  { resource: 'marketplace', action: 'create', description: 'Create marketplace listings' },
  { resource: 'marketplace', action: 'read', description: 'View marketplace listings' },
  { resource: 'marketplace', action: 'update', description: 'Update marketplace listings' },
  { resource: 'marketplace', action: 'delete', description: 'Delete marketplace listings' },
  { resource: 'marketplace', action: 'manage', description: 'Full marketplace management' },

  // Financial Management
  { resource: 'transaction', action: 'create', description: 'Create transactions' },
  { resource: 'transaction', action: 'read', description: 'View transactions' },
  { resource: 'transaction', action: 'update', description: 'Update transactions' },
  { resource: 'transaction', action: 'manage', description: 'Full transaction management' },

  // Settings & Configuration
  { resource: 'settings', action: 'read', description: 'View settings' },
  { resource: 'settings', action: 'update', description: 'Update settings' },
  { resource: 'settings', action: 'manage', description: 'Full settings management' },

  // Platform Administration
  { resource: 'platform', action: 'admin', description: 'Platform administration' },
  { resource: 'platform', action: 'monitor', description: 'Platform monitoring' },
];

// =============================================================================
// SYSTEM ROLES INITIALIZATION
// =============================================================================

const SYSTEM_ROLES = [
  // Platform Admin Role
  {
    name: 'Platform Admin',
    description: 'Full platform administration access',
    level: 100,
    isSystemRole: true,
    isPlatformAdmin: true,
    permissions: [
      'user:manage', 'organization:manage', 'farm:manage', 'activity:manage',
      'inventory:manage', 'order:manage', 'commodity:manage', 'analytics:manage',
      'role:manage', 'permission:manage', 'media:manage', 'intelligence:manage',
      'transaction:manage', 'settings:manage', 'platform:admin'
    ]
  },

  // Organization Owner Role
  {
    name: 'Organization Owner',
    description: 'Full control over organization and all resources',
    level: 90,
    isSystemRole: true,
    permissions: [
      'user:manage', 'organization:update', 'farm:manage', 'activity:manage',
      'inventory:manage', 'order:manage', 'commodity:manage', 'analytics:manage',
      'role:assign', 'media:manage', 'intelligence:manage', 'transaction:manage',
      'settings:manage'
    ]
  },

  // Farm Manager Role
  {
    name: 'Farm Manager',
    description: 'Manage farm operations and team',
    level: 80,
    isSystemRole: true,
    permissions: [
      'user:read', 'farm:read', 'farm:update', 'activity:manage',
      'inventory:manage', 'order:read', 'order:create', 'commodity:manage',
      'analytics:read', 'media:manage', 'intelligence:query', 'transaction:read'
    ]
  },

  // Farm Operator Role
  {
    name: 'Farm Operator',
    description: 'Execute farm activities and tasks',
    level: 60,
    isSystemRole: true,
    permissions: [
      'user:read', 'farm:read', 'activity:read', 'activity:execute',
      'inventory:read', 'inventory:update', 'order:read', 'commodity:read',
      'media:create', 'media:read', 'media:update', 'media:delete'
    ]
  },

  // Commodity Trader Role
  {
    name: 'Commodity Trader',
    description: 'Manage commodity trading and orders',
    level: 70,
    isSystemRole: true,
    permissions: [
      'user:read', 'organization:read', 'order:manage', 'commodity:manage',
      'inventory:read', 'analytics:read', 'media:read', 'transaction:read'
    ]
  },

  // Buyer Role
  {
    name: 'Buyer',
    description: 'Purchase commodities and manage orders',
    level: 50,
    isSystemRole: true,
    permissions: [
      'user:read', 'order:read', 'order:create', 'commodity:read',
      'analytics:read', 'media:read', 'transaction:read'
    ]
  },

  // Supplier Role
  {
    name: 'Supplier',
    description: 'Supply commodities and fulfill orders',
    level: 50,
    isSystemRole: true,
    permissions: [
      'user:read', 'order:read', 'order:update', 'commodity:read',
      'inventory:read', 'analytics:read', 'media:read', 'transaction:read'
    ]
  },

  // Logistics Provider Role
  {
    name: 'Logistics Provider',
    description: 'Handle delivery and logistics',
    level: 40,
    isSystemRole: true,
    permissions: [
      'user:read', 'order:read', 'order:update', 'media:read'
    ]
  },

  // Viewer Role
  {
    name: 'Viewer',
    description: 'Read-only access to relevant information',
    level: 10,
    isSystemRole: true,
    permissions: [
      'user:read', 'farm:read', 'activity:read', 'inventory:read',
      'order:read', 'commodity:read', 'analytics:read', 'media:read'
    ]
  }
];

// =============================================================================
// SAMPLE ORGANIZATIONS INITIALIZATION
// =============================================================================

const SAMPLE_ORGANIZATIONS = [
  {
    name: 'FarmPro Demo Farm',
    type: 'FARM_OPERATION',
    email: 'demo@farmpro.app',
    phone: '+1-555-0101',
    address: {
      street: '1234 Farm Road',
      city: 'Rural Valley',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    description: 'Demo farm showcasing FarmPro platform capabilities',
    plan: 'premium',
    maxUsers: 25,
    maxFarms: 3,
    features: ['farm_management', 'analytics', 'mobile_app'],
    allowCustomRoles: true
  },
  {
    name: 'GrainSparkles Trading',
    type: 'COMMODITY_TRADER',
    email: 'trading@grainsparkles.com',
    phone: '+1-555-0102',
    address: {
      street: '5678 Commerce Blvd',
      city: 'Trade City',
      state: 'TX',
      zipCode: '75001',
      country: 'USA'
    },
    description: 'Professional commodity trading and market intelligence platform',
    plan: 'enterprise',
    maxUsers: 100,
    maxFarms: 0,
    features: ['exchange', 'analytics', 'api_access', 'custom_roles'],
    allowCustomRoles: true
  },
  {
    name: 'FarmPro Logistics',
    type: 'LOGISTICS_PROVIDER',
    email: 'logistics@farmpro.app',
    phone: '+1-555-0103',
    address: {
      street: '9999 Transport Way',
      city: 'Logistics Hub',
      state: 'FL',
      zipCode: '33101',
      country: 'USA'
    },
    description: 'Specialized agricultural logistics and cold chain management',
    plan: 'professional',
    maxUsers: 50,
    maxFarms: 0,
    features: ['delivery_tracking', 'mobile_app', 'analytics'],
    allowCustomRoles: false
  },
  {
    name: 'GrainSparkles Integrated',
    type: 'INTEGRATED_FARM',
    email: 'operations@grainsparkles.com',
    phone: '+1-555-0104',
    address: {
      street: '1111 Corporate Farm Lane',
      city: 'Agri City',
      state: 'IA',
      zipCode: '50001',
      country: 'USA'
    },
    description: 'Large-scale integrated farming and commodity trading operation',
    plan: 'enterprise',
    maxUsers: 200,
    maxFarms: 10,
    features: ['farm_management', 'exchange', 'analytics', 'api_access', 'custom_roles'],
    allowCustomRoles: true
  }
];

// =============================================================================
// SAMPLE USERS INITIALIZATION
// =============================================================================

const SAMPLE_USERS = [
  // FarmPro Demo Farm Users
  {
    email: 'admin@farmpro.app',
    name: 'FarmPro Admin',
    phone: '+1-555-1001',
    organizationIndex: 0,
    role: 'Platform Admin',
    password: 'FarmProAdmin123!'
  },
  {
    email: 'demo@farmpro.app',
    name: 'Demo Farm Owner',
    phone: '+1-555-1002',
    organizationIndex: 0,
    role: 'Organization Owner',
    password: 'FarmOwner123!'
  },
  {
    email: 'manager@farmpro.app',
    name: 'Farm Manager',
    phone: '+1-555-1003',
    organizationIndex: 0,
    role: 'Farm Manager',
    password: 'FarmManager123!'
  },
  {
    email: 'operator@farmpro.app',
    name: 'Farm Operator',
    phone: '+1-555-1004',
    organizationIndex: 0,
    role: 'Farm Operator',
    password: 'FarmOperator123!'
  },

  // GrainSparkles Trading Users
  {
    email: 'admin@grainsparkles.com',
    name: 'GrainSparkles Admin',
    phone: '+1-555-2001',
    organizationIndex: 1,
    role: 'Platform Admin',
    password: 'GrainSparklesAdmin123!'
  },
  {
    email: 'trading@grainsparkles.com',
    name: 'Trading Manager',
    phone: '+1-555-2002',
    organizationIndex: 1,
    role: 'Organization Owner',
    password: 'TradingOwner123!'
  },
  {
    email: 'trader@grainsparkles.com',
    name: 'Commodity Trader',
    phone: '+1-555-2003',
    organizationIndex: 1,
    role: 'Commodity Trader',
    password: 'Trader123!'
  },

  // FarmPro Logistics Users
  {
    email: 'logistics@farmpro.app',
    name: 'Logistics Manager',
    phone: '+1-555-3001',
    organizationIndex: 2,
    role: 'Organization Owner',
    password: 'LogisticsOwner123!'
  },
  {
    email: 'dispatch@farmpro.app',
    name: 'Dispatch Coordinator',
    phone: '+1-555-3002',
    organizationIndex: 2,
    role: 'Logistics Provider',
    password: 'Logistics123!'
  },

  // GrainSparkles Integrated Users
  {
    email: 'operations@grainsparkles.com',
    name: 'Operations Director',
    phone: '+1-555-4001',
    organizationIndex: 3,
    role: 'Organization Owner',
    password: 'OperationsOwner123!'
  },
  {
    email: 'farm@grainsparkles.com',
    name: 'Farm Manager',
    phone: '+1-555-4002',
    organizationIndex: 3,
    role: 'Farm Manager',
    password: 'FarmManager123!'
  },
  {
    email: 'trading@grainsparkles.com',
    name: 'Trading Specialist',
    phone: '+1-555-4003',
    organizationIndex: 3,
    role: 'Commodity Trader',
    password: 'TradingSpecialist123!'
  }
];

// =============================================================================
// DOMAIN VALIDATION
// =============================================================================

const ALLOWED_PLATFORM_ADMIN_DOMAINS = ['farmpro.app', 'grainsparkles.com'];

function isAllowedPlatformAdminDomain(email: string): boolean {
  const domain = email.split('@')[1];
  return ALLOWED_PLATFORM_ADMIN_DOMAINS.includes(domain);
}

// =============================================================================
// INITIALIZATION FUNCTIONS
// =============================================================================

async function initializePermissions() {
  console.log('🔐 Initializing permissions...');
  
  for (const permission of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action
        }
      },
      update: permission,
      create: {
        ...permission,
        isSystemPermission: true
      }
    });
  }
  
  console.log(`✅ Created ${SYSTEM_PERMISSIONS.length} permissions`);
}

async function initializeRoles() {
  console.log('👥 Initializing system roles...');
  
  // First, create a system organization for system roles
  let systemOrg = await prisma.organization.findFirst({
    where: { name: 'System' }
  });
  
  if (!systemOrg) {
    systemOrg = await prisma.organization.create({
      data: {
        name: 'System',
        type: 'FARM_OPERATION' as any,
        email: 'system@farmpro.com',
        phone: '+1-000-0000',
        address: {
          street: 'System',
          city: 'System',
          state: 'SY',
          zipCode: '00000',
          country: 'USA'
        },
        description: 'System organization for platform-wide roles',
        isVerified: true,
        isActive: true,
        plan: 'enterprise',
        maxUsers: 999999,
        maxFarms: 999999,
        features: ['all_features'],
        allowCustomRoles: true
      }
    });
  }
  
  for (const roleData of SYSTEM_ROLES) {
    const { permissions, ...roleDataWithoutPermissions } = roleData;
    const role = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: roleData.name,
          organizationId: systemOrg.id
        }
      },
      update: roleDataWithoutPermissions,
      create: {
        ...roleDataWithoutPermissions,
        organizationId: systemOrg.id
      }
    });

    // Assign permissions to role
    for (const permissionKey of permissions) {
      const [resource, action] = permissionKey.split(':');
      const permission = await prisma.permission.findUnique({
        where: {
          resource_action: { resource, action }
        }
      });

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id
            }
          },
          update: { granted: true },
          create: {
            roleId: role.id,
            permissionId: permission.id,
            granted: true
          }
        });
      }
    }
  }
  
  console.log(`✅ Created ${SYSTEM_ROLES.length} system roles`);
}

async function initializeOrganizations() {
  console.log('🏢 Initializing sample organizations...');
  
  const organizations = [];
  for (const orgData of SAMPLE_ORGANIZATIONS) {
    let org = await prisma.organization.findFirst({
      where: { name: orgData.name }
    });
    
    if (org) {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: {
          ...orgData,
          type: orgData.type as any
        }
      });
    } else {
      org = await prisma.organization.create({
        data: {
          ...orgData,
          type: orgData.type as any
        }
      });
    }
    
    organizations.push(org);
  }
  
  console.log(`✅ Created ${organizations.length} organizations`);
  return organizations;
}

async function initializeUsers(organizations: any[]) {
  console.log('👤 Initializing sample users...');
  
  const users = [];
  for (const userData of SAMPLE_USERS) {
    const hashedPassword = await hash(userData.password);
    const organization = organizations[userData.organizationIndex];
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        phone: userData.phone,
        organizationId: organization.id,
        hashedPassword,
        emailVerified: true,
        isActive: true
      },
      create: {
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        organizationId: organization.id,
        hashedPassword,
        emailVerified: true,
        isActive: true
      }
    });
    
    // Assign role to user with domain validation for Platform Admin
    let roleToAssign = userData.role;
    
    // Check if user is trying to be Platform Admin but doesn't have allowed domain
    if (userData.role === 'Platform Admin' && !isAllowedPlatformAdminDomain(userData.email)) {
      console.log(`⚠️  User ${userData.email} cannot be Platform Admin - domain not whitelisted. Assigning Organization Owner instead.`);
      roleToAssign = 'Organization Owner';
    }
    
    const role = await prisma.role.findFirst({
      where: {
        name: roleToAssign,
        isSystemRole: true
      }
    });
    
    if (role) {
      // For system roles, we don't need a farmId, so we'll create a userRole without farmId
      // by using a different approach - create directly without upsert
      try {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
            isActive: true
          }
        });
      } catch (error) {
        // If it already exists, update it
        if (error.code === 'P2002') {
          await prisma.userRole.updateMany({
            where: {
              userId: user.id,
              roleId: role.id
            },
            data: { isActive: true }
          });
        } else {
          throw error;
        }
      }
    }
    
    users.push(user);
  }
  
  console.log(`✅ Created ${users.length} users with roles`);
  return users;
}

async function initializeSampleFarms(organizations: any[]) {
  console.log('🚜 Initializing sample farms...');
  
  const farms = [];
  
  // Create farms for farm operations
  const farmOrgs = organizations.filter(org => 
    org.type === 'FARM_OPERATION' || org.type === 'INTEGRATED_FARM'
  );
  
  for (const org of farmOrgs) {
    const farm = await prisma.farm.create({
      data: {
        organizationId: org.id,
        name: `${org.name} Main Farm`,
        totalArea: 100.5,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: org.address
        },
        timezone: 'America/New_York',
        cropTypes: ['Wheat', 'Corn', 'Soybeans'],
        establishedDate: new Date('2020-01-01'),
        certifications: ['Organic', 'Non-GMO'],
        isPublic: true
      }
    });
    farms.push(farm);
  }
  
  console.log(`✅ Created ${farms.length} sample farms`);
  return farms;
}

async function initializeSampleCommodities() {
  console.log('🌾 Initializing sample commodities...');
  
  const commodities = [
    {
      name: 'Organic Wheat',
      category: 'Grains',
      variety: 'Hard Red Winter',
      qualityGrade: 'Grade 1',
      quantity: 1000,
      unit: 'bushels',
      isGlobal: true
    },
    {
      name: 'Sweet Corn',
      category: 'Vegetables',
      variety: 'Yellow Sweet',
      qualityGrade: 'Premium',
      quantity: 500,
      unit: 'crates',
      isGlobal: true
    },
    {
      name: 'Soybeans',
      category: 'Oilseeds',
      variety: 'Roundup Ready',
      qualityGrade: 'Grade 2',
      quantity: 2000,
      unit: 'bushels',
      isGlobal: true
    },
    {
      name: 'Tomatoes',
      category: 'Vegetables',
      variety: 'Roma',
      qualityGrade: 'Grade 1',
      quantity: 300,
      unit: 'boxes',
      isGlobal: true
    },
    {
      name: 'Potatoes',
      category: 'Vegetables',
      variety: 'Russet',
      qualityGrade: 'Grade 1',
      quantity: 800,
      unit: 'bags',
      isGlobal: true
    }
  ];
  
  for (const commodityData of commodities) {
    const existing = await prisma.commodity.findFirst({
      where: {
        name: commodityData.name,
        variety: commodityData.variety
      }
    });
    
    if (existing) {
      await prisma.commodity.update({
        where: { id: existing.id },
        data: commodityData
      });
    } else {
      await prisma.commodity.create({
        data: commodityData
      });
    }
  }
  
  console.log(`✅ Created ${commodities.length} sample commodities`);
}

// =============================================================================
// MAIN INITIALIZATION FUNCTION
// =============================================================================

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...\n');
    
    // Initialize core data
    await initializePermissions();
    await initializeRoles();
    const organizations = await initializeOrganizations();
    const users = await initializeUsers(organizations);
    const farms = await initializeSampleFarms(organizations);
    await initializeSampleCommodities();
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${SYSTEM_PERMISSIONS.length} permissions created`);
    console.log(`   • ${SYSTEM_ROLES.length} system roles created`);
    console.log(`   • ${organizations.length} organizations created`);
    console.log(`   • ${users.length} users created`);
    console.log(`   • ${farms.length} farms created`);
    console.log(`   • 5 sample commodities created`);
    
    console.log('\n🔑 Sample Login Credentials:');
    SAMPLE_USERS.forEach(user => {
      console.log(`   • ${user.email} / ${user.password} (${user.role})`);
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };
