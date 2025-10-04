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
    await upsertPermission({
      ...permission,
      isSystemPermission: true
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
    const role = await upsertRole({
      ...roleDataWithoutPermissions,
      organizationId: systemOrg.id
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
    const org = await upsertOrganization({
      ...orgData,
      type: orgData.type as any
    });
    organizations.push(org);
  }
  
  console.log(`✅ Upserted ${organizations.length} organizations`);
  return organizations;
}

async function initializeUsers(organizations: any[]) {
  console.log('👤 Initializing sample users...');
  
  const users = [];
  for (const userData of SAMPLE_USERS) {
    const organization = organizations[userData.organizationIndex];
    
    const user = await upsertUser({
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      password: userData.password,
      isActive: true,
      organizationId: organization.id,
      emailVerified: true
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
    const farm = await upsertFarm({
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
  
  const createdCommodities = [];
  
  for (const commodityData of commodities) {
    const created = await upsertCommodity({
      name: commodityData.name,
      category: commodityData.category,
      description: `${commodityData.variety} - ${commodityData.qualityGrade}`,
      unit: commodityData.unit,
      isActive: true,
      quantity: commodityData.quantity
    });
    createdCommodities.push(created);
  }
  
  console.log(`✅ Upserted ${createdCommodities.length} sample commodities`);
  return createdCommodities;
}

async function initializeSampleActivities(farms: any[], users: any[]) {
  console.log('🚜 Initializing sample activities...');
  
  const activities = [];
  const farm = farms[0]; // Use first farm
  const farmManager = users.find(u => u.email === 'manager@farmpro.app');
  const farmOperator = users.find(u => u.email === 'operator@farmpro.app');
  
  if (!farm || !farmManager || !farmOperator) {
    console.log('⚠️  Skipping activities - missing farm or users');
    return [];
  }

  const activityData = [
    {
      name: 'Harvest Wheat - Field A',
      type: 'HARVESTING',
      status: 'SCHEDULED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      estimatedDuration: 480, // 8 hours
      estimatedCost: 2500,
      assignedTo: [farmOperator.id],
      description: 'Harvest wheat from Field A using combine harvester',
      instructions: 'Check weather conditions before starting. Ensure equipment is properly maintained.',
      safetyNotes: 'Wear safety gear. Be cautious of moving parts on machinery.'
    },
    {
      name: 'Quality Assessment - Field D',
      type: 'MONITORING',
      status: 'SCHEDULED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
      estimatedDuration: 120, // 2 hours
      estimatedCost: 500,
      assignedTo: [farmManager.id],
      description: 'Assess crop quality and readiness for harvest',
      instructions: 'Take samples from different areas. Document findings.',
      safetyNotes: 'Watch for uneven terrain. Use proper sampling techniques.'
    },
    {
      name: 'Irrigation - Field B',
      type: 'IRRIGATION',
      status: 'PLANNED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      estimatedDuration: 180, // 3 hours
      estimatedCost: 800,
      assignedTo: [farmOperator.id],
      description: 'Water Field B using sprinkler system',
      instructions: 'Check soil moisture levels first. Run irrigation for 3 hours.',
      safetyNotes: 'Ensure proper water pressure. Check for leaks.'
    },
    {
      name: 'Soil Testing - Field C',
      type: 'MONITORING',
      status: 'COMPLETED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      estimatedDuration: 240, // 4 hours
      actualDuration: 200, // 3.3 hours
      estimatedCost: 600,
      actualCost: 550,
      assignedTo: [farmManager.id],
      description: 'Test soil composition and nutrient levels',
      instructions: 'Take samples from 10 different locations. Send to lab for analysis.',
      safetyNotes: 'Use clean sampling tools. Label samples properly.'
    },
    {
      name: 'Pest Control - Field A',
      type: 'PEST_CONTROL',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      scheduledAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      estimatedDuration: 300, // 5 hours
      estimatedCost: 1200,
      assignedTo: [farmOperator.id],
      description: 'Apply pesticide to control aphid infestation',
      instructions: 'Mix pesticide according to label. Apply evenly across affected areas.',
      safetyNotes: 'Wear protective clothing and mask. Avoid contact with skin.'
    },
    {
      name: 'Equipment Maintenance',
      type: 'MAINTENANCE',
      status: 'PLANNED',
      priority: 'LOW',
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      estimatedDuration: 360, // 6 hours
      estimatedCost: 1500,
      assignedTo: [farmOperator.id],
      description: 'Maintain and service farm equipment',
      instructions: 'Check all equipment. Replace filters and fluids as needed.',
      safetyNotes: 'Ensure equipment is turned off. Use proper tools.'
    }
  ];

  for (const activityInfo of activityData) {
    const activity = await prisma.farmActivity.create({
      data: {
        farmId: farm.id,
        type: activityInfo.type as any,
        name: activityInfo.name,
        description: activityInfo.description,
        status: activityInfo.status as any,
        priority: activityInfo.priority as any,
        scheduledAt: activityInfo.scheduledAt,
        startedAt: activityInfo.startedAt || null,
        completedAt: activityInfo.completedAt || null,
        estimatedDuration: activityInfo.estimatedDuration,
        actualDuration: activityInfo.actualDuration || null,
        cost: activityInfo.actualCost || activityInfo.estimatedCost,
        createdById: farmManager.id,
        metadata: {
          instructions: activityInfo.instructions,
          safetyNotes: activityInfo.safetyNotes,
          percentComplete: activityInfo.status === 'COMPLETED' ? 100 : 
                          activityInfo.status === 'IN_PROGRESS' ? 45 : 0
        }
      }
    });

    // Create activity assignments
    for (const userId of activityInfo.assignedTo) {
      await prisma.activityAssignment.create({
        data: {
          activityId: activity.id,
          userId: userId,
          assignedById: farmManager.id,
          role: 'ASSIGNED'
        }
      });
    }

    // Add some cost entries for completed activities
    if (activityInfo.status === 'COMPLETED') {
      await prisma.activityCost.create({
        data: {
          activityId: activity.id,
          type: 'LABOR',
          description: 'Labor costs',
          amount: activityInfo.actualCost * 0.6,
          createdById: farmManager.id
        }
      });

      await prisma.activityCost.create({
        data: {
          activityId: activity.id,
          type: 'MATERIAL',
          description: 'Materials and supplies',
          amount: activityInfo.actualCost * 0.4,
          createdById: farmManager.id
        }
      });
    }

    activities.push(activity);
  }

  console.log(`✅ Created ${activities.length} sample activities`);
  return activities;
}

async function initializeSampleOrders(organizations: any[], farms: any[], commodities: any[], users: any[]) {
  console.log('📦 Initializing sample orders...');
  
  const orders = [];
  const farmOrg = organizations.find(o => o.type === 'FARM_OPERATION');
  const tradingOrg = organizations.find(o => o.type === 'COMMODITY_TRADER');
  const farm = farms[0];
  const wheat = commodities.find(c => c.name === 'Organic Wheat');
  const corn = commodities.find(c => c.name === 'Sweet Corn');
  const farmManager = users.find(u => u.email === 'manager@farmpro.app');
  
  if (!farmOrg || !tradingOrg || !farm || !wheat || !corn || !farmManager) {
    console.log('⚠️  Skipping orders - missing organizations, farm, commodities, or users');
    return [];
  }

  // Generate unique order numbers with timestamp
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const orderData = [
    {
      orderNumber: `ORD-${timestamp}-001`,
      title: 'Wheat Order Response',
      type: 'SELL',
      status: 'PENDING',
      commodityId: wheat.id,
      quantity: 500,
      pricePerUnit: 8.50,
      totalPrice: 4250,
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      deliveryLocation: 'Green Valley Farm',
      buyerOrgId: tradingOrg.id,
      supplierOrgId: farmOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '1234 Farm Road',
        city: 'Rural Valley',
        state: 'CA',
        zip: '90210',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      }
    },
    {
      orderNumber: `ORD-${timestamp}-002`,
      title: 'Delivery Order Coordination',
      type: 'SELL',
      status: 'CONFIRMED',
      commodityId: corn.id,
      quantity: 200,
      pricePerUnit: 12.00,
      totalPrice: 2400,
      deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      deliveryLocation: 'EcoFood Industries',
      buyerOrgId: tradingOrg.id,
      supplierOrgId: farmOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '5678 Commerce Blvd',
        city: 'Trade City',
        state: 'TX',
        zip: '75001',
        coordinates: { lat: 32.7767, lng: -96.7970 }
      }
    },
    {
      orderNumber: `ORD-${timestamp}-003`,
      title: 'Price Negotiation',
      type: 'SELL',
      status: 'PENDING',
      commodityId: wheat.id,
      quantity: 300,
      pricePerUnit: 7.80,
      totalPrice: 2340,
      deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      deliveryLocation: 'Premium Foods Ltd',
      buyerOrgId: tradingOrg.id,
      supplierOrgId: farmOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '9999 Food Street',
        city: 'Premium City',
        state: 'NY',
        zip: '10001',
        coordinates: { lat: 40.7589, lng: -73.9851 }
      }
    }
  ];

  for (const orderInfo of orderData) {
    try {
      const order = await upsertOrder({
        orderNumber: orderInfo.orderNumber,
        title: orderInfo.title,
        type: orderInfo.type as any,
        status: orderInfo.status as any,
        commodityId: orderInfo.commodityId,
        quantity: orderInfo.quantity,
        pricePerUnit: orderInfo.pricePerUnit,
        totalPrice: orderInfo.totalPrice,
        deliveryDate: orderInfo.deliveryDate,
        deliveryLocation: orderInfo.deliveryLocation,
        buyerOrgId: orderInfo.buyerOrgId,
        supplierOrgId: orderInfo.supplierOrgId,
        createdById: orderInfo.createdById,
        farmId: orderInfo.farmId,
        deliveryAddress: orderInfo.deliveryAddress,
        totalAmount: orderInfo.totalPrice,
        currency: 'NGN'
      });

      // Create order item (no unique constraint, so just create)
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          commodityId: orderInfo.commodityId,
          quantity: orderInfo.quantity,
          unitPrice: orderInfo.pricePerUnit
        }
      });

      orders.push(order);
    } catch (error) {
      console.error(`❌ Failed to upsert order ${orderInfo.orderNumber}:`, error);
      // Continue with other orders instead of failing completely
    }
  }

  console.log(`✅ Created ${orders.length} sample orders`);
  return orders;
}

async function initializeSampleTransactions(organizations: any[], farms: any[], orders: any[]) {
  console.log('💰 Initializing sample transactions...');
  
  const transactions = [];
  const farmOrg = organizations.find(o => o.type === 'FARM_OPERATION');
  const farm = farms[0];
  
  if (!farmOrg || !farm) {
    console.log('⚠️  Skipping transactions - missing organization or farm');
    return [];
  }

  const transactionData = [
    {
      type: 'FARM_REVENUE',
      amount: 4250,
      description: 'Wheat sale revenue',
      orderId: orders[0]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      type: 'FARM_REVENUE',
      amount: 2400,
      description: 'Corn sale revenue',
      orderId: orders[1]?.id,
      farmId: farm.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    },
    {
      type: 'FARM_EXPENSE',
      amount: 1500,
      description: 'Equipment maintenance',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    },
    {
      type: 'FARM_EXPENSE',
      amount: 800,
      description: 'Irrigation costs',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    },
    {
      type: 'FARM_EXPENSE',
      amount: 1200,
      description: 'Pest control materials',
      farmId: farm.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
    },
    {
      type: 'FARM_EXPENSE',
      amount: 600,
      description: 'Soil testing lab fees',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    }
  ];

  for (const transactionInfo of transactionData) {
    const transaction = await prisma.transaction.create({
      data: {
        organizationId: farmOrg.id,
        orderId: transactionInfo.orderId,
        farmId: transactionInfo.farmId,
        type: transactionInfo.type as any,
        amount: transactionInfo.amount,
        currency: 'NGN',
        status: transactionInfo.status as any,
        description: transactionInfo.description,
        dueDate: transactionInfo.dueDate,
        paidDate: transactionInfo.paidDate,
        reference: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    });

    transactions.push(transaction);
  }

  console.log(`✅ Created ${transactions.length} sample transactions`);
  return transactions;
}

// =============================================================================
// UPSERT HELPER FUNCTIONS
// =============================================================================

async function upsertPermission(permission: { resource: string; action: string; description: string; isSystemPermission?: boolean }) {
  return await prisma.permission.upsert({
    where: {
      resource_action: {
        resource: permission.resource,
        action: permission.action
      }
    },
    update: {
      description: permission.description,
      isSystemPermission: permission.isSystemPermission
    },
    create: permission
  });
}

async function upsertRole(role: { name: string; description: string; isSystemRole: boolean; organizationId?: string; isPlatformAdmin?: boolean; level?: number }) {
  return await prisma.role.upsert({
    where: {
      name_organizationId: {
        name: role.name,
        organizationId: role.organizationId || null
      }
    },
    update: {
      description: role.description,
      isSystemRole: role.isSystemRole,
      isPlatformAdmin: role.isPlatformAdmin ?? false,
      level: role.level ?? 0
    },
    create: {
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      organizationId: role.organizationId,
      isPlatformAdmin: role.isPlatformAdmin ?? false,
      level: role.level ?? 0
    }
  });
}

async function upsertOrganization(org: { name: string; type: string; email: string; phone?: string; address?: any }) {
  // Find existing organization by name first
  const existing = await prisma.organization.findFirst({
    where: { name: org.name }
  });
  
  if (existing) {
    return await prisma.organization.update({
      where: { id: existing.id },
      data: {
        name: org.name,
        type: org.type as any,
        email: org.email,
        phone: org.phone,
        address: org.address
      }
    });
  } else {
    return await prisma.organization.create({
      data: {
        name: org.name,
        type: org.type as any,
        email: org.email,
        phone: org.phone,
        address: org.address
      }
    });
  }
}

async function upsertUser(user: { email: string; name: string; phone?: string; password: string; isActive: boolean; organizationId?: string; emailVerified?: boolean }) {
  const hashedPassword = await hash(user.password);
  return await prisma.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      phone: user.phone,
      hashedPassword: hashedPassword,
      isActive: user.isActive,
      organizationId: user.organizationId,
      emailVerified: user.emailVerified
    },
    create: {
      email: user.email,
      name: user.name,
      phone: user.phone,
      hashedPassword: hashedPassword,
      isActive: user.isActive,
      organizationId: user.organizationId,
      emailVerified: user.emailVerified
    }
  });
}

