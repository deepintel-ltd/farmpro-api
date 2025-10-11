import { PrismaClient, SubscriptionTier } from '@prisma/client';
import { hash } from '@node-rs/argon2';

// =============================================================================
// TYPE DEFINITIONS FOR TYPE SAFETY
// =============================================================================

interface SampleOrganization {
  name: string;
  type: 'FARM_OPERATION' | 'COMMODITY_TRADER' | 'LOGISTICS_PROVIDER' | 'INTEGRATED_FARM';
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  description: string;
  plan: SubscriptionTier; // Required plan field
  maxUsers: number;
  maxFarms: number;
  currency: 'USD' | 'NGN';
  allowCustomRoles: boolean;
}

const prisma = new PrismaClient();

// =============================================================================
// SIMPLIFIED PLAN-BASED PERMISSIONS (New RBAC System)
// =============================================================================
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
// SAMPLE ORGANIZATIONS INITIALIZATION
// =============================================================================

const SAMPLE_ORGANIZATIONS: SampleOrganization[] = [
  {
    name: 'FarmPro Platform',
    type: 'FARM_OPERATION',
    email: 'admin@farmpro.app',
    phone: '+1-000-000-0000',
    address: {
      street: 'Platform HQ',
      city: 'System',
      state: 'SY',
      zipCode: '00000',
      country: 'USA'
    },
    description: 'System organization for platform administration',
    plan: 'ENTERPRISE',
    maxUsers: 999999,
    maxFarms: 999999,
    currency: 'USD',
    allowCustomRoles: true
  },
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
    plan: 'PRO',
    maxUsers: 25,
    maxFarms: 3,
    currency: 'USD',
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
    plan: 'ENTERPRISE',
    maxUsers: 100,
    maxFarms: 0,
    currency: 'USD',
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
    plan: 'BASIC',
    maxUsers: 50,
    maxFarms: 0,
    currency: 'USD',
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
    plan: 'ENTERPRISE',
    maxUsers: 200,
    maxFarms: 10,
    currency: 'USD',
    allowCustomRoles: true
  },
  {
    name: 'GreenFields Agriculture',
    type: 'FARM_OPERATION',
    email: 'info@greenfields.ag',
    phone: '+1-555-0105',
    address: {
      street: '2222 Organic Valley Road',
      city: 'Green Valley',
      state: 'OR',
      zipCode: '97001',
      country: 'USA'
    },
    description: 'Organic farming operation specializing in sustainable agriculture',
    plan: 'PRO',
    maxUsers: 15,
    maxFarms: 2,
    currency: 'USD',
    allowCustomRoles: true
  },
  {
    name: 'AgriTech Solutions',
    type: 'INTEGRATED_FARM',
    email: 'contact@agritech.solutions',
    phone: '+1-555-0106',
    address: {
      street: '3333 Innovation Drive',
      city: 'Tech Valley',
      state: 'CA',
      zipCode: '94000',
      country: 'USA'
    },
    description: 'Agricultural technology solutions and precision farming services',
    plan: 'BASIC',
    maxUsers: 30,
    maxFarms: 0,
    currency: 'USD',
    allowCustomRoles: false
  },
  {
    name: 'Global Commodities Ltd',
    type: 'COMMODITY_TRADER',
    email: 'trading@globalcommodities.com',
    phone: '+1-555-0107',
    address: {
      street: '4444 Wall Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    description: 'International commodity trading and market analysis firm',
    plan: 'ENTERPRISE',
    maxUsers: 150,
    maxFarms: 0,
    currency: 'USD',
    allowCustomRoles: true
  },
  {
    name: 'Family Farm Co-op',
    type: 'FARM_OPERATION',
    email: 'coop@familyfarm.org',
    phone: '+1-555-0108',
    address: {
      street: '5555 Cooperative Way',
      city: 'Rural Town',
      state: 'NE',
      zipCode: '68001',
      country: 'USA'
    },
    description: 'Family farming cooperative with shared resources and marketing',
    plan: 'BASIC',
    maxUsers: 40,
    maxFarms: 5,
    currency: 'USD',
    allowCustomRoles: false
  }
];

// =============================================================================
// SAMPLE USERS INITIALIZATION (Simplified - No Role Assignments)
// =============================================================================

