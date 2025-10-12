import { PrismaClient, ActivityType, ActivityStatus, ActivityPriority, OrderType, OrderStatus, InventoryStatus } from '@prisma/client';

// =============================================================================
// COMPREHENSIVE DEMO DATA GENERATOR
// =============================================================================
// This script generates realistic demo data for orders, inventory, and activities
// across all demo accounts for comprehensive testing

const prisma = new PrismaClient();

// =============================================================================
// DEMO DATA CONFIGURATION
// =============================================================================

const DEMO_CONFIG = {
  // Activities per farm
  activitiesPerFarm: 8,
  
  // Inventory items per farm
  inventoryItemsPerFarm: 5,
  
  // Orders per organization (buy/sell)
  ordersPerOrg: 6,
  
  // Time ranges for realistic data
  dateRanges: {
    past: 90, // days ago
    future: 30 // days from now
  }
};

// =============================================================================
// SAMPLE DATA TEMPLATES
// =============================================================================

const ACTIVITY_TEMPLATES = [
  {
    type: 'LAND_PREP' as ActivityType,
    name: 'Field Preparation',
    description: 'Tilling and preparing soil for planting season',
    estimatedDuration: 480, // 8 hours
    priority: 'HIGH' as ActivityPriority
  },
  {
    type: 'PLANTING' as ActivityType,
    name: 'Seed Planting',
    description: 'Planting seeds with precision equipment',
    estimatedDuration: 360, // 6 hours
    priority: 'URGENT' as ActivityPriority
  },
  {
    type: 'FERTILIZING' as ActivityType,
    name: 'Fertilizer Application',
    description: 'Applying organic fertilizer to crops',
    estimatedDuration: 240, // 4 hours
    priority: 'NORMAL' as ActivityPriority
  },
  {
    type: 'IRRIGATION' as ActivityType,
    name: 'Irrigation System Check',
    description: 'Maintaining and testing irrigation systems',
    estimatedDuration: 180, // 3 hours
    priority: 'NORMAL' as ActivityPriority
  },
  {
    type: 'PEST_CONTROL' as ActivityType,
    name: 'Pest Management',
    description: 'Monitoring and treating pest infestations',
    estimatedDuration: 300, // 5 hours
    priority: 'HIGH' as ActivityPriority
  },
  {
    type: 'HARVESTING' as ActivityType,
    name: 'Crop Harvest',
    description: 'Harvesting mature crops for market',
    estimatedDuration: 600, // 10 hours
    priority: 'URGENT' as ActivityPriority
  },
  {
    type: 'MAINTENANCE' as ActivityType,
    name: 'Equipment Maintenance',
    description: 'Regular maintenance of farming equipment',
    estimatedDuration: 420, // 7 hours
    priority: 'LOW' as ActivityPriority
  },
  {
    type: 'MONITORING' as ActivityType,
    name: 'Crop Monitoring',
    description: 'Regular monitoring of crop health and growth',
    estimatedDuration: 120, // 2 hours
    priority: 'NORMAL' as ActivityPriority
  }
];

const INVENTORY_TEMPLATES = [
  {
    commodity: 'Wheat',
    quantity: { min: 500, max: 2000 },
    quality: 'GOOD',
    location: 'Grain Silo A'
  },
  {
    commodity: 'Corn',
    quantity: { min: 300, max: 1500 },
    quality: 'EXCELLENT',
    location: 'Storage Bin 1'
  },
  {
    commodity: 'Soybeans',
    quantity: { min: 200, max: 1000 },
    quality: 'GOOD',
    location: 'Grain Silo B'
  },
  {
    commodity: 'Tomatoes',
    quantity: { min: 50, max: 300 },
    quality: 'FRESH',
    location: 'Cold Storage Unit'
  },
  {
    commodity: 'Potatoes',
    quantity: { min: 100, max: 800 },
    quality: 'GOOD',
    location: 'Root Cellar'
  }
];

