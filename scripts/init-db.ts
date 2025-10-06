import { PrismaClient, SubscriptionTier } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

// =============================================================================
// PLAN FEATURE MAPPER (Simplified for init script)
// =============================================================================

class PlanFeatureMapper {
  getOrganizationFeatures(orgType: string, planTier: SubscriptionTier): {
    allowedModules: string[];
    features: string[];
  } {
    const baseModules = this.getBaseModules(planTier);
    const premiumModules = this.getPremiumModules(planTier);
    const allModules = [...baseModules, ...premiumModules];
    
    const baseFeatures = this.getBaseFeatures(planTier);
    const premiumFeatures = this.getPremiumFeatures(planTier);
    const allFeatures = [...baseFeatures, ...premiumFeatures];
    
    return { allowedModules: allModules, features: allFeatures };
  }

  private getBaseModules(tier: SubscriptionTier): string[] {
    const moduleMap: Record<SubscriptionTier, string[]> = {
      FREE: ['farm_management', 'activities', 'marketplace', 'orders', 'inventory', 'media'],
      BASIC: ['farm_management', 'activities', 'marketplace', 'orders', 'inventory', 'deliveries', 'media'],
      PRO: [
        'farm_management', 'activities', 'inventory', 'analytics', 
        'marketplace', 'orders', 'trading', 'deliveries', 
        'observations', 'crop_cycles', 'intelligence', 'media'
      ],
      ENTERPRISE: [
        'farm_management', 'activities', 'inventory', 'analytics',
        'marketplace', 'orders', 'trading', 'deliveries',
        'observations', 'sensors', 'crop_cycles', 'areas',
        'seasons', 'drivers', 'tracking', 'intelligence', 'media'
      ],
    };

    return moduleMap[tier] || moduleMap.FREE;
  }

  private getPremiumModules(tier: SubscriptionTier): string[] {
    const premiumModules: string[] = [];

    if (tier === 'PRO' || tier === 'ENTERPRISE') {
      premiumModules.push('advanced_analytics', 'ai_insights', 'api_access', 'custom_roles');
    }

    if (tier === 'ENTERPRISE') {
      premiumModules.push('white_label');
    }

    return premiumModules;
  }

  private getBaseFeatures(tier: SubscriptionTier): string[] {
    const featureMap: Record<SubscriptionTier, string[]> = {
      FREE: ['basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management'],
      BASIC: ['basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management'],
      PRO: [
        'basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management',
        'advanced_analytics', 'ai_insights', 'api_access', 'custom_roles'
      ],
      ENTERPRISE: [
        'basic_farm_management', 'marketplace_access', 'order_management', 'inventory_management',
        'advanced_analytics', 'ai_insights', 'api_access', 'custom_roles',
        'white_label', 'priority_support', 'unlimited_usage'
      ],
    };

    return featureMap[tier] || featureMap.FREE;
  }

  private getPremiumFeatures(tier: SubscriptionTier): string[] {
    const premiumFeatures: string[] = [];

    if (tier === 'PRO' || tier === 'ENTERPRISE') {
      premiumFeatures.push('priority_support');
    }

    return premiumFeatures;
  }
}