const SAMPLE_USERS = [
  // Platform Admin User
  {
    email: 'admin@farmpro.app',
    password: 'admin123',
    name: 'FarmPro Admin',
    phone: '+1-000-000-0000',
    organizationName: 'FarmPro Platform',
    isPlatformAdmin: true,
    isActive: true,
    emailVerified: true
  },
  
  // FarmPro Demo Farm Users
  {
    email: 'manager@farmpro.app',
    password: 'manager123',
    name: 'Farm Manager',
    phone: '+1-555-0102',
    organizationName: 'FarmPro Demo Farm',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },
  {
    email: 'operator@farmpro.app',
    password: 'operator123',
    name: 'Farm Operator',
    phone: '+1-555-0103',
    organizationName: 'FarmPro Demo Farm',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },

  // GrainSparkles Trading Users
  {
    email: 'trader@grainsparkles.com',
    password: 'trader123',
    name: 'Senior Trader',
    phone: '+1-555-0201',
    organizationName: 'GrainSparkles Trading',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },
  {
    email: 'analyst@grainsparkles.com',
    password: 'analyst123',
    name: 'Market Analyst',
    phone: '+1-555-0202',
    organizationName: 'GrainSparkles Trading',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },

  // FarmPro Logistics Users
  {
    email: 'logistics@farmpro.app',
    password: 'logistics123',
    name: 'Logistics Coordinator',
    phone: '+1-555-0301',
    organizationName: 'FarmPro Logistics',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },

  // GrainSparkles Integrated Users
  {
    email: 'ceo@grainsparkles.com',
    password: 'ceo123',
    name: 'CEO',
    phone: '+1-555-0401',
    organizationName: 'GrainSparkles Integrated',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },
  {
    email: 'operations@grainsparkles.com',
    password: 'ops123',
    name: 'Operations Manager',
    phone: '+1-555-0402',
    organizationName: 'GrainSparkles Integrated',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },

  // GreenFields Agriculture Users
  {
    email: 'owner@greenfields.ag',
    password: 'owner123',
    name: 'Farm Owner',
    phone: '+1-555-0501',
    organizationName: 'GreenFields Agriculture',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },

  // AgriTech Solutions Users
  {
    email: 'tech@agritech.solutions',
    password: 'tech123',
    name: 'Tech Lead',
    phone: '+1-555-0601',
    organizationName: 'AgriTech Solutions',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },

  // Global Commodities Ltd Users
  {
    email: 'director@globalcommodities.com',
    password: 'director123',
    name: 'Trading Director',
    phone: '+1-555-0701',
    organizationName: 'Global Commodities Ltd',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  },

  // Family Farm Co-op Users
  {
    email: 'president@familyfarm.org',
    password: 'president123',
    name: 'Co-op President',
    phone: '+1-555-0801',
    organizationName: 'Family Farm Co-op',
    isPlatformAdmin: false,
    isActive: true,
    emailVerified: true
  }
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function validateOrganizationPlans(organizations: SampleOrganization[]): void {
  console.log('🔍 Validating organization plans...');
  
  const validPlans: SubscriptionTier[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
  const errors: string[] = [];
  
  organizations.forEach((org, index) => {
    if (!org.plan) {
      errors.push(`Organization ${index + 1} (${org.name}) is missing plan field`);
    } else if (!validPlans.includes(org.plan)) {
      errors.push(`Organization ${index + 1} (${org.name}) has invalid plan: ${org.plan}`);
    }
  });
  
  if (errors.length > 0) {
    console.error('❌ Organization plan validation failed:');
    errors.forEach(error => console.error(`   - ${error}`));
    throw new Error('Organization plan validation failed');
  }
  
  console.log('✅ All organizations have valid plans');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function upsertOrganization(data: any) {
  const { address, plan, ...orgData } = data;
  
  // First try to find by name
  const existing = await prisma.organization.findFirst({
    where: { name: data.name },
    include: {
      subscription: {
        include: { plan: true }
      }
    }
  });
  
  let organization;
  
  if (existing) {
    organization = await prisma.organization.update({
      where: { id: existing.id },
      data: {
        ...orgData,
        address: address as any,
        updatedAt: new Date()
      }
    });
  } else {
    organization = await prisma.organization.create({
      data: {
        ...orgData,
        address: address as any,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
  
  // Create or update subscription record
  if (plan) {
    const subscriptionPlan = await prisma.subscriptionPlan.findFirst({
      where: { tier: plan }
    });
    
    if (subscriptionPlan) {
      await prisma.subscription.upsert({
        where: { organizationId: organization.id },
        update: {
          planId: subscriptionPlan.id,
          updatedAt: new Date()
        },
        create: {
          organizationId: organization.id,
          planId: subscriptionPlan.id,
          status: 'ACTIVE',
          currency: organization.currency,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          autoRenew: true,
          metadata: {
            createdBy: 'init-db-script',
            createdAt: new Date().toISOString()
          }
        }
      });
    }
  }
  
  return organization;
}

async function upsertUser(data: any, organizationId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { organizationName, password, ...userData } = data;
  
  // Validate required fields
  if (!password || password.trim() === '') {
    throw new Error(`Password is required for user ${data.email}`);
  }
  
  // Hash the password once
  const hashedPassword = await hash(password);
  
  // First, try to find existing user
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });
  
  if (existingUser) {
    // User exists - update with password and all other fields
    console.log(`   🔄 Updating existing user: ${data.email}`);
    return await prisma.user.update({
      where: { email: data.email },
      data: {
        ...userData,
        organizationId,
        hashedPassword, // Always update password
        updatedAt: new Date()
      }
    });
  } else {
    // User doesn't exist - create new
    console.log(`   ➕ Creating new user: ${data.email}`);
    return await prisma.user.create({
      data: {
        ...userData,
        organizationId,
        hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

async function validateUserPasswords() {
  console.log('🔐 Validating user passwords...');
  
  const usersWithoutPasswords = await prisma.user.findMany({
    where: {
      hashedPassword: null
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });
  
  if (usersWithoutPasswords.length > 0) {
    console.log(`⚠️  Found ${usersWithoutPasswords.length} users without passwords:`);
    usersWithoutPasswords.forEach(user => {
      console.log(`   - ${user.email} (${user.name})`);
    });
    
    // Fix users without passwords by setting default password
    for (const user of usersWithoutPasswords) {
      const defaultPassword = 'TempPassword123!';
      const hashedPassword = await hash(defaultPassword);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { hashedPassword }
      });
      
      console.log(`   ✅ Fixed password for ${user.email} (default: ${defaultPassword})`);
    }
  } else {
    console.log('✅ All users have passwords');
  }
}

// =============================================================================
// INITIALIZATION FUNCTIONS
// =============================================================================

async function initializeOrganizations() {
  console.log('🏢 Initializing organizations...');
  
  const organizations = [];
  
  for (const orgData of SAMPLE_ORGANIZATIONS) {
    const { type, plan, ...orgDataWithoutPlan } = orgData;
    
    // Validate that plan is provided
    if (!plan) {
      throw new Error(`Organization ${orgData.name} is missing required plan field`);
    }
    
    // Get features and modules from plan
    const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(type, plan as SubscriptionTier);
    
    const organization = await upsertOrganization({
      ...orgDataWithoutPlan,
      type,
      plan, // Pass plan to create subscription
      features,
      allowedModules
    });
    
    organizations.push(organization);
    console.log(`   ✅ ${organization.name} (${plan})`);
  }
  
  return organizations;
}

async function initializeUsers(organizations: any[]) {
  console.log('👥 Initializing users...');
  
  const users = [];
  
  for (const userData of SAMPLE_USERS) {
    const organization = organizations.find(org => org.name === userData.organizationName);
    
    if (!organization) {
      console.log(`   ⚠️  Organization not found for user: ${userData.email}`);
      continue;
    }
    
    const user = await upsertUser(userData, organization.id);
    users.push(user);
    console.log(`   ✅ ${user.name} (${user.email}) - ${organization.name}`);
  }
  
  return users;
}

async function initializeSampleFarms(organizations: any[]) {
  console.log('🚜 Initializing sample farms...');
  
  const farms = [];
  
  // Create farms for farm operation organizations
  const farmOrgs = organizations.filter(org => 
    org.type === 'FARM_OPERATION' || org.type === 'INTEGRATED_FARM'
  );
  
  for (const org of farmOrgs) {
    // Limit farms to reasonable numbers for demo purposes
    const maxFarms = Math.min(org.maxFarms || 1, 3);
    
    for (let i = 1; i <= maxFarms; i++) {
      const farm = await prisma.farm.upsert({
        where: {
          id: `${org.id}-farm-${i}`
        },
        update: {
          updatedAt: new Date()
        },
        create: {
          id: `${org.id}-farm-${i}`,
          name: `${org.name} Farm ${i}`,
          organizationId: org.id,
          totalArea: Math.floor(Math.random() * 1000) + 100, // 100-1100 acres
          establishedDate: new Date(),
          location: {
            street: `${1000 + i} Farm Road`,
            city: org.address.city,
            state: org.address.state,
            zipCode: org.address.zipCode,
            country: org.address.country
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      farms.push(farm);
      console.log(`   ✅ ${farm.name} (${org.name})`);
    }
  }
  
  return farms;
}

async function initializeSampleCommodities() {
  console.log('🌾 Initializing sample commodities...');
  
  const commodities = [
    {
      name: 'Wheat',
      type: 'GRAIN',
      category: 'GRAIN',
      description: 'Common wheat for food production',
      unit: 'bushel',
      quantity: 0,
      isActive: true
    },
    {
      name: 'Corn',
      type: 'GRAIN',
      category: 'GRAIN',
      description: 'Yellow corn for feed and ethanol',
      unit: 'bushel',
      quantity: 0,
      isActive: true
    },
    {
      name: 'Soybeans',
      type: 'OILSEED',
      category: 'OILSEED',
      description: 'Soybeans for oil and meal production',
      unit: 'bushel',
      quantity: 0,
      isActive: true
    },
    {
      name: 'Tomatoes',
      type: 'VEGETABLE',
      category: 'VEGETABLE',
      description: 'Fresh market tomatoes',
      unit: 'pound',
      quantity: 0,
      isActive: true
    },
    {
      name: 'Potatoes',
      type: 'VEGETABLE',
      category: 'VEGETABLE',
      description: 'Russet potatoes for processing',
      unit: 'pound',
      quantity: 0,
      isActive: true
    }
  ];
  
  const createdCommodities = [];
  
  for (const commodityData of commodities) {
    // First try to find by name
    const existing = await prisma.commodity.findFirst({
      where: { name: commodityData.name }
    });
    
    if (existing) {
      const commodity = await prisma.commodity.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() }
      });
      createdCommodities.push(commodity);
      console.log(`   ✅ ${commodity.name}`);
      continue;
    }
    
    const commodity = await prisma.commodity.create({
      data: {
        ...commodityData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    createdCommodities.push(commodity);
    console.log(`   ✅ ${commodity.name}`);
  }
  
  return createdCommodities;
}

// =============================================================================
// ADDITIONAL SAMPLE DATA FUNCTIONS
// =============================================================================

async function initializeSampleActivities(farms: any[], users: any[]) {
  console.log('🌱 Initializing sample activities...');
  
  const activities = [];
  const activityTypes = ['PLANTING', 'HARVESTING', 'IRRIGATION', 'FERTILIZATION', 'PEST_CONTROL'];
  
  for (const farm of farms.slice(0, 5)) { // Only create activities for first 5 farms
    const farmUsers = users.filter(user => user.organizationId === farm.organizationId);
    if (farmUsers.length === 0) continue;
    
    for (let i = 0; i < 3; i++) {
      const activity = await prisma.farmActivity.create({
        data: {
          farmId: farm.id,
          type: activityTypes[i % activityTypes.length] as any,
          name: `Sample Activity ${i + 1}`,
          description: `Sample activity for ${farm.name}`,
          status: 'COMPLETED',
          priority: 'NORMAL',
          scheduledAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          createdById: farmUsers[0].id,
          estimatedDuration: 480, // 8 hours in minutes
          actualDuration: 360, // 6 hours in minutes
          cost: Math.floor(Math.random() * 500) + 100
        }
      });
      activities.push(activity);
    }
  }
  
  console.log(`   ✅ ${activities.length} activities created`);
  return activities;
}

async function initializeSampleInventory(organizations: any[], farms: any[], commodities: any[], users: any[]) {
  console.log('📦 Initializing sample inventory...');
  
  const inventory = [];
  
  for (const farm of farms.slice(0, 3)) { // Only create inventory for first 3 farms
    const farmUsers = users.filter(user => user.organizationId === farm.organizationId);
    if (farmUsers.length === 0) continue;
    
    for (const commodity of commodities.slice(0, 3)) {
      const item = await prisma.inventory.create({
        data: {
          organizationId: farm.organizationId,
          farmId: farm.id,
          commodityId: commodity.id,
          quantity: Math.floor(Math.random() * 1000) + 100,
          unit: commodity.unit,
          status: 'AVAILABLE',
          location: `Storage ${Math.floor(Math.random() * 5) + 1}`,
          quality: 'GOOD',
          currency: 'USD'
        }
      });
      inventory.push(item);
    }
  }
  
  console.log(`   ✅ ${inventory.length} inventory items created`);
  return inventory;
}

async function initializeSampleOrders(organizations: any[], farms: any[], commodities: any[], users: any[]) {
  console.log('📋 Initializing sample orders...');
  
  const orders = [];
  
  // Create some buy orders
  for (let i = 0; i < 3; i++) {
    const buyerOrg = organizations.find(org => org.type === 'FARM_OPERATION');
    const supplierOrg = organizations.find(org => org.type === 'COMMODITY_TRADER');
    const farm = farms.find(f => f.organizationId === buyerOrg?.id);
    const commodity = commodities[i % commodities.length];
    const user = users.find(u => u.organizationId === buyerOrg?.id);
    
    if (!buyerOrg || !supplierOrg || !farm || !commodity || !user) continue;
    
    const quantity = Math.floor(Math.random() * 100) + 10;
    const pricePerUnit = Math.floor(Math.random() * 50) + 10;
    const totalPrice = quantity * pricePerUnit;
    
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}-${i}`,
        title: `Order for ${commodity.name}`,
        type: 'BUY',
        status: 'CONFIRMED',
        commodityId: commodity.id,
        quantity: quantity,
        pricePerUnit: pricePerUnit,
        totalPrice: totalPrice,
        totalAmount: totalPrice,
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        deliveryLocation: `${farm.location?.street || 'Farm Location'}, ${farm.location?.city || 'City'}`,
        buyerOrgId: buyerOrg.id,
        supplierOrgId: supplierOrg.id,
        farmId: farm.id,
        createdById: user.id,
        deliveryAddress: farm.location as any,
        currency: 'USD'
      }
    });
    
    orders.push(order);
  }
  
  console.log(`   ✅ ${orders.length} orders created`);
  return orders;
}

// =============================================================================
// MAIN INITIALIZATION FUNCTION
// =============================================================================

async function initializeDatabase() {
  try {
    console.log('🚀 Starting comprehensive database initialization...\n');
    
    // Validate organization plans before initialization
    validateOrganizationPlans(SAMPLE_ORGANIZATIONS);
    
    // Initialize core data
    const organizations = await initializeOrganizations();
    const users = await initializeUsers(organizations);
    const farms = await initializeSampleFarms(organizations);
    const commodities = await initializeSampleCommodities();
    
    // Initialize additional demo data
    const activities = await initializeSampleActivities(farms, users);
    const inventory = await initializeSampleInventory(organizations, farms, commodities, users);
    const orders = await initializeSampleOrders(organizations, farms, commodities, users);
    
    // Validate all users have passwords
    await validateUserPasswords();
    
    console.log('\n🎉 Comprehensive database initialization completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${organizations.length} organizations created`);
    console.log(`   • ${users.length} users created`);
    console.log(`   • ${farms.length} farms created`);
    console.log(`   • ${commodities.length} commodities created`);
    console.log(`   • ${activities.length} activities created`);
    console.log(`   • ${inventory.length} inventory items created`);
    console.log(`   • ${orders.length} orders created`);
    
    console.log('\n🔑 Sample Login Credentials:');
    SAMPLE_USERS.forEach(user => {
      console.log(`   • ${user.email} / ${user.password} (${user.organizationName})`);
    });
    
    console.log('\n📈 New RBAC System Features:');
    console.log('   • Plan-based permissions (no complex role assignments)');
    console.log('   • Simplified permission checking');
    console.log('   • Direct plan tier to permission mapping');
    console.log('   • Reduced database complexity');
    console.log('   • Faster authorization checks');
    
    console.log('\n🎯 Plan Tiers Available:');
    console.log('   • FREE: Basic farm management, limited features');
    console.log('   • BASIC: Full farm operations, basic analytics');
    console.log('   • PRO: Advanced features, AI insights, API access');
    console.log('   • ENTERPRISE: Full platform access, custom roles');
    
    // Show plan distribution - reload organizations with subscription data
    const orgsWithSubscriptions = await prisma.organization.findMany({
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });
    
    const planDistribution = orgsWithSubscriptions.reduce((acc, org) => {
      const plan = org.subscription?.plan?.tier || 'UNKNOWN';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📊 Organization Plan Distribution:');
    Object.entries(planDistribution).forEach(([plan, count]) => {
      console.log(`   • ${plan}: ${count} organizations`);
    });
    
    console.log('\n🎪 Demo Data Ready:');
    console.log('   • Sample activities for testing workflow management');
    console.log('   • Sample inventory for testing stock management');
    console.log('   • Sample orders for testing marketplace functionality');
    console.log('   • Multiple organizations with different plan tiers');
    console.log('   • Realistic user accounts for each organization type');
    
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