const ORDER_TEMPLATES = {
  BUY: [
    {
      title: 'Seed Purchase Order',
      commodity: 'Wheat',
      quantity: { min: 100, max: 500 },
      pricePerUnit: { min: 8, max: 12 }
    },
    {
      title: 'Fertilizer Supply Order',
      commodity: 'Corn',
      quantity: { min: 50, max: 200 },
      pricePerUnit: { min: 15, max: 25 }
    },
    {
      title: 'Equipment Parts Order',
      commodity: 'Soybeans',
      quantity: { min: 25, max: 100 },
      pricePerUnit: { min: 20, max: 35 }
    }
  ],
  SELL: [
    {
      title: 'Grain Sales Order',
      commodity: 'Wheat',
      quantity: { min: 200, max: 1000 },
      pricePerUnit: { min: 6, max: 10 }
    },
    {
      title: 'Fresh Produce Sale',
      commodity: 'Tomatoes',
      quantity: { min: 30, max: 150 },
      pricePerUnit: { min: 2, max: 5 }
    },
    {
      title: 'Bulk Commodity Sale',
      commodity: 'Corn',
      quantity: { min: 100, max: 800 },
      pricePerUnit: { min: 4, max: 8 }
    }
  ]
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getRandomDate(daysAgo: number, daysFromNow: number): Date {
  const now = new Date();
  const start = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomValue(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomStatus(): ActivityStatus {
  const statuses = Object.values(ActivityStatus);
  const weights = [0.1, 0.2, 0.05, 0.5, 0.1, 0.05]; // Favor COMPLETED
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < statuses.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return statuses[i];
    }
  }
  
  return ActivityStatus.COMPLETED;
}

function getRandomOrderStatus(): OrderStatus {
  const statuses = Object.values(OrderStatus);
  const weights = [0.1, 0.3, 0.2, 0.3, 0.1]; // Favor CONFIRMED and DELIVERED
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < statuses.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return statuses[i];
    }
  }
  
  return OrderStatus.CONFIRMED;
}

// =============================================================================
// DEMO DATA GENERATION FUNCTIONS
// =============================================================================

async function generateActivities(farms: any[], users: any[]) {
  console.log('🌱 Generating comprehensive activities...');
  
  const activities = [];
  
  for (const farm of farms) {
    const farmUsers = users.filter(user => user.organizationId === farm.organizationId);
    if (farmUsers.length === 0) continue;
    
    const activitiesForFarm = [];
    
    for (let i = 0; i < DEMO_CONFIG.activitiesPerFarm; i++) {
      const template = ACTIVITY_TEMPLATES[i % ACTIVITY_TEMPLATES.length];
      const status = getRandomStatus();
      const scheduledAt = getRandomDate(30, 30);
      const startedAt = status !== 'PLANNED' ? getRandomDate(0, 15) : null;
      const completedAt = status === 'COMPLETED' ? getRandomDate(0, 10) : null;
      
      const activity = await prisma.farmActivity.create({
        data: {
          farmId: farm.id,
          type: template.type,
          name: `${template.name} - ${farm.name}`,
          description: template.description,
          status,
          priority: template.priority,
          scheduledAt,
          startedAt,
          completedAt,
          createdById: farmUsers[0].id,
          estimatedDuration: template.estimatedDuration,
          actualDuration: completedAt ? Math.floor(template.estimatedDuration * (0.8 + Math.random() * 0.4)) : null,
          cost: Math.floor(Math.random() * 1000) + 100
        }
      });
      
      activitiesForFarm.push(activity);
      
      // Create activity assignments for some activities
      if (Math.random() > 0.5 && farmUsers.length > 1) {
        const assignee = farmUsers[Math.floor(Math.random() * farmUsers.length)];
        await prisma.activityAssignment.create({
          data: {
            activityId: activity.id,
            userId: assignee.id,
            role: 'ASSIGNED',
            assignedById: farmUsers[0].id
          }
        });
      }
    }
    
    activities.push(...activitiesForFarm);
    console.log(`   ✅ ${activitiesForFarm.length} activities for ${farm.name}`);
  }
  
  return activities;
}