const planFeatureMapper = new PlanFeatureMapper();

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
    plan: 'PRO', // Updated to proper enum value
    maxUsers: 25,
    maxFarms: 3,
    currency: 'USD', // US farm uses USD
    // Features will be set by PlanFeatureMapper
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
    plan: 'ENTERPRISE', // Updated to proper enum value
    maxUsers: 100,
    maxFarms: 0,
    currency: 'USD', // International trader uses USD
    // Features will be set by PlanFeatureMapper
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
    plan: 'BASIC', // Updated to proper enum value
    maxUsers: 50,
    maxFarms: 0,
    currency: 'USD', // US logistics uses USD
    // Features will be set by PlanFeatureMapper
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
    plan: 'ENTERPRISE', // Updated to proper enum value
    maxUsers: 200,
    maxFarms: 10,
    currency: 'USD', // Large corporate farm uses USD
    // Features will be set by PlanFeatureMapper
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
        plan: 'ENTERPRISE', // Updated to proper enum value
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
  
  // Clean up any existing duplicate user roles first
  console.log('🧹 Cleaning up existing user roles...');
  await prisma.userRole.deleteMany({
    where: {
      role: {
        isSystemRole: true
      }
    }
  });
  
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
        isSystemRole: true,
        ...(roleToAssign === 'Platform Admin' && { isPlatformAdmin: true })
      }
    });
    
    if (role) {
      // For system roles, we don't need a farmId, so we'll use findFirst + upsert approach
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          roleId: role.id,
          farmId: null
        }
      });

      if (existingUserRole) {
        // Update existing role
        await prisma.userRole.update({
          where: { id: existingUserRole.id },
          data: { isActive: true }
        });
      } else {
        // Create new role
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
            isActive: true
          }
        });
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
  console.log('🚜 Initializing comprehensive sample activities...');
  
  const activities = [];
  const farm = farms[0]; // Use first farm
  const farmManager = users.find(u => u.email === 'manager@farmpro.app');
  const farmOperator = users.find(u => u.email === 'operator@farmpro.app');
  const farmOwner = users.find(u => u.email === 'demo@farmpro.app');
  
  if (!farm || !farmManager || !farmOperator || !farmOwner) {
    console.log('⚠️  Skipping activities - missing farm or users');
    return [];
  }

  // Comprehensive activity data covering all types and statuses
  const activityData = [
    // LAND PREPARATION ACTIVITIES
    {
      name: 'Field A - Deep Plowing',
      type: 'LAND_PREP',
      status: 'COMPLETED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      estimatedDuration: 480, // 8 hours
      actualDuration: 520, // 8.7 hours
      estimatedCost: 1200,
      actualCost: 1350,
      assignedTo: [farmOperator.id],
      description: 'Deep plowing of Field A to prepare for wheat planting',
      instructions: 'Use deep plow to turn soil 12-15 inches deep. Check for rocks and debris.',
      safetyNotes: 'Ensure tractor is in good condition. Watch for underground utilities.',
      resources: [
        { type: 'equipment', resourceId: 'tractor-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'deep-plow-001', quantity: 1, unit: 'unit' },
        { type: 'labor', resourceId: 'operator-001', quantity: 1, unit: 'person' }
      ],
      actualResources: [
        { type: 'equipment', resourceId: 'tractor-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'deep-plow-001', quantity: 1, unit: 'unit' },
        { type: 'labor', resourceId: 'operator-001', quantity: 1, unit: 'person' }
      ],
      results: {
        quality: 'good',
        quantityAchieved: 1,
        notes: 'Field A successfully plowed. Soil condition excellent for planting.'
      }
    },
    {
      name: 'Field B - Soil Leveling',
      type: 'LAND_PREP',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      estimatedDuration: 240, // 4 hours
      estimatedCost: 800,
      assignedTo: [farmOperator.id],
      description: 'Level soil surface in Field B after plowing',
      instructions: 'Use land leveler to create smooth, even surface. Check for proper drainage.',
      safetyNotes: 'Work slowly to avoid creating ruts. Check equipment regularly.',
      resources: [
        { type: 'equipment', resourceId: 'tractor-002', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'land-leveler-001', quantity: 1, unit: 'unit' }
      ],
      percentComplete: 65
    },

    // PLANTING ACTIVITIES
    {
      name: 'Wheat Planting - Field A',
      type: 'PLANTING',
      status: 'COMPLETED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      estimatedDuration: 360, // 6 hours
      actualDuration: 380, // 6.3 hours
      estimatedCost: 2000,
      actualCost: 2150,
      assignedTo: [farmOperator.id, farmManager.id],
      description: 'Plant wheat seeds in Field A using precision seeder',
      instructions: 'Plant at 1.5 inch depth, 6 inch row spacing. Use certified seeds.',
      safetyNotes: 'Ensure seeder is calibrated correctly. Check seed flow regularly.',
      resources: [
        { type: 'equipment', resourceId: 'tractor-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'precision-seeder-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'wheat-seeds-001', quantity: 150, unit: 'kg' }
      ],
      actualResources: [
        { type: 'equipment', resourceId: 'tractor-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'precision-seeder-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'wheat-seeds-001', quantity: 155, unit: 'kg' }
      ],
      results: {
        quality: 'excellent',
        quantityAchieved: 25, // acres planted
        notes: 'Excellent planting conditions. Seeds germinating well.'
      }
    },
    {
      name: 'Corn Planting - Field C',
      type: 'PLANTING',
      status: 'SCHEDULED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      estimatedDuration: 420, // 7 hours
      estimatedCost: 1800,
      assignedTo: [farmOperator.id],
      description: 'Plant corn seeds in Field C',
      instructions: 'Plant at 2 inch depth, 30 inch row spacing. Use hybrid corn seeds.',
      safetyNotes: 'Check weather forecast. Avoid planting in wet conditions.',
      resources: [
        { type: 'equipment', resourceId: 'tractor-002', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'corn-planter-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'corn-seeds-001', quantity: 80, unit: 'kg' }
      ]
    },

    // FERTILIZING ACTIVITIES
    {
      name: 'Pre-Plant Fertilizer - Field A',
      type: 'FERTILIZING',
      status: 'COMPLETED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      estimatedDuration: 180, // 3 hours
      actualDuration: 165, // 2.75 hours
      estimatedCost: 900,
      actualCost: 920,
      assignedTo: [farmOperator.id],
      description: 'Apply pre-plant fertilizer to Field A',
      instructions: 'Apply NPK 15-15-15 at 200 kg per hectare. Use broadcast spreader.',
      safetyNotes: 'Wear protective equipment. Avoid windy conditions.',
      resources: [
        { type: 'equipment', resourceId: 'tractor-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'broadcast-spreader-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'npk-fertilizer-001', quantity: 500, unit: 'kg' }
      ],
      actualResources: [
        { type: 'equipment', resourceId: 'tractor-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'broadcast-spreader-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'npk-fertilizer-001', quantity: 520, unit: 'kg' }
      ],
      results: {
        quality: 'good',
        quantityAchieved: 25, // acres fertilized
        notes: 'Fertilizer applied evenly. Good soil incorporation.'
      }
    },
    {
      name: 'Side-Dress Fertilizer - Field A',
      type: 'FERTILIZING',
      status: 'PLANNED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      estimatedDuration: 240, // 4 hours
      estimatedCost: 1200,
      assignedTo: [farmOperator.id],
      description: 'Apply side-dress nitrogen to wheat in Field A',
      instructions: 'Apply urea at 100 kg per hectare when wheat is 6-8 inches tall.',
      safetyNotes: 'Apply when soil is moist. Avoid contact with plant leaves.',
      resources: [
        { type: 'equipment', resourceId: 'tractor-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'side-dress-applicator-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'urea-fertilizer-001', quantity: 250, unit: 'kg' }
      ]
    },

    // IRRIGATION ACTIVITIES
    {
      name: 'Field A - Sprinkler Irrigation',
      type: 'IRRIGATION',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      estimatedDuration: 480, // 8 hours
      estimatedCost: 600,
      assignedTo: [farmOperator.id],
      description: 'Water wheat field using center pivot irrigation',
      instructions: 'Apply 1 inch of water. Check soil moisture before and after.',
      safetyNotes: 'Monitor water pressure. Check for leaks regularly.',
      resources: [
        { type: 'equipment', resourceId: 'center-pivot-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'water-supply-001', quantity: 10000, unit: 'gallons' }
      ],
      percentComplete: 75
    },
    {
      name: 'Field B - Drip Irrigation Setup',
      type: 'IRRIGATION',
      status: 'PLANNED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      estimatedDuration: 360, // 6 hours
      estimatedCost: 1500,
      assignedTo: [farmOperator.id, farmManager.id],
      description: 'Install drip irrigation system in Field B',
      instructions: 'Install main lines and emitters. Test system thoroughly.',
      safetyNotes: 'Handle pipes carefully. Use proper connectors.',
      resources: [
        { type: 'equipment', resourceId: 'trenching-tool-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'drip-tubing-001', quantity: 2000, unit: 'feet' },
        { type: 'material', resourceId: 'emitters-001', quantity: 500, unit: 'pieces' }
      ]
    },

    // PEST CONTROL ACTIVITIES
    {
      name: 'Aphid Control - Field A',
      type: 'PEST_CONTROL',
      status: 'COMPLETED',
      priority: 'URGENT',
      scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      estimatedDuration: 300, // 5 hours
      actualDuration: 320, // 5.3 hours
      estimatedCost: 800,
      actualCost: 850,
      assignedTo: [farmOperator.id],
      description: 'Spray insecticide to control aphid infestation',
      instructions: 'Apply pyrethroid insecticide at recommended rate. Cover all plant surfaces.',
      safetyNotes: 'Wear full protective equipment. Check wind conditions. Re-entry interval 24 hours.',
      resources: [
        { type: 'equipment', resourceId: 'sprayer-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'tractor-002', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'pyrethroid-insecticide-001', quantity: 5, unit: 'liters' }
      ],
      actualResources: [
        { type: 'equipment', resourceId: 'sprayer-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'tractor-002', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'pyrethroid-insecticide-001', quantity: 5.2, unit: 'liters' }
      ],
      results: {
        quality: 'excellent',
        quantityAchieved: 25, // acres treated
        notes: 'Aphid population significantly reduced. No phytotoxicity observed.'
      }
    },
    {
      name: 'Weed Control - Field C',
      type: 'PEST_CONTROL',
      status: 'SCHEDULED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      estimatedDuration: 240, // 4 hours
      estimatedCost: 700,
      assignedTo: [farmOperator.id],
      description: 'Apply herbicide for weed control in Field C',
      instructions: 'Apply glyphosate herbicide before planting. Use boom sprayer.',
      safetyNotes: 'Check weather forecast. Avoid drift to non-target areas.',
      resources: [
        { type: 'equipment', resourceId: 'boom-sprayer-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'tractor-001', quantity: 1, unit: 'unit' },
        { type: 'material', resourceId: 'glyphosate-herbicide-001', quantity: 10, unit: 'liters' }
      ]
    },

    // HARVESTING ACTIVITIES
    {
      name: 'Wheat Harvest - Field A',
      type: 'HARVESTING',
      status: 'SCHEDULED',
      priority: 'URGENT',
      scheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      estimatedDuration: 720, // 12 hours
      estimatedCost: 3000,
      assignedTo: [farmOperator.id, farmManager.id],
      description: 'Harvest wheat from Field A using combine harvester',
      instructions: 'Check grain moisture content. Adjust combine settings for optimal threshing.',
      safetyNotes: 'Ensure all safety guards are in place. Check for bystanders.',
      resources: [
        { type: 'equipment', resourceId: 'combine-harvester-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'grain-cart-001', quantity: 1, unit: 'unit' },
        { type: 'labor', resourceId: 'harvest-crew-001', quantity: 3, unit: 'people' }
      ]
    },
    {
      name: 'Corn Harvest - Field C',
      type: 'HARVESTING',
      status: 'PLANNED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      estimatedDuration: 600, // 10 hours
      estimatedCost: 2500,
      assignedTo: [farmOperator.id],
      description: 'Harvest corn from Field C',
      instructions: 'Check kernel moisture. Adjust combine for corn settings.',
      safetyNotes: 'Check for lodged corn. Work carefully around obstacles.',
      resources: [
        { type: 'equipment', resourceId: 'corn-head-001', quantity: 1, unit: 'unit' },
        { type: 'equipment', resourceId: 'combine-harvester-001', quantity: 1, unit: 'unit' }
      ]
    },

    // MONITORING ACTIVITIES
    {
      name: 'Crop Health Assessment - Field A',
      type: 'MONITORING',
      status: 'COMPLETED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 hours ago
      estimatedDuration: 120, // 2 hours
      actualDuration: 105, // 1.75 hours
      estimatedCost: 200,
      actualCost: 200,
      assignedTo: [farmManager.id],
      description: 'Assess crop health and growth stage in Field A',
      instructions: 'Walk field systematically. Check for diseases, pests, and nutrient deficiencies.',
      safetyNotes: 'Wear appropriate footwear. Watch for uneven terrain.',
      resources: [
        { type: 'equipment', resourceId: 'field-scout-kit-001', quantity: 1, unit: 'unit' },
        { type: 'labor', resourceId: 'scout-001', quantity: 1, unit: 'person' }
      ],
      actualResources: [
        { type: 'equipment', resourceId: 'field-scout-kit-001', quantity: 1, unit: 'unit' },
        { type: 'labor', resourceId: 'scout-001', quantity: 1, unit: 'person' }
      ],
      results: {
        quality: 'good',
        quantityAchieved: 25, // acres scouted
        notes: 'Crop looking healthy. Minor aphid damage noted. No major issues.'
      }
    },
    {
      name: 'Soil Moisture Monitoring',
      type: 'MONITORING',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      estimatedDuration: 90, // 1.5 hours
      estimatedCost: 150,
      assignedTo: [farmManager.id],
      description: 'Check soil moisture levels across all fields',
      instructions: 'Use soil moisture probe. Take readings at 6 inch depth.',
      safetyNotes: 'Handle probe carefully. Clean after each use.',
      resources: [
        { type: 'equipment', resourceId: 'soil-moisture-probe-001', quantity: 1, unit: 'unit' }
      ],
      percentComplete: 40
    },

    // MAINTENANCE ACTIVITIES
    {
      name: 'Tractor Service - Tractor 001',
      type: 'MAINTENANCE',
      status: 'COMPLETED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
      estimatedDuration: 240, // 4 hours
      actualDuration: 220, // 3.7 hours
      estimatedCost: 500,
      actualCost: 480,
      assignedTo: [farmOperator.id],
      description: 'Regular maintenance service for Tractor 001',
      instructions: 'Change oil, filters, and fluids. Check all systems.',
      safetyNotes: 'Ensure tractor is off and cool. Use proper lifting equipment.',
      resources: [
        { type: 'equipment', resourceId: 'maintenance-tools-001', quantity: 1, unit: 'set' },
        { type: 'material', resourceId: 'engine-oil-001', quantity: 8, unit: 'liters' },
        { type: 'material', resourceId: 'oil-filter-001', quantity: 1, unit: 'piece' }
      ],
      actualResources: [
        { type: 'equipment', resourceId: 'maintenance-tools-001', quantity: 1, unit: 'set' },
        { type: 'material', resourceId: 'engine-oil-001', quantity: 8, unit: 'liters' },
        { type: 'material', resourceId: 'oil-filter-001', quantity: 1, unit: 'piece' }
      ],
      results: {
        quality: 'excellent',
        quantityAchieved: 1, // tractor serviced
        notes: 'Tractor in excellent condition. All systems functioning properly.'
      }
    },
    {
      name: 'Irrigation System Maintenance',
      type: 'MAINTENANCE',
      status: 'PLANNED',
      priority: 'LOW',
      scheduledAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
      estimatedDuration: 300, // 5 hours
      estimatedCost: 800,
      assignedTo: [farmOperator.id],
      description: 'Maintain and repair irrigation equipment',
      instructions: 'Check pumps, pipes, and emitters. Replace worn parts.',
      safetyNotes: 'Turn off water supply. Check electrical connections.',
      resources: [
        { type: 'equipment', resourceId: 'maintenance-tools-002', quantity: 1, unit: 'set' },
        { type: 'material', resourceId: 'replacement-parts-001', quantity: 1, unit: 'kit' }
      ]
    },

    // OTHER ACTIVITIES
    {
      name: 'Farm Record Keeping',
      type: 'OTHER',
      status: 'IN_PROGRESS',
      priority: 'LOW',
      scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      estimatedDuration: 120, // 2 hours
      estimatedCost: 100,
      assignedTo: [farmManager.id],
      description: 'Update farm records and documentation',
      instructions: 'Record all activities, costs, and observations in farm management system.',
      safetyNotes: 'Ensure data backup. Use secure login credentials.',
      resources: [
        { type: 'equipment', resourceId: 'computer-001', quantity: 1, unit: 'unit' },
        { type: 'labor', resourceId: 'admin-001', quantity: 1, unit: 'person' }
      ],
      percentComplete: 30
    },
    {
      name: 'Equipment Training Session',
      type: 'OTHER',
      status: 'PLANNED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      estimatedDuration: 180, // 3 hours
      estimatedCost: 300,
      assignedTo: [farmOperator.id, farmManager.id],
      description: 'Training session on new equipment operation',
      instructions: 'Review safety procedures and operating manuals for new equipment.',
      safetyNotes: 'Follow all safety protocols. Ask questions if unsure.',
      resources: [
        { type: 'equipment', resourceId: 'training-materials-001', quantity: 1, unit: 'set' },
        { type: 'labor', resourceId: 'trainer-001', quantity: 1, unit: 'person' }
      ]
    }
  ];

  // Create activities
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
          resources: activityInfo.resources || [],
          actualResources: activityInfo.actualResources || [],
          percentComplete: activityInfo.percentComplete || (activityInfo.status === 'COMPLETED' ? 100 : 0),
          results: activityInfo.results || null
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

    // Add cost entries for activities
    if (activityInfo.status === 'COMPLETED' && activityInfo.actualCost) {
      // Labor costs (60% of total)
      await prisma.activityCost.create({
        data: {
          activityId: activity.id,
          type: 'LABOR',
          description: 'Labor costs for activity execution',
          amount: activityInfo.actualCost * 0.6,
          createdById: farmManager.id
        }
      });

      // Equipment costs (25% of total)
      await prisma.activityCost.create({
        data: {
          activityId: activity.id,
          type: 'EQUIPMENT',
          description: 'Equipment usage and fuel costs',
          amount: activityInfo.actualCost * 0.25,
          createdById: farmManager.id
        }
      });

      // Material costs (15% of total)
      await prisma.activityCost.create({
        data: {
          activityId: activity.id,
          type: 'MATERIAL',
          description: 'Materials and supplies used',
          amount: activityInfo.actualCost * 0.15,
          createdById: farmManager.id
        }
      });
    } else if (activityInfo.estimatedCost) {
      // Add estimated costs for planned/scheduled activities
      await prisma.activityCost.create({
        data: {
          activityId: activity.id,
          type: 'LABOR',
          description: 'Estimated labor costs',
          amount: activityInfo.estimatedCost * 0.6,
          createdById: farmManager.id
        }
      });
    }

    // Add activity notes for completed activities
    if (activityInfo.status === 'COMPLETED') {
      await prisma.activityNote.create({
        data: {
          activityId: activity.id,
          userId: farmManager.id,
          content: `Activity completed successfully. ${activityInfo.results?.notes || 'No issues encountered.'}`,
          type: 'OBSERVATION',
          isPrivate: false
        }
      });

      // Add progress log for completed activities
      await prisma.activityProgressLog.create({
        data: {
          activityId: activity.id,
          userId: farmManager.id,
          percentComplete: 100,
          notes: 'Activity completed as planned',
          timestamp: activityInfo.completedAt || new Date()
        }
      });
    }

    // Add progress logs for in-progress activities
    if (activityInfo.status === 'IN_PROGRESS' && activityInfo.percentComplete) {
      await prisma.activityProgressLog.create({
        data: {
          activityId: activity.id,
          userId: farmOperator.id,
          percentComplete: activityInfo.percentComplete,
          notes: `Activity in progress. Currently ${activityInfo.percentComplete}% complete.`,
          timestamp: new Date()
        }
      });
    }

    activities.push(activity);
  }

  console.log(`✅ Created ${activities.length} comprehensive sample activities`);
  return activities;
}

async function initializeActivityTemplates(organizations: any[]) {
  console.log('📋 Initializing activity templates...');
  
  const templates = [];
  const farmOrg = organizations.find(o => o.type === 'FARM_OPERATION');
  
  if (!farmOrg) {
    console.log('⚠️  Skipping activity templates - missing farm organization');
    return [];
  }

  const templateData = [
    // System templates (available to all organizations)
    {
      name: 'Wheat Planting Template',
      type: 'PLANTING',
      description: 'Standard wheat planting procedure',
      defaultDuration: 360, // 6 hours
      instructions: 'Plant wheat seeds at 1.5 inch depth with 6 inch row spacing. Use certified seeds and ensure proper soil moisture.',
      safetyNotes: 'Ensure seeder is calibrated correctly. Check seed flow regularly. Wear appropriate safety gear.',
      applicableCrops: ['Wheat', 'Barley', 'Oats'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Corn Planting Template',
      type: 'PLANTING',
      description: 'Standard corn planting procedure',
      defaultDuration: 420, // 7 hours
      instructions: 'Plant corn seeds at 2 inch depth with 30 inch row spacing. Use hybrid seeds and check soil temperature.',
      safetyNotes: 'Check weather forecast. Avoid planting in wet conditions. Ensure proper seed depth.',
      applicableCrops: ['Corn', 'Maize'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Deep Plowing Template',
      type: 'LAND_PREP',
      description: 'Deep plowing for soil preparation',
      defaultDuration: 480, // 8 hours
      instructions: 'Use deep plow to turn soil 12-15 inches deep. Check for rocks and debris. Ensure proper depth.',
      safetyNotes: 'Ensure tractor is in good condition. Watch for underground utilities. Check equipment before starting.',
      applicableCrops: ['All'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Fertilizer Application Template',
      type: 'FERTILIZING',
      description: 'Standard fertilizer application procedure',
      defaultDuration: 240, // 4 hours
      instructions: 'Apply fertilizer according to soil test recommendations. Use broadcast spreader for even distribution.',
      safetyNotes: 'Wear protective equipment. Avoid windy conditions. Check calibration before application.',
      applicableCrops: ['All'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Pest Control Spraying Template',
      type: 'PEST_CONTROL',
      description: 'Pesticide application for pest control',
      defaultDuration: 300, // 5 hours
      instructions: 'Apply pesticide at recommended rate. Cover all plant surfaces evenly. Check wind conditions.',
      safetyNotes: 'Wear full protective equipment. Check wind conditions. Observe re-entry intervals. Store chemicals safely.',
      applicableCrops: ['All'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Irrigation Setup Template',
      type: 'IRRIGATION',
      description: 'Irrigation system setup and operation',
      defaultDuration: 360, // 6 hours
      instructions: 'Set up irrigation system according to field layout. Test all components before operation.',
      safetyNotes: 'Check water pressure. Monitor for leaks. Ensure proper electrical connections.',
      applicableCrops: ['All'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Crop Monitoring Template',
      type: 'MONITORING',
      description: 'Regular crop health and growth monitoring',
      defaultDuration: 120, // 2 hours
      instructions: 'Walk field systematically. Check for diseases, pests, and nutrient deficiencies. Document findings.',
      safetyNotes: 'Wear appropriate footwear. Watch for uneven terrain. Use proper sampling techniques.',
      applicableCrops: ['All'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Equipment Maintenance Template',
      type: 'MAINTENANCE',
      description: 'Regular equipment maintenance and service',
      defaultDuration: 240, // 4 hours
      instructions: 'Change oil, filters, and fluids. Check all systems and components. Lubricate moving parts.',
      safetyNotes: 'Ensure equipment is off and cool. Use proper lifting equipment. Follow lockout procedures.',
      applicableCrops: ['All'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Wheat Harvest Template',
      type: 'HARVESTING',
      description: 'Wheat harvesting with combine harvester',
      defaultDuration: 720, // 12 hours
      instructions: 'Check grain moisture content. Adjust combine settings for optimal threshing. Monitor grain quality.',
      safetyNotes: 'Ensure all safety guards are in place. Check for bystanders. Monitor equipment temperature.',
      applicableCrops: ['Wheat', 'Barley', 'Oats'],
      isSystem: true,
      organizationId: null
    },
    {
      name: 'Soil Testing Template',
      type: 'MONITORING',
      description: 'Soil sampling and testing procedure',
      defaultDuration: 180, // 3 hours
      instructions: 'Take soil samples from 10 different locations. Send to lab for analysis. Document sample locations.',
      safetyNotes: 'Use clean sampling tools. Label samples properly. Avoid contamination.',
      applicableCrops: ['All'],
      isSystem: true,
      organizationId: null
    },

    // Organization-specific templates
    {
      name: 'FarmPro Demo - Organic Wheat Planting',
      type: 'PLANTING',
      description: 'Organic wheat planting procedure for FarmPro Demo Farm',
      defaultDuration: 400, // 6.7 hours
      instructions: 'Plant organic wheat seeds at 1.5 inch depth. Use only certified organic seeds. Apply organic fertilizer if needed.',
      safetyNotes: 'Ensure all materials are certified organic. Check organic certification requirements.',
      applicableCrops: ['Organic Wheat'],
      isSystem: false,
      organizationId: farmOrg.id
    },
    {
      name: 'FarmPro Demo - Precision Agriculture Monitoring',
      type: 'MONITORING',
      description: 'Advanced monitoring using precision agriculture tools',
      defaultDuration: 180, // 3 hours
      instructions: 'Use GPS-guided equipment for precise monitoring. Collect data for analysis. Update farm management system.',
      safetyNotes: 'Ensure GPS equipment is calibrated. Check data accuracy. Backup all collected data.',
      applicableCrops: ['All'],
      isSystem: false,
      organizationId: farmOrg.id
    },
    {
      name: 'FarmPro Demo - Sustainable Irrigation',
      type: 'IRRIGATION',
      description: 'Water-efficient irrigation practices',
      defaultDuration: 300, // 5 hours
      instructions: 'Use soil moisture sensors to optimize irrigation timing. Apply water efficiently to reduce waste.',
      safetyNotes: 'Monitor water usage. Check for leaks regularly. Follow water conservation guidelines.',
      applicableCrops: ['All'],
      isSystem: false,
      organizationId: farmOrg.id
    }
  ];

  for (const templateInfo of templateData) {
    const template = await prisma.activityTemplate.create({
      data: {
        name: templateInfo.name,
        type: templateInfo.type,
        description: templateInfo.description,
        defaultDuration: templateInfo.defaultDuration,
        instructions: templateInfo.instructions,
        safetyNotes: templateInfo.safetyNotes,
        applicableCrops: templateInfo.applicableCrops,
        isSystem: templateInfo.isSystem,
        organizationId: templateInfo.organizationId,
        metadata: {
          createdBy: 'system',
          version: '1.0',
          lastUsed: null,
          usageCount: 0
        }
      }
    });
    templates.push(template);
  }

  console.log(`✅ Created ${templates.length} activity templates`);
  return templates;
}

async function initializeSampleInventory(organizations: any[], farms: any[], commodities: any[], users: any[]) {
  console.log('📦 Initializing comprehensive sample inventory...');
  
  const inventoryItems = [];
  const farm = farms[0]; // Use first farm
  const farmManager = users.find(u => u.email === 'manager@farmpro.app');
  const farmOperator = users.find(u => u.email === 'operator@farmpro.app');
  
  if (!farm || !farmManager || !farmOperator) {
    console.log('⚠️  Skipping inventory - missing farm or users');
    return [];
  }

  // Get commodities for inventory
  const wheat = commodities.find(c => c.name === 'Organic Wheat');
  const corn = commodities.find(c => c.name === 'Sweet Corn');
  const soybeans = commodities.find(c => c.name === 'Soybeans');
  const tomatoes = commodities.find(c => c.name === 'Tomatoes');
  const potatoes = commodities.find(c => c.name === 'Potatoes');

  if (!wheat || !corn || !soybeans || !tomatoes || !potatoes) {
    console.log('⚠️  Skipping inventory - missing commodities');
    return [];
  }

  // Comprehensive inventory data
  const inventoryData = [
    // WHEAT INVENTORY
    {
      commodityId: wheat.id,
      quantity: 2500,
      unit: 'bushels',
      quality: 'premium',
      location: 'Main Storage Shed - Section A',
      status: 'AVAILABLE',
      batchNumber: 'WHT-2024-001',
      harvestDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), // 300 days from now
      costBasis: 8.50,
      storageConditions: {
        temperature: 15,
        humidity: 60,
        requirements: 'Cool, dry storage. Monitor for pests.'
      },
      metadata: {
        moisture: 12.5,
        protein: 14.2,
        testWeight: 60.5,
        certifications: ['Organic', 'Non-GMO'],
        gradeReason: 'market_demand',
        gradeEvidence: ['lab_test_001', 'quality_cert_001'],
        gradeAssessedBy: farmManager.id,
        certifiedGrade: 'Premium Grade A'
      }
    },
    {
      commodityId: wheat.id,
      quantity: 1800,
      unit: 'bushels',
      quality: 'grade_a',
      location: 'Main Storage Shed - Section B',
      status: 'RESERVED',
      batchNumber: 'WHT-2024-002',
      harvestDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      expiryDate: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000), // 320 days from now
      costBasis: 8.20,
      storageConditions: {
        temperature: 16,
        humidity: 58,
        requirements: 'Cool, dry storage. Regular inspection required.'
      },
      metadata: {
        moisture: 13.2,
        protein: 13.8,
        testWeight: 59.8,
        certifications: ['Organic'],
        reservedFor: 'Order ORD-2024-001',
        reservedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    },
    {
      commodityId: wheat.id,
      quantity: 500,
      unit: 'bushels',
      quality: 'grade_b',
      location: 'Secondary Storage - Section C',
      status: 'AVAILABLE',
      batchNumber: 'WHT-2024-003',
      harvestDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      expiryDate: new Date(Date.now() + 310 * 24 * 60 * 60 * 1000), // 310 days from now
      costBasis: 7.80,
      storageConditions: {
        temperature: 18,
        humidity: 65,
        requirements: 'Monitor for moisture. Check weekly.'
      },
      metadata: {
        moisture: 14.1,
        protein: 13.2,
        testWeight: 58.5,
        certifications: ['Organic'],
        notes: 'Lower grade due to weather conditions during harvest'
      }
    },

    // CORN INVENTORY
    {
      commodityId: corn.id,
      quantity: 1200,
      unit: 'crates',
      quality: 'premium',
      location: 'Cold Storage Unit - Chamber 1',
      status: 'AVAILABLE',
      batchNumber: 'CRN-2024-001',
      harvestDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      costBasis: 12.00,
      storageConditions: {
        temperature: 2,
        humidity: 85,
        requirements: 'Refrigerated storage. Maintain cold chain.'
      },
      metadata: {
        moisture: 70,
        sugar: 18.5,
        size: 'Large',
        certifications: ['Fresh', 'Grade A'],
        gradeReason: 'upgrade',
        gradeEvidence: ['sugar_test_001', 'size_analysis_001'],
        gradeAssessedBy: farmManager.id,
        certifiedGrade: 'Premium Sweet Corn'
      }
    },
    {
      commodityId: corn.id,
      quantity: 800,
      unit: 'crates',
      quality: 'grade_a',
      location: 'Cold Storage Unit - Chamber 2',
      status: 'SOLD',
      batchNumber: 'CRN-2024-002',
      harvestDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      costBasis: 11.50,
      storageConditions: {
        temperature: 3,
        humidity: 80,
        requirements: 'Refrigerated storage. Monitor temperature.'
      },
      metadata: {
        moisture: 72,
        sugar: 17.8,
        size: 'Medium',
        certifications: ['Fresh'],
        soldTo: 'EcoFood Industries',
        soldDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        orderId: 'ORD-2024-002'
      }
    },

    // SOYBEANS INVENTORY
    {
      commodityId: soybeans.id,
      quantity: 3500,
      unit: 'bushels',
      quality: 'premium',
      location: 'Main Storage Shed - Section D',
      status: 'AVAILABLE',
      batchNumber: 'SB-2024-001',
      harvestDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000), // 400 days from now
      costBasis: 15.20,
      storageConditions: {
        temperature: 12,
        humidity: 55,
        requirements: 'Dry storage. Monitor for moisture and pests.'
      },
      metadata: {
        moisture: 11.8,
        protein: 36.5,
        oil: 19.2,
        certifications: ['Non-GMO', 'Roundup Ready'],
        gradeReason: 'retest',
        gradeEvidence: ['protein_test_001', 'oil_analysis_001'],
        gradeAssessedBy: farmManager.id,
        certifiedGrade: 'Premium Grade 1'
      }
    },
    {
      commodityId: soybeans.id,
      quantity: 1500,
      unit: 'bushels',
      quality: 'grade_a',
      location: 'Secondary Storage - Section E',
      status: 'CONSUMED',
      batchNumber: 'SB-2024-002',
      harvestDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
      expiryDate: new Date(Date.now() + 380 * 24 * 60 * 60 * 1000), // 380 days from now
      costBasis: 14.80,
      storageConditions: {
        temperature: 14,
        humidity: 60,
        requirements: 'Dry storage. Regular inspection.'
      },
      metadata: {
        moisture: 12.5,
        protein: 35.8,
        oil: 18.9,
        certifications: ['Non-GMO'],
        consumedFor: 'Processing',
        consumedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        consumedBy: farmOperator.id
      }
    },

    // TOMATOES INVENTORY
    {
      commodityId: tomatoes.id,
      quantity: 150,
      unit: 'boxes',
      quality: 'premium',
      location: 'Cold Storage Unit - Chamber 3',
      status: 'AVAILABLE',
      batchNumber: 'TOM-2024-001',
      harvestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      costBasis: 25.00,
      storageConditions: {
        temperature: 8,
        humidity: 90,
        requirements: 'Refrigerated storage. Handle with care.'
      },
      metadata: {
        moisture: 95,
        brix: 4.8,
        size: 'Large',
        color: 'Deep Red',
        certifications: ['Fresh', 'Grade A'],
        gradeReason: 'upgrade',
        gradeEvidence: ['brix_test_001', 'color_analysis_001'],
        gradeAssessedBy: farmManager.id,
        certifiedGrade: 'Premium Roma Tomatoes'
      }
    },
    {
      commodityId: tomatoes.id,
      quantity: 100,
      unit: 'boxes',
      quality: 'grade_a',
      location: 'Cold Storage Unit - Chamber 4',
      status: 'EXPIRED',
      batchNumber: 'TOM-2024-002',
      harvestDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (expired)
      costBasis: 22.00,
      storageConditions: {
        temperature: 10,
        humidity: 85,
        requirements: 'Refrigerated storage. Monitor for spoilage.'
      },
      metadata: {
        moisture: 92,
        brix: 4.2,
        size: 'Medium',
        color: 'Red',
        certifications: ['Fresh'],
        expiredReason: 'Natural spoilage',
        disposalDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        disposalMethod: 'Compost'
      }
    },

    // POTATOES INVENTORY
    {
      commodityId: potatoes.id,
      quantity: 400,
      unit: 'bags',
      quality: 'premium',
      location: 'Root Cellar - Section A',
      status: 'AVAILABLE',
      batchNumber: 'POT-2024-001',
      harvestDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
      costBasis: 18.50,
      storageConditions: {
        temperature: 4,
        humidity: 95,
        requirements: 'Cool, humid storage. Dark environment.'
      },
      metadata: {
        moisture: 80,
        size: 'Large',
        variety: 'Russet',
        certifications: ['Fresh', 'Grade A'],
        gradeReason: 'market_demand',
        gradeEvidence: ['size_test_001', 'quality_inspection_001'],
        gradeAssessedBy: farmManager.id,
        certifiedGrade: 'Premium Russet Potatoes'
      }
    },
    {
      commodityId: potatoes.id,
      quantity: 200,
      unit: 'bags',
      quality: 'grade_b',
      location: 'Root Cellar - Section B',
      status: 'AVAILABLE',
      batchNumber: 'POT-2024-002',
      harvestDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), // 55 days ago
      expiryDate: new Date(Date.now() + 110 * 24 * 60 * 60 * 1000), // 110 days from now
      costBasis: 16.00,
      storageConditions: {
        temperature: 5,
        humidity: 90,
        requirements: 'Cool, humid storage. Regular inspection.'
      },
      metadata: {
        moisture: 78,
        size: 'Medium',
        variety: 'Russet',
        certifications: ['Fresh'],
        notes: 'Some minor blemishes, suitable for processing'
      }
    },

    // ADDITIONAL WHEAT BATCHES FOR TESTING
    {
      commodityId: wheat.id,
      quantity: 1000,
      unit: 'bushels',
      quality: 'standard',
      location: 'Temporary Storage - Field Edge',
      status: 'AVAILABLE',
      batchNumber: 'WHT-2024-004',
      harvestDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      expiryDate: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000), // 280 days from now
      costBasis: 7.20,
      storageConditions: {
        temperature: 20,
        humidity: 70,
        requirements: 'Temporary storage. Move to main facility soon.'
      },
      metadata: {
        moisture: 15.2,
        protein: 12.8,
        testWeight: 57.2,
        certifications: ['Organic'],
        notes: 'Lower grade due to late harvest conditions',
        needsTransfer: true
      }
    },

    // PROCESSED PRODUCTS
    {
      commodityId: wheat.id,
      quantity: 500,
      unit: 'bushels',
      quality: 'premium',
      location: 'Processing Facility - Mill Storage',
      status: 'RESERVED',
      batchNumber: 'WHT-MILL-2024-001',
      harvestDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      expiryDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000), // 200 days from now
      costBasis: 9.50,
      storageConditions: {
        temperature: 18,
        humidity: 50,
        requirements: 'Milled product storage. Airtight containers.'
      },
      metadata: {
        moisture: 10.5,
        protein: 14.5,
        testWeight: 61.0,
        certifications: ['Organic', 'Milled', 'Grade A'],
        processedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        reservedFor: 'Premium Flour Production',
        reservedUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    }
  ];

  // Create inventory items
  for (const itemData of inventoryData) {
    const inventoryItem = await prisma.inventory.create({
      data: {
        organizationId: farm.organizationId,
        farmId: farm.id,
        commodityId: itemData.commodityId,
        quantity: itemData.quantity,
        unit: itemData.unit,
        quality: itemData.quality,
        location: itemData.location,
        status: itemData.status as any,
        metadata: {
          batchNumber: itemData.batchNumber,
          harvestDate: itemData.harvestDate,
          expiryDate: itemData.expiryDate,
          storageConditions: itemData.storageConditions,
          costBasis: itemData.costBasis,
          ...itemData.metadata
        }
      }
    });

    inventoryItems.push(inventoryItem);
  }

  console.log(`✅ Created ${inventoryItems.length} comprehensive inventory items`);
  return inventoryItems;
}

async function initializeSampleOrders(organizations: any[], farms: any[], commodities: any[], users: any[]) {
  console.log('📦 Initializing comprehensive sample orders...');
  
  const orders = [];
  const farmOrg = organizations.find(o => o.type === 'FARM_OPERATION');
  const tradingOrg = organizations.find(o => o.type === 'COMMODITY_TRADER');
  const logisticsOrg = organizations.find(o => o.type === 'LOGISTICS_PROVIDER');
  const farm = farms[0];
  const wheat = commodities.find(c => c.name === 'Organic Wheat');
  const corn = commodities.find(c => c.name === 'Sweet Corn');
  const soybeans = commodities.find(c => c.name === 'Soybeans');
  const tomatoes = commodities.find(c => c.name === 'Tomatoes');
  const potatoes = commodities.find(c => c.name === 'Potatoes');
  const farmManager = users.find(u => u.email === 'manager@farmpro.app');
  const farmOperator = users.find(u => u.email === 'operator@farmpro.app');
  
  if (!farmOrg || !tradingOrg || !farm || !wheat || !corn || !farmManager) {
    console.log('⚠️  Skipping orders - missing organizations, farm, commodities, or users');
    return [];
  }

  // Generate unique order numbers with timestamp
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const orderData = [
    // SELL ORDERS - Farm selling commodities
    {
      orderNumber: `ORD-${timestamp}-001`,
      title: 'Premium Wheat Sale - GrainSparkles Trading',
      description: 'High-quality organic wheat for premium market',
      type: 'SELL',
      status: 'CONFIRMED',
      commodityId: wheat.id,
      quantity: 500,
      pricePerUnit: 8.50,
      totalPrice: 4250,
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      deliveryLocation: 'GrainSparkles Trading Hub',
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
      },
      paymentTerms: 'Net 30 days',
      specialInstructions: 'Ensure proper grain moisture levels. Use certified organic transport.',
      terms: {
        qualityGrade: 'premium',
        moistureMax: 13.5,
        proteinMin: 14.0,
        organicCertified: true
      },
      confirmedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      metadata: {
        contractNumber: 'CON-2024-001',
        qualityCertification: 'Organic Grade A',
        transportMethod: 'Refrigerated Truck',
        insuranceRequired: true
      }
    },
    {
      orderNumber: `ORD-${timestamp}-002`,
      title: 'Sweet Corn Delivery - EcoFood Industries',
      description: 'Fresh sweet corn for retail distribution',
      type: 'SELL',
      status: 'IN_TRANSIT',
      commodityId: corn.id,
      quantity: 200,
      pricePerUnit: 12.00,
      totalPrice: 2400,
      deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      deliveryLocation: 'EcoFood Industries Distribution Center',
      buyerOrgId: tradingOrg.id,
      supplierOrgId: farmOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '1234 Food Processing Ave',
        city: 'Eco City',
        state: 'CA',
        zip: '90210',
        coordinates: { lat: 34.0522, lng: -118.2437 }
      },
      paymentTerms: 'COD',
      specialInstructions: 'Maintain cold chain throughout transport. Handle with care.',
      terms: {
        qualityGrade: 'grade_a',
        temperatureMax: 4,
        freshnessGuarantee: '48 hours',
        organicCertified: true
      },
      confirmedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      metadata: {
        contractNumber: 'CON-2024-002',
        transportProvider: 'ColdChain Logistics',
        trackingNumber: 'CCL-789456123',
        estimatedArrival: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
      }
    },
    {
      orderNumber: `ORD-${timestamp}-003`,
      title: 'Soybeans Bulk Sale - Premium Foods Ltd',
      description: 'Non-GMO soybeans for processing',
      type: 'SELL',
      status: 'PENDING',
      commodityId: soybeans.id,
      quantity: 1000,
      pricePerUnit: 15.20,
      totalPrice: 15200,
      deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      deliveryLocation: 'Premium Foods Processing Plant',
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
      },
      paymentTerms: 'Letter of Credit',
      specialInstructions: 'Ensure proper storage conditions. Quality inspection required.',
      terms: {
        qualityGrade: 'premium',
        proteinMin: 36.0,
        oilMin: 19.0,
        nonGMO: true,
        moistureMax: 12.0
      },
      metadata: {
        contractNumber: 'CON-2024-003',
        qualityInspection: 'Required',
        storageRequirements: 'Dry, cool storage',
        processingDestination: 'Soybean Oil Production'
      }
    },
    {
      orderNumber: `ORD-${timestamp}-004`,
      title: 'Tomatoes Fresh Sale - Local Market',
      description: 'Fresh tomatoes for local farmers market',
      type: 'SELL',
      status: 'DELIVERED',
      commodityId: tomatoes.id,
      quantity: 50,
      pricePerUnit: 25.00,
      totalPrice: 1250,
      deliveryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      deliveryLocation: 'Local Farmers Market',
      buyerOrgId: tradingOrg.id,
      supplierOrgId: farmOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '456 Market Square',
        city: 'Rural Valley',
        state: 'CA',
        zip: '90210',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      paymentTerms: 'Cash on Delivery',
      specialInstructions: 'Deliver early morning. Ensure freshness.',
      terms: {
        qualityGrade: 'premium',
        freshnessGuarantee: '24 hours',
        organicCertified: true,
        size: 'Large'
      },
      confirmedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      metadata: {
        contractNumber: 'CON-2024-004',
        deliveryMethod: 'Direct Farm to Market',
        customerSatisfaction: 'Excellent',
        repeatOrder: true
      }
    },
    {
      orderNumber: `ORD-${timestamp}-005`,
      title: 'Potatoes Wholesale - Restaurant Chain',
      description: 'Russet potatoes for restaurant chain',
      type: 'SELL',
      status: 'CANCELLED',
      commodityId: potatoes.id,
      quantity: 300,
      pricePerUnit: 18.50,
      totalPrice: 5550,
      deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      deliveryLocation: 'Restaurant Chain Distribution',
      buyerOrgId: tradingOrg.id,
      supplierOrgId: farmOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '789 Restaurant Row',
        city: 'Food City',
        state: 'FL',
        zip: '33101',
        coordinates: { lat: 25.7617, lng: -80.1918 }
      },
      paymentTerms: 'Net 15 days',
      specialInstructions: 'Size specification: Large to Extra Large only',
      terms: {
        qualityGrade: 'grade_a',
        sizeMin: 'Large',
        organicCertified: false,
        storageRequirements: 'Cool, dark storage'
      },
      confirmedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      metadata: {
        contractNumber: 'CON-2024-005',
        cancellationReason: 'Buyer requested cancellation due to supply chain issues',
        cancellationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        cancellationFee: 0
      }
    },

    // BUY ORDERS - Farm buying inputs and supplies
    {
      orderNumber: `ORD-${timestamp}-006`,
      title: 'Fertilizer Purchase - Spring Season',
      description: 'NPK fertilizer for spring planting season',
      type: 'BUY',
      status: 'CONFIRMED',
      commodityId: wheat.id, // Using wheat as placeholder for fertilizer
      quantity: 2000,
      pricePerUnit: 0.45,
      totalPrice: 900,
      deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      deliveryLocation: 'FarmPro Demo Farm',
      buyerOrgId: farmOrg.id,
      supplierOrgId: tradingOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '1234 Farm Road',
        city: 'Rural Valley',
        state: 'CA',
        zip: '90210',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      paymentTerms: 'Net 30 days',
      specialInstructions: 'Deliver to main storage shed. Use covered transport.',
      terms: {
        productType: 'NPK 15-15-15',
        organicCertified: true,
        applicationRate: '200kg per hectare',
        storageRequirements: 'Dry storage'
      },
      confirmedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      metadata: {
        contractNumber: 'CON-2024-006',
        supplier: 'AgriSupply Solutions',
        productCode: 'NPK-15-15-15-ORG',
        applicationSeason: 'Spring 2024'
      }
    },
    {
      orderNumber: `ORD-${timestamp}-007`,
      title: 'Seeds Purchase - Wheat Variety',
      description: 'Certified organic wheat seeds for planting',
      type: 'BUY',
      status: 'IN_TRANSIT',
      commodityId: wheat.id,
      quantity: 100,
      pricePerUnit: 2.50,
      totalPrice: 250,
      deliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      deliveryLocation: 'FarmPro Demo Farm',
      buyerOrgId: farmOrg.id,
      supplierOrgId: tradingOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '1234 Farm Road',
        city: 'Rural Valley',
        state: 'CA',
        zip: '90210',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      paymentTerms: 'Prepaid',
      specialInstructions: 'Handle with care. Maintain seed viability.',
      terms: {
        variety: 'Hard Red Winter Wheat',
        germinationRate: '95%',
        organicCertified: true,
        seedTreatment: 'None'
      },
      confirmedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      metadata: {
        contractNumber: 'CON-2024-007',
        supplier: 'SeedMaster Organic',
        variety: 'HRW-2024-ORG',
        plantingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    },
    {
      orderNumber: `ORD-${timestamp}-008`,
      title: 'Equipment Parts - Tractor Maintenance',
      description: 'Replacement parts for tractor maintenance',
      type: 'BUY',
      status: 'PENDING',
      commodityId: wheat.id, // Using wheat as placeholder for equipment parts
      quantity: 1,
      pricePerUnit: 150.00,
      totalPrice: 150,
      deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      deliveryLocation: 'FarmPro Demo Farm',
      buyerOrgId: farmOrg.id,
      supplierOrgId: tradingOrg.id,
      createdById: farmOperator.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '1234 Farm Road',
        city: 'Rural Valley',
        state: 'CA',
        zip: '90210',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      paymentTerms: 'Net 15 days',
      specialInstructions: 'Include installation instructions. Warranty required.',
      terms: {
        partNumber: 'TR-ENG-001',
        equipmentModel: 'John Deere 6120R',
        warrantyPeriod: '12 months',
        installationRequired: true
      },
      metadata: {
        contractNumber: 'CON-2024-008',
        supplier: 'Farm Equipment Solutions',
        partCategory: 'Engine Components',
        maintenanceSchedule: 'Scheduled Maintenance'
      }
    },

    // LOGISTICS ORDERS - Transportation and delivery
    {
      orderNumber: `ORD-${timestamp}-009`,
      title: 'Transportation Service - Wheat Delivery',
      description: 'Logistics service for wheat delivery to trading hub',
      type: 'BUY',
      status: 'CONFIRMED',
      commodityId: wheat.id,
      quantity: 1,
      pricePerUnit: 500.00,
      totalPrice: 500,
      deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      deliveryLocation: 'GrainSparkles Trading Hub',
      buyerOrgId: farmOrg.id,
      supplierOrgId: logisticsOrg?.id || tradingOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: '5678 Commerce Blvd',
        city: 'Trade City',
        state: 'TX',
        zip: '75001',
        coordinates: { lat: 32.7767, lng: -96.7970 }
      },
      paymentTerms: 'Upon delivery',
      specialInstructions: 'Use refrigerated transport. Maintain grain quality.',
      terms: {
        serviceType: 'Refrigerated Transport',
        distance: '500 miles',
        weightCapacity: '40,000 lbs',
        insuranceIncluded: true
      },
      confirmedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      metadata: {
        contractNumber: 'CON-2024-009',
        logisticsProvider: 'ColdChain Logistics',
        vehicleType: 'Refrigerated Truck',
        driverContact: 'John Smith - (555) 123-4567'
      }
    },

    // MARKETPLACE ORDERS - Public marketplace transactions
    {
      orderNumber: `ORD-${timestamp}-010`,
      title: 'Marketplace Corn Sale - Premium Quality',
      description: 'Premium sweet corn listed on marketplace',
      type: 'SELL',
      status: 'PENDING',
      commodityId: corn.id,
      quantity: 100,
      pricePerUnit: 15.00,
      totalPrice: 1500,
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      deliveryLocation: 'Customer Address',
      buyerOrgId: tradingOrg.id,
      supplierOrgId: farmOrg.id,
      createdById: farmManager.id,
      farmId: farm.id,
      deliveryAddress: {
        street: 'Customer Address',
        city: 'Various',
        state: 'Multiple',
        zip: '00000',
        coordinates: { lat: 0, lng: 0 }
      },
      paymentTerms: 'Online Payment',
      specialInstructions: 'Marketplace order. Handle with care.',
      terms: {
        qualityGrade: 'premium',
        marketplaceListing: true,
        customerRating: '4.8/5',
        organicCertified: true
      },
      isPublic: true,
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      metadata: {
        contractNumber: 'CON-2024-010',
        marketplace: 'FarmPro Marketplace',
        listingId: 'MP-2024-001',
        customerInquiries: 5,
        views: 25
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
        currency: orderInfo.buyerOrgId === farmOrg.id ? farmOrg.currency : 
                  orderInfo.supplierOrgId === farmOrg.id ? farmOrg.currency : 'USD'
      });

      // Create order item
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          commodityId: orderInfo.commodityId,
          quantity: orderInfo.quantity,
          unitPrice: orderInfo.pricePerUnit
        }
      });

      // Update order with additional fields if they exist
      if (orderInfo.description || orderInfo.paymentTerms || orderInfo.specialInstructions || orderInfo.terms || orderInfo.metadata) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            metadata: {
              description: orderInfo.description,
              paymentTerms: orderInfo.paymentTerms,
              specialInstructions: orderInfo.specialInstructions,
              terms: orderInfo.terms,
              confirmedAt: orderInfo.confirmedAt,
              acceptedAt: orderInfo.acceptedAt,
              completedAt: orderInfo.completedAt,
              publishedAt: orderInfo.publishedAt,
              isPublic: orderInfo.isPublic || false,
              ...orderInfo.metadata
            }
          }
        });
      }

      orders.push(order);
    } catch (error) {
      console.error(`❌ Failed to upsert order ${orderInfo.orderNumber}:`, error);
      // Continue with other orders instead of failing completely
    }
  }

  console.log(`✅ Created ${orders.length} comprehensive sample orders`);
  return orders;
}