async function upsertFarm(farm: { organizationId: string; name: string; totalArea: number; location: any; timezone: string; cropTypes: string[]; establishedDate: Date; certifications: string[]; isPublic: boolean }) {
  // Find existing farm by organizationId and name
  const existing = await prisma.farm.findFirst({
    where: {
      organizationId: farm.organizationId,
      name: farm.name
    }
  });
  
  if (existing) {
    return await prisma.farm.update({
      where: { id: existing.id },
      data: {
        totalArea: farm.totalArea,
        location: farm.location,
        timezone: farm.timezone,
        cropTypes: farm.cropTypes,
        establishedDate: farm.establishedDate,
        certifications: farm.certifications,
        isPublic: farm.isPublic
      }
    });
  } else {
    return await prisma.farm.create({
      data: farm
    });
  }
}

async function upsertCommodity(commodity: { name: string; category: string; description: string; unit: string; isActive: boolean; quantity: number }) {
  // Find existing commodity by name
  const existing = await prisma.commodity.findFirst({
    where: { name: commodity.name }
  });
  
  if (existing) {
    return await prisma.commodity.update({
      where: { id: existing.id },
      data: {
        category: commodity.category,
        description: commodity.description,
        unit: commodity.unit,
        isActive: commodity.isActive,
        quantity: commodity.quantity
      }
    });
  } else {
    return await prisma.commodity.create({
      data: {
        name: commodity.name,
        category: commodity.category,
        description: commodity.description,
        unit: commodity.unit,
        isActive: commodity.isActive,
        quantity: commodity.quantity
      }
    });
  }
}