async function generateInventory(organizations: any[], farms: any[], commodities: any[]) {
  console.log('📦 Generating comprehensive inventory...');
  
  const inventory = [];
  
  for (const farm of farms) {
    const org = organizations.find(o => o.id === farm.organizationId);
    if (!org) continue;
    
    const inventoryForFarm = [];
    
    for (let i = 0; i < DEMO_CONFIG.inventoryItemsPerFarm; i++) {
      const template = INVENTORY_TEMPLATES[i % INVENTORY_TEMPLATES.length];
      const commodity = commodities.find(c => c.name === template.commodity);
      if (!commodity) continue;
      
      const quantity = getRandomValue(template.quantity.min, template.quantity.max);
      const status = Math.random() > 0.1 ? InventoryStatus.AVAILABLE : InventoryStatus.RESERVED;
      
      const item = await prisma.inventory.create({
        data: {
          organizationId: farm.organizationId,
          farmId: farm.id,
          commodityId: commodity.id,
          quantity,
          unit: commodity.unit,
          quality: template.quality,
          location: template.location,
          status,
          currency: org.currency
        }
      });
      
      inventoryForFarm.push(item);
    }
    
    inventory.push(...inventoryForFarm);
    console.log(`   ✅ ${inventoryForFarm.length} inventory items for ${farm.name}`);
  }
  
  return inventory;
}