async function initializeTransactionCategories(organizations: any[]) {
  console.log('📂 Initializing transaction categories...');
  
  const categories = [];
  
  // Define default transaction categories for each organization
  const defaultCategories = [
    // Income Categories
    {
      name: 'Crop Sales',
      description: 'Revenue from selling harvested crops',
      color: '#10B981', // Green
      isDefault: true
    },
    {
      name: 'Livestock Sales',
      description: 'Revenue from selling livestock and animal products',
      color: '#059669', // Darker green
      isDefault: true
    },
    {
      name: 'Service Revenue',
      description: 'Revenue from providing farming services',
      color: '#34D399', // Light green
      isDefault: true
    },
    {
      name: 'Government Subsidies',
      description: 'Government payments and agricultural subsidies',
      color: '#6EE7B7', // Very light green
      isDefault: true
    },
    
    // Expense Categories
    {
      name: 'Seeds & Planting',
      description: 'Costs for seeds, seedlings, and planting materials',
      color: '#EF4444', // Red
      isDefault: true
    },
    {
      name: 'Fertilizers & Soil',
      description: 'Fertilizers, soil amendments, and soil testing',
      color: '#F87171', // Light red
      isDefault: true
    },
    {
      name: 'Pest Control',
      description: 'Pesticides, herbicides, and pest management',
      color: '#FCA5A5', // Very light red
      isDefault: true
    },
    {
      name: 'Equipment & Machinery',
      description: 'Equipment purchases, rentals, and maintenance',
      color: '#DC2626', // Dark red
      isDefault: true
    },
    {
      name: 'Labor & Wages',
      description: 'Employee wages, contractor payments, and labor costs',
      color: '#B91C1C', // Darker red
      isDefault: true
    },
    {
      name: 'Fuel & Energy',
      description: 'Fuel, electricity, and energy costs',
      color: '#991B1B', // Very dark red
      isDefault: true
    },
    {
      name: 'Transportation',
      description: 'Shipping, delivery, and transportation costs',
      color: '#7F1D1D', // Darkest red
      isDefault: true
    },
    {
      name: 'Insurance',
      description: 'Farm insurance, equipment insurance, and liability coverage',
      color: '#FEE2E2', // Very light red
      isDefault: true
    },
    {
      name: 'Utilities',
      description: 'Water, electricity, internet, and other utilities',
      color: '#FECACA', // Light red
      isDefault: true
    },
    {
      name: 'Professional Services',
      description: 'Legal, accounting, consulting, and professional services',
      color: '#FCA5A5', // Medium light red
      isDefault: true
    },
    {
      name: 'Marketing & Sales',
      description: 'Marketing materials, advertising, and sales expenses',
      color: '#F87171', // Medium red
      isDefault: true
    },
    {
      name: 'Office & Administration',
      description: 'Office supplies, software, and administrative costs',
      color: '#EF4444', // Standard red
      isDefault: true
    },
    {
      name: 'Repairs & Maintenance',
      description: 'Building repairs, equipment maintenance, and upkeep',
      color: '#DC2626', // Dark red
      isDefault: true
    },
    {
      name: 'Training & Education',
      description: 'Training programs, courses, and educational materials',
      color: '#B91C1C', // Darker red
      isDefault: true
    },
    {
      name: 'Miscellaneous',
      description: 'Other expenses that don\'t fit into specific categories',
      color: '#991B1B', // Very dark red
      isDefault: true
    }
  ];

  // Create categories for each organization
  for (const organization of organizations) {
    console.log(`   Creating categories for ${organization.name}...`);
    
    for (const categoryData of defaultCategories) {
      try {
        const category = await prisma.transactionCategory.upsert({
          where: {
            name_organizationId: {
              name: categoryData.name,
              organizationId: organization.id
            }
          },
          update: {
            description: categoryData.description,
            color: categoryData.color,
            isDefault: categoryData.isDefault
          },
          create: {
            organizationId: organization.id,
            name: categoryData.name,
            description: categoryData.description,
            color: categoryData.color,
            isDefault: categoryData.isDefault
          }
        });
        
        categories.push(category);
      } catch (error) {
        console.log(`   ⚠️  Failed to create category "${categoryData.name}" for ${organization.name}:`, error.message);
      }
    }
  }

  console.log(`✅ Created ${categories.length} transaction categories across ${organizations.length} organizations`);
  console.log(`   - Income categories: ${defaultCategories.filter(c => ['Crop Sales', 'Livestock Sales', 'Service Revenue', 'Government Subsidies'].includes(c.name)).length} per organization`);
  console.log(`   - Expense categories: ${defaultCategories.filter(c => !['Crop Sales', 'Livestock Sales', 'Service Revenue', 'Government Subsidies'].includes(c.name)).length} per organization`);
  
  return categories;
}