async function upsertOrder(order: { orderNumber: string; title: string; type: string; status: string; commodityId: string; quantity: number; pricePerUnit: number; totalPrice: number; deliveryDate: Date; deliveryLocation: string; buyerOrgId: string; supplierOrgId: string; createdById: string; farmId?: string; deliveryAddress: any; totalAmount: number; currency: string }) {
  return await prisma.order.upsert({
    where: { orderNumber: order.orderNumber },
    update: {
      title: order.title,
      type: order.type as any,
      status: order.status as any,
      commodityId: order.commodityId,
      quantity: order.quantity,
      pricePerUnit: order.pricePerUnit,
      totalPrice: order.totalPrice,
      deliveryDate: order.deliveryDate,
      deliveryLocation: order.deliveryLocation,
      buyerOrgId: order.buyerOrgId,
      supplierOrgId: order.supplierOrgId,
      createdById: order.createdById,
      farmId: order.farmId,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      currency: order.currency as any
    },
    create: {
      orderNumber: order.orderNumber,
      title: order.title,
      type: order.type as any,
      status: order.status as any,
      commodityId: order.commodityId,
      quantity: order.quantity,
      pricePerUnit: order.pricePerUnit,
      totalPrice: order.totalPrice,
      deliveryDate: order.deliveryDate,
      deliveryLocation: order.deliveryLocation,
      buyerOrgId: order.buyerOrgId,
      supplierOrgId: order.supplierOrgId,
      createdById: order.createdById,
      farmId: order.farmId,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      currency: order.currency as any
    }
  });
}