async function generateOrders(organizations: any[], farms: any[], commodities: any[], users: any[]) {
  console.log('📋 Generating comprehensive orders...');
  
  const orders = [];
  
  // Create buy orders for farm operations
  const farmOrgs = organizations.filter(org => 
    org.type === 'FARM_OPERATION' || org.type === 'INTEGRATED_FARM'
  );
  
  const traderOrgs = organizations.filter(org => 
    org.type === 'COMMODITY_TRADER' || org.type === 'INTEGRATED_FARM'
  );
  
  for (const buyerOrg of farmOrgs) {
    const buyerFarms = farms.filter(f => f.organizationId === buyerOrg.id);
    const buyerUsers = users.filter(u => u.organizationId === buyerOrg.id);
    if (buyerFarms.length === 0 || buyerUsers.length === 0) continue;
    
    const ordersForOrg = [];
    
    for (let i = 0; i < DEMO_CONFIG.ordersPerOrg / 2; i++) {
      const template = ORDER_TEMPLATES.BUY[i % ORDER_TEMPLATES.BUY.length];
      const commodity = commodities.find(c => c.name === template.commodity);
      const supplierOrg = traderOrgs[Math.floor(Math.random() * traderOrgs.length)];
      const farm = buyerFarms[Math.floor(Math.random() * buyerFarms.length)];
      const user = buyerUsers[Math.floor(Math.random() * buyerUsers.length)];
      
      if (!commodity || !supplierOrg) continue;
      
      const quantity = getRandomValue(template.quantity.min, template.quantity.max);
      const pricePerUnit = getRandomValue(template.pricePerUnit.min, template.pricePerUnit.max);
      const totalPrice = quantity * pricePerUnit;
      const status = getRandomOrderStatus();
      const deliveryDate = getRandomDate(1, 14);
      
      const order = await prisma.order.create({
        data: {
          orderNumber: `BUY-${Date.now()}-${i}`,
          title: template.title,
          type: OrderType.BUY,
          status,
          commodityId: commodity.id,
          quantity,
          pricePerUnit,
          totalPrice,
          totalAmount: totalPrice,
          deliveryDate,
          deliveryLocation: `${farm.location?.street || 'Farm Location'}, ${farm.location?.city || 'City'}`,
          buyerOrgId: buyerOrg.id,
          supplierOrgId: supplierOrg.id,
          createdById: user.id,
          farmId: farm.id,
          deliveryAddress: farm.location,
          currency: buyerOrg.currency
        }
      });
      
      ordersForOrg.push(order);
    }
    
    orders.push(...ordersForOrg);
    console.log(`   ✅ ${ordersForOrg.length} buy orders for ${buyerOrg.name}`);
  }
  
  // Create sell orders for commodity traders
  for (const sellerOrg of traderOrgs) {
    const sellerUsers = users.filter(u => u.organizationId === sellerOrg.id);
    if (sellerUsers.length === 0) continue;
    
    const ordersForOrg = [];
    
    for (let i = 0; i < DEMO_CONFIG.ordersPerOrg / 2; i++) {
      const template = ORDER_TEMPLATES.SELL[i % ORDER_TEMPLATES.SELL.length];
      const commodity = commodities.find(c => c.name === template.commodity);
      const buyerOrg = farmOrgs[Math.floor(Math.random() * farmOrgs.length)];
      const user = sellerUsers[Math.floor(Math.random() * sellerUsers.length)];
      
      if (!commodity || !buyerOrg) continue;
      
      const quantity = getRandomValue(template.quantity.min, template.quantity.max);
      const pricePerUnit = getRandomValue(template.pricePerUnit.min, template.pricePerUnit.max);
      const totalPrice = quantity * pricePerUnit;
      const status = getRandomOrderStatus();
      const deliveryDate = getRandomDate(1, 14);
      
      const order = await prisma.order.create({
        data: {
          orderNumber: `SELL-${Date.now()}-${i}`,
          title: template.title,
          type: OrderType.SELL,
          status,
          commodityId: commodity.id,
          quantity,
          pricePerUnit,
          totalPrice,
          totalAmount: totalPrice,
          deliveryDate,
          deliveryLocation: `${buyerOrg.address?.street || 'Buyer Location'}, ${buyerOrg.address?.city || 'City'}`,
          buyerOrgId: buyerOrg.id,
          supplierOrgId: sellerOrg.id,
          createdById: user.id,
          deliveryAddress: buyerOrg.address,
          currency: sellerOrg.currency
        }
      });
      
      ordersForOrg.push(order);
    }
    
    orders.push(...ordersForOrg);
    console.log(`   ✅ ${ordersForOrg.length} sell orders for ${sellerOrg.name}`);
  }
  
  return orders;
}

async function generateActivityAssignments(activities: any[], users: any[]) {
  console.log('👥 Generating activity assignments...');
  
  const assignments = [];
  
  for (const activity of activities) {
    const orgUsers = users.filter(u => u.organizationId === activity.farm.organizationId);
    if (orgUsers.length < 2) continue;
    
    // Check for existing assignments to avoid duplicates
    const existingAssignments = await prisma.activityAssignment.findMany({
      where: { activityId: activity.id }
    });
    
    const assignedUserIds = new Set(existingAssignments.map(a => a.userId));
    const availableUsers = orgUsers.filter(u => !assignedUserIds.has(u.id));
    
    if (availableUsers.length === 0) continue;
    
    // Assign 1-3 users to each activity
    const numAssignments = Math.floor(Math.random() * Math.min(3, availableUsers.length)) + 1;
    const selectedUsers = availableUsers
      .sort(() => Math.random() - 0.5)
      .slice(0, numAssignments);
    
    for (const user of selectedUsers) {
      try {
        const assignment = await prisma.activityAssignment.create({
          data: {
            activityId: activity.id,
            userId: user.id,
            role: Math.random() > 0.7 ? 'SUPERVISOR' : 'ASSIGNED',
            assignedById: activity.createdById
          }
        });
        
        assignments.push(assignment);
      } catch (error) {
        // Skip if assignment already exists (race condition)
        if (error.code !== 'P2002') {
          throw error;
        }
      }
    }
  }
  
  console.log(`   ✅ ${assignments.length} activity assignments created`);
  return assignments;
}