async function initializeSampleTransactions(organizations: any[], farms: any[], orders: any[]) {
  console.log('💰 Initializing comprehensive sample transactions...');
  
  const transactions = [];
  const farmOrg = organizations.find(o => o.type === 'FARM_OPERATION');
  const farm = farms[0];
  const secondFarm = farms[1];
  
  if (!farmOrg || !farm) {
    console.log('⚠️  Skipping transactions - missing organization or farm');
    return [];
  }

  // Comprehensive transaction data covering all types and scenarios
  const transactionData = [
    // =============================================================================
    // FARM REVENUE TRANSACTIONS
    // =============================================================================
    {
      type: 'FARM_REVENUE',
      amount: 4250,
      description: 'Wheat sale revenue - Premium quality harvest',
      orderId: orders[0]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      metadata: {
        commodity: 'wheat',
        quantity: 85,
        quality: 'premium',
        buyer: 'GrainCo Ltd'
      }
    },
    {
      type: 'FARM_REVENUE',
      amount: 2400,
      description: 'Corn sale revenue - Standard grade',
      orderId: orders[1]?.id,
      farmId: farm.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      metadata: {
        commodity: 'corn',
        quantity: 60,
        quality: 'standard',
        buyer: 'FeedMill Inc'
      }
    },
    {
      type: 'FARM_REVENUE',
      amount: 1800,
      description: 'Soybean sale revenue - Organic certified',
      orderId: orders[2]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      metadata: {
        commodity: 'soybean',
        quantity: 45,
        quality: 'organic',
        certification: 'USDA Organic'
      }
    },
    {
      type: 'FARM_REVENUE',
      amount: 3200,
      description: 'Rice sale revenue - Basmati variety',
      farmId: secondFarm?.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      metadata: {
        commodity: 'rice',
        variety: 'basmati',
        quantity: 80,
        quality: 'premium'
      }
    },

    // =============================================================================
    // FARM EXPENSE TRANSACTIONS
    // =============================================================================
    {
      type: 'FARM_EXPENSE',
      amount: 1500,
      description: 'Equipment maintenance - Tractor service',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      metadata: {
        category: 'equipment',
        equipment: 'tractor',
        serviceType: 'routine_maintenance',
        vendor: 'ABC Equipment Co.',
        receipt: 'REC-001-2024'
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 800,
      description: 'Irrigation system costs - Water pump repair',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      metadata: {
        category: 'irrigation',
        equipment: 'water_pump',
        serviceType: 'repair',
        vendor: 'Irrigation Solutions Ltd'
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 1200,
      description: 'Pest control materials - Organic pesticides',
      farmId: farm.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      metadata: {
        category: 'pest_control',
        material: 'organic_pesticides',
        quantity: 50,
        unit: 'liters',
        vendor: 'EcoPest Solutions'
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 600,
      description: 'Soil testing lab fees - Comprehensive analysis',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      metadata: {
        category: 'testing',
        service: 'soil_analysis',
        lab: 'AgriLab Services',
        tests: ['pH', 'nutrients', 'organic_matter', 'microbial_activity']
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 2200,
      description: 'Fertilizer purchase - NPK blend',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      metadata: {
        category: 'fertilizer',
        type: 'NPK_blend',
        quantity: 100,
        unit: 'kg',
        vendor: 'AgriChem Supplies',
        receipt: 'REC-002-2024'
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 950,
      description: 'Labor costs - Seasonal workers',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      metadata: {
        category: 'labor',
        type: 'seasonal_workers',
        workers: 5,
        hours: 40,
        rate: 4.75
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 1800,
      description: 'Fuel costs - Diesel for machinery',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      metadata: {
        category: 'fuel',
        type: 'diesel',
        quantity: 200,
        unit: 'liters',
        vendor: 'FuelCo Station',
        receipt: 'REC-003-2024'
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 750,
      description: 'Seeds purchase - Hybrid corn seeds',
      farmId: secondFarm?.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      metadata: {
        category: 'seeds',
        type: 'hybrid_corn',
        quantity: 25,
        unit: 'kg',
        vendor: 'SeedMaster Corp'
      }
    },

    // =============================================================================
    // ORDER PAYMENT TRANSACTIONS
    // =============================================================================
    {
      type: 'ORDER_PAYMENT',
      amount: 3000,
      description: 'Payment for wheat order - Bank transfer',
      orderId: orders[0]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      metadata: {
        paymentMethod: 'bank_transfer',
        reference: 'BT-2024-001',
        bank: 'First Bank',
        account: '****1234'
      }
    },
    {
      type: 'ORDER_PAYMENT',
      amount: 2400,
      description: 'Payment for corn order - Mobile money',
      orderId: orders[1]?.id,
      farmId: farm.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      metadata: {
        paymentMethod: 'mobile_money',
        provider: 'MTN Mobile Money',
        phone: '+2348012345678'
      }
    },
    {
      type: 'ORDER_PAYMENT',
      amount: 1800,
      description: 'Payment for soybean order - Cash on delivery',
      orderId: orders[2]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      metadata: {
        paymentMethod: 'cash_on_delivery',
        deliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        driver: 'John Doe'
      }
    },

    // =============================================================================
    // PLATFORM FEE TRANSACTIONS
    // =============================================================================
    {
      type: 'PLATFORM_FEE',
      amount: 150,
      description: 'Platform commission fee - Wheat sale',
      orderId: orders[0]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      metadata: {
        feeType: 'commission',
        rate: 0.035, // 3.5%
        baseAmount: 4250,
        calculation: '4250 * 0.035 = 148.75'
      }
    },
    {
      type: 'PLATFORM_FEE',
      amount: 84,
      description: 'Platform commission fee - Corn sale',
      orderId: orders[1]?.id,
      farmId: farm.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      metadata: {
        feeType: 'commission',
        rate: 0.035, // 3.5%
        baseAmount: 2400,
        calculation: '2400 * 0.035 = 84'
      }
    },
    {
      type: 'PLATFORM_FEE',
      amount: 63,
      description: 'Platform commission fee - Soybean sale',
      orderId: orders[2]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      metadata: {
        feeType: 'commission',
        rate: 0.035, // 3.5%
        baseAmount: 1800,
        calculation: '1800 * 0.035 = 63'
      }
    },
    {
      type: 'PLATFORM_FEE',
      amount: 25,
      description: 'Platform listing fee - Premium listing',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      metadata: {
        feeType: 'listing',
        listingType: 'premium',
        duration: '30_days',
        features: ['priority_placement', 'analytics', 'promotion']
      }
    },

    // =============================================================================
    // REFUND TRANSACTIONS
    // =============================================================================
    {
      type: 'REFUND',
      amount: 500,
      description: 'Refund for cancelled order - Quality issue',
      orderId: orders[3]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      metadata: {
        reason: 'quality_issue',
        originalAmount: 500,
        refundMethod: 'bank_transfer',
        reference: 'REF-2024-001',
        approvedBy: 'admin@farmpro.com'
      }
    },
    {
      type: 'REFUND',
      amount: 200,
      description: 'Partial refund - Delivery delay compensation',
      orderId: orders[4]?.id,
      farmId: farm.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      metadata: {
        reason: 'delivery_delay',
        originalAmount: 1000,
        refundPercentage: 0.2,
        delayDays: 3,
        compensationType: 'partial_refund'
      }
    },

    // =============================================================================
    // FAILED TRANSACTIONS (for testing error scenarios)
    // =============================================================================
    {
      type: 'FARM_EXPENSE',
      amount: 300,
      description: 'Failed payment - Insufficient funds',
      farmId: farm.id,
      status: 'FAILED',
      metadata: {
        failureReason: 'insufficient_funds',
        attemptDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        retryCount: 3,
        lastAttempt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      type: 'ORDER_PAYMENT',
      amount: 1500,
      description: 'Failed payment - Network timeout',
      orderId: orders[5]?.id,
      farmId: farm.id,
      status: 'FAILED',
      metadata: {
        failureReason: 'network_timeout',
        attemptDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        retryCount: 2,
        lastAttempt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    },

    // =============================================================================
    // CANCELLED TRANSACTIONS
    // =============================================================================
    {
      type: 'FARM_EXPENSE',
      amount: 400,
      description: 'Cancelled order - Customer request',
      farmId: farm.id,
      status: 'CANCELLED',
      metadata: {
        cancellationReason: 'customer_request',
        cancelledAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        cancelledBy: 'customer@example.com',
        refundIssued: false
      }
    },

    // =============================================================================
    // ADDITIONAL TRANSACTIONS TO FILL GAPS
    // =============================================================================
    
    // More Seasonal Revenue
    {
      type: 'FARM_REVENUE',
      amount: 5500,
      description: 'Bulk tomato sale - Premium greenhouse harvest',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
      metadata: {
        commodity: 'tomato',
        quantity: 110,
        quality: 'premium',
        buyer: 'FreshMarket Chain',
        season: 'greenhouse',
        variety: 'cherry_tomatoes'
      }
    },
    {
      type: 'FARM_REVENUE',
      amount: 3200,
      description: 'Potato sale - Organic certified batch',
      farmId: secondFarm?.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      metadata: {
        commodity: 'potato',
        quantity: 80,
        quality: 'organic',
        certification: 'USDA Organic',
        buyer: 'Organic Foods Ltd',
        variety: 'russet'
      }
    },

    // Utility and Recurring Expenses
    {
      type: 'FARM_EXPENSE',
      amount: 450,
      description: 'Electricity bill - Farm operations',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      metadata: {
        category: 'utilities',
        type: 'electricity',
        period: 'monthly',
        usage: '1250_kwh',
        rate: 0.36,
        vendor: 'PowerGrid Utilities',
        billNumber: 'PG-2024-001'
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 280,
      description: 'Water bill - Irrigation system',
      farmId: farm.id,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      metadata: {
        category: 'utilities',
        type: 'water',
        period: 'monthly',
        usage: '8500_gallons',
        rate: 0.033,
        vendor: 'AquaFlow Water Co',
        billNumber: 'AF-2024-002'
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 350,
      description: 'Insurance premium - Farm equipment coverage',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      metadata: {
        category: 'insurance',
        type: 'equipment_coverage',
        period: 'quarterly',
        coverage: 'tractor_irrigation_machinery',
        provider: 'FarmGuard Insurance',
        policyNumber: 'FG-2024-001'
      }
    },

    // International Order Payment
    {
      type: 'ORDER_PAYMENT',
      amount: 8500,
      description: 'International payment - Export order to Europe',
      orderId: orders[6]?.id,
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      metadata: {
        paymentMethod: 'international_wire',
        originalCurrency: 'EUR',
        originalAmount: 7225, // 8500 USD * 0.85 EUR/USD
        exchangeRate: 0.85,
        bank: 'International Bank',
        swiftCode: 'INTLGB2L',
        reference: 'INT-2024-001',
        destination: 'Netherlands'
      }
    },

    // Subscription and Premium Services
    {
      type: 'PLATFORM_FEE',
      amount: 150,
      description: 'Premium subscription - Advanced analytics',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      metadata: {
        feeType: 'subscription',
        plan: 'premium',
        duration: 'monthly',
        features: ['advanced_analytics', 'ai_insights', 'priority_support'],
        autoRenew: true
      }
    },
    {
      type: 'PLATFORM_FEE',
      amount: 75,
      description: 'API access fee - Third-party integration',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
      metadata: {
        feeType: 'api_access',
        tier: 'standard',
        requests: 10000,
        period: 'monthly',
        integration: 'weather_service'
      }
    },

    // Historical Data for Analytics
    {
      type: 'FARM_REVENUE',
      amount: 6800,
      description: 'Historical wheat sale - Previous month',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      metadata: {
        commodity: 'wheat',
        quantity: 136,
        quality: 'premium',
        buyer: 'GrainCo Ltd',
        season: 'winter_harvest',
        historical: true
      }
    },
    {
      type: 'FARM_EXPENSE',
      amount: 1800,
      description: 'Historical equipment purchase - Tractor maintenance',
      farmId: farm.id,
      status: 'COMPLETED',
      paidDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), // 50 days ago
      metadata: {
        category: 'equipment',
        type: 'major_repair',
        equipment: 'tractor',
        serviceType: 'engine_overhaul',
        vendor: 'HeavyMach Solutions',
        warranty: '6_months',
        historical: true
      }
    }
  ];

  // Create transactions with proper reference generation
  for (const transactionInfo of transactionData) {
    const reference = generateTransactionReference(transactionInfo.type);
    
    const transaction = await prisma.transaction.create({
      data: {
        organizationId: farmOrg.id,
        orderId: transactionInfo.orderId,
        farmId: transactionInfo.farmId,
        type: transactionInfo.type as any,
        amount: transactionInfo.amount,
        currency: farmOrg.currency,
        status: transactionInfo.status as any,
        description: transactionInfo.description,
        dueDate: transactionInfo.dueDate,
        paidDate: transactionInfo.paidDate,
        reference: reference,
        metadata: transactionInfo.metadata || {}
      }
    });

    transactions.push(transaction);
  }

  console.log(`✅ Created ${transactions.length} comprehensive sample transactions`);
  console.log(`   - Farm Revenue: ${transactions.filter(t => t.type === 'FARM_REVENUE').length}`);
  console.log(`   - Farm Expenses: ${transactions.filter(t => t.type === 'FARM_EXPENSE').length}`);
  console.log(`   - Order Payments: ${transactions.filter(t => t.type === 'ORDER_PAYMENT').length}`);
  console.log(`   - Platform Fees: ${transactions.filter(t => t.type === 'PLATFORM_FEE').length}`);
  console.log(`   - Refunds: ${transactions.filter(t => t.type === 'REFUND').length}`);
  console.log(`   - Completed: ${transactions.filter(t => t.status === 'COMPLETED').length}`);
  console.log(`   - Pending: ${transactions.filter(t => t.status === 'PENDING').length}`);
  console.log(`   - Failed: ${transactions.filter(t => t.status === 'FAILED').length}`);
  console.log(`   - Cancelled: ${transactions.filter(t => t.status === 'CANCELLED').length}`);
  
  return transactions;
}

// Helper function to generate proper transaction references
function generateTransactionReference(type: string): string {
  const prefix = type === 'FARM_REVENUE' ? 'REV' :
                 type === 'FARM_EXPENSE' ? 'EXP' :
                 type === 'ORDER_PAYMENT' ? 'PAY' :
                 type === 'PLATFORM_FEE' ? 'FEE' :
                 type === 'REFUND' ? 'REF' : 'TXN';
  
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
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

async function upsertOrganization(org: { 
  name: string; 
  type: string; 
  email: string; 
  phone?: string; 
  address?: any;
  plan?: string;
  maxUsers?: number;
  maxFarms?: number;
  description?: string;
  allowCustomRoles?: boolean;
}) {
  // Find existing organization by name first
  const existing = await prisma.organization.findFirst({
    where: { name: org.name }
  });
  
  // Determine plan tier and get features
  const planTier = (org.plan as SubscriptionTier) || SubscriptionTier.BASIC;
  const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(org.type, planTier);
  
  if (existing) {
    return await prisma.organization.update({
      where: { id: existing.id },
      data: {
        name: org.name,
        type: org.type as any,
        email: org.email,
        phone: org.phone,
        address: org.address,
        plan: planTier,
        maxUsers: org.maxUsers || 5,
        maxFarms: org.maxFarms || 1,
        features: features,
        allowedModules: allowedModules,
        description: org.description,
        allowCustomRoles: org.allowCustomRoles || false
      }
    });
  } else {
    return await prisma.organization.create({
      data: {
        name: org.name,
        type: org.type as any,
        email: org.email,
        phone: org.phone,
        address: org.address,
        plan: planTier,
        maxUsers: org.maxUsers || 5,
        maxFarms: org.maxFarms || 1,
        features: features,
        allowedModules: allowedModules,
        description: org.description,
        allowCustomRoles: org.allowCustomRoles || false,
        isActive: true,
        isVerified: false
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
// TASK/ACTIVITY DEMO DATA INITIALIZATION
// =============================================================================

async function initializeTaskDemoData(farms: any[], users: any[]) {
  console.log('📋 Initializing comprehensive task demo data...');
  
  const tasks = [];
  let taskNotesCount = 0;
  let taskAssignmentsCount = 0;
  let taskCostsCount = 0;
  
  // Get farm and user data for task creation
  const farm = farms[0]; // Use first farm
  const farmUsers = users.filter(user => user.organizationId === farm.organizationId);
  
  // Define comprehensive task scenarios
  const taskScenarios = [
    // Field Preparation Tasks
    {
      name: 'Soil Testing - Field A',
      description: 'Conduct comprehensive soil testing across Field A to determine nutrient levels and pH balance',
      type: 'MONITORING',
      status: 'COMPLETED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      estimatedDuration: 4,
      actualDuration: 3.5,
      percentComplete: 100,
      estimatedCost: 150,
      actualCost: 145,
      instructions: 'Use soil testing kit to collect samples from 10 different locations across Field A. Test for pH, nitrogen, phosphorus, and potassium levels.',
      safetyNotes: 'Wear protective gloves when handling soil samples. Ensure testing equipment is properly calibrated.',
      location: { lat: 40.7128, lng: -74.006 },
      results: {
        quality: 'excellent',
        quantityAchieved: 10,
        notes: 'Soil pH is optimal at 6.8. Nitrogen levels are adequate, but phosphorus needs supplementation.'
      },
      issues: null,
      recommendations: 'Apply phosphorus-rich fertilizer before next planting cycle. Consider adding organic matter to improve soil structure.',
      assignedUsers: [farmUsers[0]?.id, farmUsers[1]?.id].filter(Boolean),
      notes: [
        {
          content: 'Soil samples collected from all 10 designated locations. Testing completed successfully.',
          type: 'OBSERVATION',
          isPrivate: false,
          attachments: []
        },
        {
          content: 'pH levels are within optimal range for corn cultivation. No immediate concerns.',
          type: 'RECOMMENDATION',
          isPrivate: false,
          attachments: []
        }
      ],
      costs: [
        {
          type: 'LABOR',
          description: 'Field technician time for soil sampling',
          amount: 120,
          quantity: 3.5,
          unit: 'hours',
          vendor: 'Internal'
        },
        {
          type: 'MATERIAL',
          description: 'Soil testing kit and supplies',
          amount: 25,
          quantity: 1,
          unit: 'kit',
          vendor: 'AgriSupply Co.'
        }
      ]
    },
    
    // Planting Tasks
    {
      name: 'Corn Planting - Field B',
      description: 'Plant corn seeds in Field B using precision planting equipment',
      type: 'PLANTING',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      estimatedDuration: 8,
      actualDuration: null,
      percentComplete: 65,
      estimatedCost: 800,
      actualCost: 520,
      instructions: 'Plant corn seeds at 30-inch row spacing with 6-inch seed spacing. Ensure proper seed depth of 1.5 inches.',
      safetyNotes: 'Ensure all planting equipment is properly maintained. Check for any mechanical issues before starting.',
      location: { lat: 40.7130, lng: -74.008 },
      results: null,
      issues: 'Planting equipment had minor mechanical issues that caused 2-hour delay. Issue resolved.',
      recommendations: 'Schedule equipment maintenance before next planting season.',
      assignedUsers: [farmUsers[1]?.id, farmUsers[2]?.id].filter(Boolean),
      notes: [
        {
          content: 'Planting started on schedule. Equipment performing well initially.',
          type: 'OBSERVATION',
          isPrivate: false,
          attachments: []
        },
        {
          content: 'Minor mechanical issue with seed dispenser. Repaired and continued planting.',
          type: 'ISSUE',
          isPrivate: false,
          attachments: []
        },
        {
          content: '65% of field completed. On track to finish by tomorrow.',
          type: 'GENERAL',
          isPrivate: false,
          attachments: []
        }
      ],
      costs: [
        {
          type: 'LABOR',
          description: 'Planting crew wages',
          amount: 400,
          quantity: 8,
          unit: 'hours',
          vendor: 'Internal'
        },
        {
          type: 'EQUIPMENT',
          description: 'Tractor and planter rental',
          amount: 120,
          quantity: 1,
          unit: 'day',
          vendor: 'Farm Equipment Rentals'
        }
      ]
    },
    
    // Irrigation Tasks
    {
      name: 'Irrigation System Check - Field C',
      description: 'Inspect and test irrigation system in Field C for proper water distribution',
      type: 'IRRIGATION',
      status: 'PLANNED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      estimatedDuration: 3,
      actualDuration: null,
      percentComplete: 0,
      estimatedCost: 200,
      actualCost: null,
      instructions: 'Check all irrigation sprinklers for proper operation. Test water pressure and coverage area.',
      safetyNotes: 'Turn off water supply before inspecting sprinkler heads. Use proper tools for adjustments.',
      location: { lat: 40.7125, lng: -74.004 },
      results: null,
      issues: null,
      recommendations: null,
      assignedUsers: [farmUsers[0]?.id].filter(Boolean),
      notes: [],
      costs: []
    },
    
    // Harvesting Tasks
    {
      name: 'Wheat Harvest - Field D',
      description: 'Harvest mature wheat crop from Field D using combine harvester',
      type: 'HARVESTING',
      status: 'SCHEDULED',
      priority: 'HIGH',
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      estimatedDuration: 12,
      actualDuration: null,
      percentComplete: 0,
      estimatedCost: 1200,
      actualCost: null,
      instructions: 'Harvest wheat when moisture content is below 14%. Use combine harvester with proper settings for wheat.',
      safetyNotes: 'Ensure all safety guards are in place on combine. Check weather conditions before starting.',
      location: { lat: 40.7140, lng: -74.010 },
      results: null,
      issues: null,
      recommendations: null,
      assignedUsers: [farmUsers[1]?.id, farmUsers[2]?.id, farmUsers[3]?.id].filter(Boolean),
      notes: [],
      costs: []
    },
    
    // Maintenance Tasks
    {
      name: 'Equipment Maintenance - Tractor Fleet',
      description: 'Perform routine maintenance on all tractors in the fleet',
      type: 'MAINTENANCE',
      status: 'COMPLETED',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      completedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
      estimatedDuration: 6,
      actualDuration: 5.5,
      percentComplete: 100,
      estimatedCost: 500,
      actualCost: 480,
      instructions: 'Change oil, check filters, inspect belts and hoses, test all hydraulic systems.',
      safetyNotes: 'Ensure tractors are properly supported during maintenance. Use appropriate safety equipment.',
      location: { lat: 40.7120, lng: -74.002 },
      results: {
        quality: 'good',
        quantityAchieved: 3,
        notes: 'All tractors serviced successfully. Minor belt replacement needed on one unit.'
      },
      issues: 'One tractor had worn belt that needed replacement. All other units in good condition.',
      recommendations: 'Schedule next maintenance in 3 months. Keep spare belts in inventory.',
      assignedUsers: [farmUsers[0]?.id, farmUsers[1]?.id].filter(Boolean),
      notes: [
        {
          content: 'Maintenance completed on all 3 tractors. All systems functioning properly.',
          type: 'OBSERVATION',
          isPrivate: false,
          attachments: []
        },
        {
          content: 'Belt replacement completed on Tractor #2. No other issues found.',
          type: 'GENERAL',
          isPrivate: false,
          attachments: []
        }
      ],
      costs: [
        {
          type: 'LABOR',
          description: 'Mechanic labor for maintenance',
          amount: 300,
          quantity: 5.5,
          unit: 'hours',
          vendor: 'Internal'
        },
        {
          type: 'MATERIAL',
          description: 'Oil, filters, and replacement parts',
          amount: 180,
          quantity: 1,
          unit: 'service',
          vendor: 'Farm Supply Store'
        }
      ]
    },
    
    // Pest Control Tasks
    {
      name: 'Pest Monitoring - All Fields',
      description: 'Weekly pest monitoring across all fields to identify potential issues',
      type: 'PEST_CONTROL',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      estimatedDuration: 2,
      actualDuration: null,
      percentComplete: 80,
      estimatedCost: 100,
      actualCost: 80,
      instructions: 'Walk through all fields and check for signs of pest damage. Document findings and take photos if needed.',
      safetyNotes: 'Wear appropriate clothing and use insect repellent. Be aware of any chemical applications in the area.',
      location: { lat: 40.7128, lng: -74.006 },
      results: null,
      issues: 'Found minor aphid damage in Field A. No immediate action needed.',
      recommendations: 'Continue monitoring. Consider beneficial insects if aphid population increases.',
      assignedUsers: [farmUsers[2]?.id].filter(Boolean),
      notes: [
        {
          content: 'Completed monitoring of Fields A, B, and C. Field D scheduled for tomorrow.',
          type: 'OBSERVATION',
          isPrivate: false,
          attachments: []
        },
        {
          content: 'Minor aphid damage found in Field A. Population appears stable.',
          type: 'ISSUE',
          isPrivate: false,
          attachments: []
        }
      ],
      costs: [
        {
          type: 'LABOR',
          description: 'Field monitoring time',
          amount: 80,
          quantity: 2,
          unit: 'hours',
          vendor: 'Internal'
        }
      ]
    }
  ];
  
  // Create tasks and related data
  for (const taskData of taskScenarios) {
    const task = await prisma.farmActivity.create({
      data: {
        farmId: farm.id,
        type: taskData.type as any,
        name: taskData.name,
        description: taskData.description,
        status: taskData.status as any,
        priority: taskData.priority as any,
        scheduledAt: taskData.scheduledAt,
        startedAt: taskData.startedAt,
        completedAt: taskData.completedAt,
        estimatedDuration: taskData.estimatedDuration,
        actualDuration: taskData.actualDuration,
        cost: taskData.actualCost || taskData.estimatedCost,
        createdById: farmUsers[0]?.id || users[0].id,
        metadata: {
          taskType: 'field_operation',
          complexity: taskData.priority === 'URGENT' ? 'high' : 'medium',
          weatherDependent: ['PLANTING', 'HARVESTING', 'IRRIGATION'].includes(taskData.type),
          instructions: taskData.instructions,
          safetyNotes: taskData.safetyNotes,
          location: taskData.location,
          results: taskData.results,
          issues: taskData.issues,
          recommendations: taskData.recommendations,
          percentComplete: taskData.percentComplete,
          estimatedCost: taskData.estimatedCost,
          actualCost: taskData.actualCost
        }
      }
    });
    
    // Create task assignments
    for (const userId of taskData.assignedUsers) {
      if (userId) {
        await prisma.activityAssignment.create({
          data: {
            activityId: task.id,
            userId: userId,
            assignedById: farmUsers[0]?.id || users[0].id,
            role: 'ASSIGNED' as any,
            isActive: true
          }
        });
        taskAssignmentsCount++;
      }
    }
    
    // Create task notes
    for (const noteData of taskData.notes) {
        await prisma.activityNote.create({
          data: {
            activityId: task.id,
            userId: farmUsers[0]?.id || users[0].id,
            content: noteData.content,
            type: noteData.type as any,
            isPrivate: noteData.isPrivate,
            attachments: noteData.attachments
          }
        });
        taskNotesCount++;
    }
    
    // Create task costs
    for (const costData of taskData.costs) {
      await prisma.activityCost.create({
        data: {
          activityId: task.id,
          type: costData.type as any,
          description: costData.description,
          amount: costData.amount,
          quantity: costData.quantity,
          unit: costData.unit,
          vendor: costData.vendor,
          createdById: farmUsers[0]?.id || users[0].id
        }
      });
      taskCostsCount++;
    }
    
    tasks.push(task);
  }
  
  console.log(`✅ Created ${tasks.length} comprehensive task scenarios`);
  console.log(`   • ${taskNotesCount} task notes created`);
  console.log(`   • ${taskAssignmentsCount} task assignments created`);
  console.log(`   • ${taskCostsCount} cost entries created`);
  
  return tasks;
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
    const activityTemplates = await initializeActivityTemplates(organizations);
    const taskDemoData = await initializeTaskDemoData(farms, users);
    const inventory = await initializeSampleInventory(organizations, farms, commodities, users);
    const orders = await initializeSampleOrders(organizations, farms, commodities, users);
    const transactionCategories = await initializeTransactionCategories(organizations);
    const transactions = await initializeSampleTransactions(organizations, farms, orders);
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${SYSTEM_PERMISSIONS.length} permissions created`);
    console.log(`   • ${SYSTEM_ROLES.length} system roles created`);
    console.log(`   • ${organizations.length} organizations created`);
    console.log(`   • ${users.length} users created`);
    console.log(`   • ${farms.length} farms created`);
    console.log(`   • ${commodities.length} sample commodities created`);
    console.log(`   • ${activities.length} comprehensive sample activities created`);
    console.log(`   • ${activityTemplates.length} activity templates created`);
    console.log(`   • ${taskDemoData.length} comprehensive task scenarios created`);
    console.log(`   • ${inventory.length} comprehensive inventory items created`);
    console.log(`   • ${orders.length} comprehensive sample orders created`);
    console.log(`   • ${transactionCategories.length} transaction categories created`);
    console.log(`   • ${transactions.length} comprehensive sample transactions created`);
    
    console.log('\n🔑 Sample Login Credentials:');
    SAMPLE_USERS.forEach(user => {
      console.log(`   • ${user.email} / ${user.password} (${user.role})`);
    });
    
    console.log('\n📈 Dashboard Data Available:');
    console.log('   • 20+ comprehensive farm activities covering all types (LAND_PREP, PLANTING, FERTILIZING, IRRIGATION, PEST_CONTROL, HARVESTING, MONITORING, MAINTENANCE, OTHER)');
    console.log('   • Activities with various statuses (PLANNED, SCHEDULED, IN_PROGRESS, COMPLETED) and priorities (LOW, NORMAL, HIGH, URGENT)');
    console.log('   • Detailed resource tracking (equipment, labor, materials) and cost breakdowns');
    console.log('   • Activity assignments, progress logs, notes, and results tracking');
    console.log('   • 6 comprehensive task scenarios with realistic field operations (soil testing, planting, irrigation, harvesting, maintenance, pest control)');
    console.log('   • Task scenarios include detailed notes, cost tracking, user assignments, and progress monitoring');
    console.log('   • 13 activity templates (10 system + 3 organization-specific) for common farming operations');
    console.log('   • 12+ comprehensive inventory items across 5 commodities (Wheat, Corn, Soybeans, Tomatoes, Potatoes)');
    console.log('   • Inventory with different statuses (AVAILABLE, RESERVED, SOLD, CONSUMED, EXPIRED) and quality grades (premium, grade_a, grade_b, standard)');
    console.log('   • Detailed batch tracking, storage conditions, quality certifications, and traceability data');
    console.log('   • 10+ comprehensive orders covering both BUY and SELL transactions across all order statuses');
    console.log('   • Orders with different statuses (PENDING, CONFIRMED, IN_TRANSIT, DELIVERED, CANCELLED) and payment terms');
    console.log('   • Detailed order terms, quality specifications, delivery tracking, and marketplace integration');
    console.log('   • 20 transaction categories per organization (4 income + 16 expense categories) with color coding');
    console.log('   • Transaction categories include: Crop Sales, Livestock Sales, Equipment & Machinery, Labor & Wages, etc.');
    console.log('   • 31+ comprehensive financial transactions covering all types and statuses with realistic cost allocations');
    console.log('   • Complete activity lifecycle from planning to completion with realistic timelines');
    
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