// =============================================================================
// MAIN INITIALIZATION FUNCTION
// =============================================================================

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...\n');
    
    // Initialize core data with upsert operations
    await initializePermissions();
    await initializeRoles();
    const organizations = await initializeOrganizations();
    const users = await initializeUsers(organizations);
    const farms = await initializeSampleFarms(organizations);
    const commodities = await initializeSampleCommodities();
    const activities = await initializeSampleActivities(farms, users);
    const orders = await initializeSampleOrders(organizations, farms, commodities, users);
    const transactions = await initializeSampleTransactions(organizations, farms, orders);
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${SYSTEM_PERMISSIONS.length} permissions created`);
    console.log(`   • ${SYSTEM_ROLES.length} system roles created`);
    console.log(`   • ${organizations.length} organizations created`);
    console.log(`   • ${users.length} users created`);
    console.log(`   • ${farms.length} farms created`);
    console.log(`   • ${commodities.length} sample commodities created`);
    console.log(`   • ${activities.length} sample activities created`);
    console.log(`   • ${orders.length} sample orders created`);
    console.log(`   • ${transactions.length} sample transactions created`);
    
    console.log('\n🔑 Sample Login Credentials:');
    SAMPLE_USERS.forEach(user => {
      console.log(`   • ${user.email} / ${user.password} (${user.role})`);
    });
    
    console.log('\n📈 Dashboard Data Available:');
    console.log('   • Farm activities with various statuses (scheduled, in-progress, completed)');
    console.log('   • Financial transactions (revenue and expenses)');
    console.log('   • Orders with different statuses (pending, confirmed)');
    console.log('   • Realistic cost breakdowns and progress tracking');
    
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