async function generateActivityNotes(activities: any[], users: any[]) {
  console.log('📝 Generating activity notes...');
  
  const notes = [];
  
  for (const activity of activities) {
    if (activity.status === 'COMPLETED' && Math.random() > 0.3) {
      const orgUsers = users.filter(u => u.organizationId === activity.farm.organizationId);
      const user = orgUsers[Math.floor(Math.random() * orgUsers.length)];
      
      const noteTemplates = [
        'Activity completed successfully. All objectives met.',
        'Minor issues encountered but resolved quickly.',
        'Excellent results achieved. Exceeded expectations.',
        'Weather conditions were favorable for this activity.',
        'Equipment performed well throughout the activity.',
        'Team coordination was excellent during execution.'
      ];
      
      const note = await prisma.activityNote.create({
        data: {
          activityId: activity.id,
          userId: user.id,
          type: 'OBSERVATION',
          content: noteTemplates[Math.floor(Math.random() * noteTemplates.length)],
          isPrivate: Math.random() > 0.5
        }
      });
      
      notes.push(note);
    }
  }
  
  console.log(`   ✅ ${notes.length} activity notes created`);
  return notes;
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

async function generateComprehensiveDemoData() {
  try {
    console.log('🚀 Starting comprehensive demo data generation...\n');
    
    // Get existing data
    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      include: { subscription: { include: { plan: true } } }
    });
    
    const farms = await prisma.farm.findMany({
      where: { isActive: true },
      include: { organization: true }
    });
    
    const commodities = await prisma.commodity.findMany({
      where: { isActive: true }
    });
    
    const users = await prisma.user.findMany({
      where: { isActive: true }
    });
    
    console.log(`📊 Found existing data:`);
    console.log(`   • ${organizations.length} organizations`);
    console.log(`   • ${farms.length} farms`);
    console.log(`   • ${commodities.length} commodities`);
    console.log(`   • ${users.length} users\n`);
    
    // Generate new demo data
    const activities = await generateActivities(farms, users);
    const inventory = await generateInventory(organizations, farms, commodities);
    const orders = await generateOrders(organizations, farms, commodities, users);
    
    // Reload activities with farm relation for assignments and notes
    const activitiesWithFarm = await prisma.farmActivity.findMany({
      where: { id: { in: activities.map(a => a.id) } },
      include: { farm: true }
    });
    
    const assignments = await generateActivityAssignments(activitiesWithFarm, users);
    const notes = await generateActivityNotes(activitiesWithFarm, users);
    
    console.log('\n🎉 Comprehensive demo data generation completed!');
    console.log('\n📊 Summary:');
    console.log(`   • ${activities.length} activities created`);
    console.log(`   • ${inventory.length} inventory items created`);
    console.log(`   • ${orders.length} orders created`);
    console.log(`   • ${assignments.length} activity assignments created`);
    console.log(`   • ${notes.length} activity notes created`);
    
    console.log('\n🎯 Demo Data Features:');
    console.log('   • Realistic activity workflows across all farms');
    console.log('   • Diverse inventory items with proper status tracking');
    console.log('   • Buy/sell orders between different organization types');
    console.log('   • Activity assignments and team collaboration');
    console.log('   • Progress notes and observations');
    console.log('   • Proper status distributions for realistic testing');
    
    console.log('\n🔍 Testing Scenarios Ready:');
    console.log('   • Activity management workflows');
    console.log('   • Inventory tracking and management');
    console.log('   • Order processing and fulfillment');
    console.log('   • Cross-organization trading');
    console.log('   • Team collaboration features');
    console.log('   • Analytics and reporting');
    
  } catch (error) {
    console.error('❌ Demo data generation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run generation if this script is executed directly
if (require.main === module) {
  generateComprehensiveDemoData();
}

export { generateComprehensiveDemoData };
