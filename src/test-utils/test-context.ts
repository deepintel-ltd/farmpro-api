import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  PrismaClient,
  Prisma,
  OrganizationType,
  OrderType,
  OrderStatus,
  InventoryStatus,
  Organization,
  User,
  Farm,
  Commodity,
  Order,
  Inventory,
} from '@prisma/client';
import { DatabaseTestManager } from './database-test-manager';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import * as request from 'supertest';
import { MockOpenAIService } from './mocks/openai.mock';
import { MockBrevoService } from './mocks/brevo.mock';
import { OpenAIService } from '@/intelligence/openai.service';
import { BrevoService } from '@/external-service/brevo/brevo.service';
import { PlanFeatureMapperService } from '@/billing/services/plan-feature-mapper.service';
import { SubscriptionTier } from '@prisma/client';  

// Type definitions for entities with relations
type OrganizationWithRelations = Organization;

type UserWithRelations = User & {
  organization: Organization;
};

type FarmWithRelations = Farm & {
  organization: Organization;
};

type CommodityWithRelations = Commodity & {
  farm?: Farm | null;
};

type OrderWithRelations = Order & {
  buyerOrg: Organization;
  supplierOrg?: Organization | null;
  createdBy: User;
};

type InventoryWithRelations = Inventory & {
  organization: Organization;
  commodity: Commodity;
  farm?: Farm | null;
};

// Scenario result types
export interface BasicFarmScenarioResult {
  organization: Organization;
  user: User;
  farm: Farm;
  commodity: Commodity;
}

export interface MultiFarmScenarioResult {
  organizations: Organization[];
  users: User[];
  farms: Farm[];
}

export interface OrdersScenarioResult {
  buyerOrg: Organization;
  supplierOrg: Organization;
  buyer: User;
  supplier: User;
  farm: Farm;
  commodities: Commodity[];
  orders: Order[];
}

export interface FullEcosystemScenarioResult {
  basic: BasicFarmScenarioResult;
  multi: MultiFarmScenarioResult;
  orders: OrdersScenarioResult;
}

type ScenarioResult =
  | Record<string, never> // Empty object for EMPTY scenario
  | BasicFarmScenarioResult
  | MultiFarmScenarioResult
  | OrdersScenarioResult
  | FullEcosystemScenarioResult;

/**
 * Test scenarios for seeding different data configurations
 */
export enum TestScenario {
  EMPTY = 'empty',
  BASIC_FARM = 'basic_farm',
  MULTI_FARM = 'multi_farm',
  ORDERS_SCENARIO = 'orders_scenario',
  FULL_ECOSYSTEM = 'full_ecosystem',
}

/**
 * Reusable TestContext class with NestJS and Prisma integration
 * Provides factory methods for creating test entities and managing test lifecycle
 */
export class TestContext {
  private _app: INestApplication;
  private _prisma: PrismaClient;
  private _dbManager: DatabaseTestManager;
  private _module: TestingModule;

  constructor() {
    this._dbManager = DatabaseTestManager.getInstance();
  }

  /**
   * Initialize NestJS application and database for testing
   */
  async setup(): Promise<void> {
    // Start database container if not already running
    if (!this._dbManager.isRunning()) {
      await this._dbManager.startContainer();
    }

    // Get Prisma client from database manager
    this._prisma = this._dbManager.getPrismaClient();

    // Create NestJS testing module
    this._module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(this._prisma)
      .overrideProvider(OpenAIService)
      .useValue(new MockOpenAIService())
      .overrideProvider(BrevoService)
      .useValue(new MockBrevoService())
      .compile();

    // Create NestJS application instance
    this._app = this._module.createNestApplication();
    await this._app.init();
  }

  /**
   * Cleanup resources and close connections
   */
  async teardown(): Promise<void> {
    if (this._app) {
      await this._app.close();
    }
    if (this._module) {
      await this._module.close();
    }
  }

  /**
   * Reset database to clean state
   */
  async resetDatabase(): Promise<void> {
    await this._dbManager.resetDatabase();
  }

  /**
   * Clean up specific tables
   */
  async cleanupTables(tableNames: string[]): Promise<void> {
    await this._dbManager.cleanupTables(tableNames);
  }

  /**
   * Get Prisma client instance
   */
  get prisma(): PrismaClient {
    if (!this._prisma) {
      throw new Error('TestContext not initialized. Call setup() first.');
    }
    return this._prisma;
  }

  /**
   * Get NestJS application instance
   */
  get app(): INestApplication {
    if (!this._app) {
      throw new Error('TestContext not initialized. Call setup() first.');
    }
    return this._app;
  }

  /**
   * Get supertest request instance for API testing
   */
  request(): request.SuperTest<request.Test> {
    return request(this.app.getHttpServer()) as unknown as request.SuperTest<request.Test>;
  }

  /**
   * Get the mock Brevo service for email testing assertions
   */
  getMockBrevoService(): MockBrevoService {
    return this._module.get<MockBrevoService>(BrevoService) as MockBrevoService;
  }

  // Factory Methods for Test Entities

  /**
   * Create a test organization
   */
  async createOrganization(
    overrides: Partial<Prisma.OrganizationCreateInput> = {},
  ): Promise<OrganizationWithRelations> {

    const orgType = overrides.type || OrganizationType.FARM_OPERATION;
    const plan = (overrides.plan || SubscriptionTier.FREE) as SubscriptionTier;

    // Initialize organization features based on type and plan
    const planFeatureMapper = new PlanFeatureMapperService();
    const { allowedModules, features } = planFeatureMapper.getOrganizationFeatures(orgType, plan);

    // Add RBAC feature to all test organizations
    const featuresWithRbac = [...features, 'rbac'];
    const modulesWithRbac = [...allowedModules, 'rbac'];
    
    const defaultData: Prisma.OrganizationCreateInput = {
      name: `Test Organization ${Date.now()}`,
      type: orgType,
      email: `test-org-${Date.now()}@example.com`,
      isActive: true,
      plan,
      maxUsers: 5,
      maxFarms: 1,
      features: featuresWithRbac,
      allowedModules: modulesWithRbac,
      ...overrides,
    };

    return await this.prisma.organization.create({
      data: defaultData,
    });
  }

  /**
   * Create a test user
   */
  async createUser(
    overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
  ): Promise<UserWithRelations> {
    // Create organization if not provided
    let organizationId = overrides.organizationId;
    if (!organizationId) {
      const org = await this.createOrganization();
      organizationId = org.id;
    }

    const defaultData: Prisma.UserUncheckedCreateInput = {
      email: `test-user-${Date.now()}@example.com`,
      name: `Test User ${Date.now()}`,
      organizationId,
      isActive: true,
      emailVerified: true,
      ...overrides,
    };

    const user = await this.prisma.user.create({
      data: defaultData,
      include: {
        organization: true,
      },
    });

    // Debug: Check roles right after user creation
    const rolesAfterUserCreation = await this.prisma.role.findMany();
    console.log('Roles after user creation:', rolesAfterUserCreation.map(r => ({ name: r.name, isSystemRole: r.isSystemRole, scope: r.scope, organizationId: r.organizationId })));

    // Assign the Organization Owner role to the user (has all permissions)
    await this.assignOrganizationOwnerRole(user.id, organizationId);

    return user;
  }

  /**
   * Create a test user without automatic role assignment
   */
  async createUserWithoutRole(
    overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
  ): Promise<UserWithRelations> {
    // Create organization if not provided
    let organizationId = overrides.organizationId;
    if (!organizationId) {
      const org = await this.createOrganization();
      organizationId = org.id;
    }

    const defaultData: Prisma.UserUncheckedCreateInput = {
      email: `test-user-${Date.now()}@example.com`,
      name: `Test User ${Date.now()}`,
      organizationId,
      isActive: true,
      emailVerified: true,
      ...overrides,
    };

    const user = await this.prisma.user.create({
      data: defaultData,
      include: {
        organization: true,
      },
    });

    return user;
  }

  /**
   * Create a test farm
   */
  async createFarm(
    overrides: Partial<Prisma.FarmCreateInput> = {},
  ): Promise<FarmWithRelations> {
    // Create organization if not provided
    let organizationId = overrides.organization?.connect?.id;
    if (!organizationId && !overrides.organization) {
      const org = await this.createOrganization();
      organizationId = org.id;
    }

    const defaultData: Prisma.FarmCreateInput = {
      name: `Test Farm ${Date.now()}`,
      organization: organizationId
        ? { connect: { id: organizationId } }
        : overrides.organization!,
      totalArea: 100.0,
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        address: '123 Farm Road, Test City, TC 12345',
      },
      cropTypes: ['corn', 'soybeans'],
      establishedDate: new Date('2020-01-01'),
      certifications: ['organic'],
      isActive: true,
      isPublic: false,
      ...overrides,
    };

    return await this.prisma.farm.create({
      data: defaultData,
      include: {
        organization: true,
      },
    });
  }

  /**
   * Create a test commodity
   */
  async createCommodity(
    overrides: Partial<Prisma.CommodityCreateInput> = {},
  ): Promise<CommodityWithRelations> {
    const defaultData: Prisma.CommodityCreateInput = {
      name: `Test Commodity ${Date.now()}`,
      category: 'grain',
      variety: 'yellow',
      qualityGrade: 'premium',
      quantity: 1000.0,
      unit: 'bushel',
      harvestDate: new Date(),
      storageLocation: 'Warehouse A',
      description: 'High quality test commodity',
      isActive: true,
      isGlobal: true,
      ...overrides,
    };

    return await this.prisma.commodity.create({
      data: defaultData,
      include: {
        farm: true,
      },
    });
  }

  /**
   * Create a test order
   */
  async createOrder(
    overrides: Partial<Prisma.OrderCreateInput> = {},
  ): Promise<OrderWithRelations> {
    // Create required entities if not provided
    let buyerOrgId: string;
    let createdById: string;
    let commodityId: string;

    // Handle buyerOrg connection
    if (overrides.buyerOrg?.connect?.id) {
      buyerOrgId = overrides.buyerOrg.connect.id;
    } else if (!overrides.buyerOrg) {
      const buyerOrg = await this.createOrganization({
        name: 'Buyer Organization',
      });
      buyerOrgId = buyerOrg.id;
    } else {
      throw new Error('buyerOrg must be provided');
    }

    // Handle createdBy connection
    if (overrides.createdBy?.connect?.id) {
      createdById = overrides.createdBy.connect.id;
    } else if (!overrides.createdBy) {
      const creator = await this.createUser({
        organizationId: buyerOrgId,
      });
      createdById = creator.id;
    } else {
      throw new Error('createdBy must be provided');
    }

    // Handle commodity - for now we'll use a simple string reference
    if (!overrides.commodityId) {
      const commodity = await this.createCommodity();
      commodityId = commodity.id;
    } else {
      commodityId = overrides.commodityId;
    }

    const orderNumber = `ORD-${Date.now()}`;
    const quantity = 100.0;
    const pricePerUnit = 5.5;

    const defaultData: Prisma.OrderCreateInput = {
      orderNumber,
      title: `Test Order ${Date.now()}`,
      type: OrderType.BUY,
      status: OrderStatus.PENDING,
      commodityId,
      quantity,
      pricePerUnit,
      totalPrice: quantity * pricePerUnit,
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      deliveryLocation: '123 Delivery Street, Test City, TC 12345',
      terms: {
        paymentMethod: 'credit',
        deliveryTerms: 'FOB destination',
        qualityRequirements: 'Grade A or better',
      },
      buyerOrg: { connect: { id: buyerOrgId } },
      createdBy: { connect: { id: createdById } },
      currency: 'USD',
      deliveryAddress: {
        street: '123 Delivery Street',
        city: 'Test City',
        state: 'TC',
        zipCode: '12345',
      },
      ...overrides,
    };

    return await this.prisma.order.create({
      data: defaultData,
      include: {
        buyerOrg: true,
        supplierOrg: true,
        createdBy: true,
      },
    });
  }

  /**
   * Create a test inventory item
   */
  async createInventory(
    overrides: Partial<Prisma.InventoryCreateInput> = {},
  ): Promise<InventoryWithRelations> {
    // Create required entities if not provided
    let organizationId: string;
    let commodityId: string;

    // Handle organization connection
    if (overrides.organization?.connect?.id) {
      organizationId = overrides.organization.connect.id;
    } else if (!overrides.organization) {
      const org = await this.createOrganization();
      organizationId = org.id;
    } else {
      throw new Error('organization must be provided');
    }

    // Handle commodity connection
    if (overrides.commodity?.connect?.id) {
      commodityId = overrides.commodity.connect.id;
    } else if (!overrides.commodity) {
      const commodity = await this.createCommodity();
      commodityId = commodity.id;
    } else {
      throw new Error('commodity must be provided');
    }

    const defaultData: Prisma.InventoryCreateInput = {
      organization: { connect: { id: organizationId } },
      commodity: { connect: { id: commodityId } },
      quantity: 500.0,
      unit: 'bushel',
      quality: 'Grade A',
      location: 'Warehouse B',
      status: InventoryStatus.AVAILABLE,
      ...overrides,
    };

    return await this.prisma.inventory.create({
      data: defaultData,
      include: {
        organization: true,
        commodity: true,
        farm: true,
      },
    });
  }

  // Test Data Seeding Utilities

  /**
   * Seed test data for different scenarios
   */
  async seedTestData(scenario: TestScenario): Promise<ScenarioResult> {
    switch (scenario) {
      case TestScenario.EMPTY:
        return {}; // No data seeded

      case TestScenario.BASIC_FARM:
        return await this.seedBasicFarmScenario();

      case TestScenario.MULTI_FARM:
        return await this.seedMultiFarmScenario();

      case TestScenario.ORDERS_SCENARIO:
        return await this.seedOrdersScenario();

      case TestScenario.FULL_ECOSYSTEM:
        return await this.seedFullEcosystemScenario();

      default:
        throw new Error(`Unknown test scenario: ${scenario}`);
    }
  }

  /**
   * Seed basic farm scenario with one organization, farm, and user
   */
  private async seedBasicFarmScenario(): Promise<BasicFarmScenarioResult> {
    return await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: 'Basic Farm Organization',
          type: OrganizationType.FARM_OPERATION,
          email: 'basic-farm@example.com',
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: 'farmer@example.com',
          name: 'John Farmer',
          organization: { connect: { id: organization.id } },
          isActive: true,
          emailVerified: true,
        },
      });

      const farm = await tx.farm.create({
        data: {
          name: 'Sunny Acres Farm',
          organization: { connect: { id: organization.id } },
          totalArea: 250.0,
          location: {
            latitude: 41.8781,
            longitude: -87.6298,
            address: '456 Farm Lane, Rural City, RC 54321',
          },
          cropTypes: ['corn', 'soybeans', 'wheat'],
          establishedDate: new Date('2015-03-15'),
          certifications: ['organic', 'non-gmo'],
          isActive: true,
        },
      });

      const commodity = await tx.commodity.create({
        data: {
          name: 'Organic Corn',
          category: 'grain',
          variety: 'yellow dent',
          qualityGrade: 'premium',
          quantity: 2000.0,
          unit: 'bushel',
          harvestDate: new Date(),
          storageLocation: 'Main Silo',
          farm: { connect: { id: farm.id } },
          isActive: true,
          isGlobal: false,
        },
      });

      return { organization, user, farm, commodity };
    });
  }

  /**
   * Seed multi-farm scenario with multiple organizations and farms
   */
  private async seedMultiFarmScenario(): Promise<MultiFarmScenarioResult> {
    return await this.prisma.$transaction(async (tx) => {
      const farms = [];
      const organizations = [];
      const users = [];

      for (let i = 1; i <= 3; i++) {
        const org = await tx.organization.create({
          data: {
            name: `Farm Organization ${i}`,
            type: OrganizationType.FARM_OPERATION,
            email: `farm${i}@example.com`,
            isActive: true,
          },
        });
        organizations.push(org);

        const user = await tx.user.create({
          data: {
            email: `farmer${i}@example.com`,
            name: `Farmer ${i}`,
            organization: { connect: { id: org.id } },
            isActive: true,
            emailVerified: true,
          },
        });
        users.push(user);

        const farm = await tx.farm.create({
          data: {
            name: `Test Farm ${i}`,
            organization: { connect: { id: org.id } },
            totalArea: 100.0 * i,
            location: {
              latitude: 40.0 + i,
              longitude: -80.0 - i,
              address: `${i}00 Farm Road, Test City ${i}, TC 1234${i}`,
            },
            cropTypes: i === 1 ? ['corn'] : i === 2 ? ['soybeans'] : ['wheat'],
            establishedDate: new Date(`201${i}-01-01`),
            certifications: i % 2 === 0 ? ['organic'] : [],
            isActive: true,
          },
        });
        farms.push(farm);
      }

      return { organizations, users, farms };
    });
  }

  /**
   * Seed orders scenario with buyers, suppliers, and orders
   */
  private async seedOrdersScenario(): Promise<OrdersScenarioResult> {
    return await this.prisma.$transaction(async (tx) => {
      // Create buyer organization
      const buyerOrg = await tx.organization.create({
        data: {
          name: 'Grain Buyer Corp',
          type: OrganizationType.COMMODITY_TRADER,
          email: 'buyer@example.com',
          isActive: true,
        },
      });

      // Create supplier organization
      const supplierOrg = await tx.organization.create({
        data: {
          name: 'Farm Supplier LLC',
          type: OrganizationType.FARM_OPERATION,
          email: 'supplier@example.com',
          isActive: true,
        },
      });

      // Create users
      const buyer = await tx.user.create({
        data: {
          email: 'buyer-user@example.com',
          name: 'Buyer User',
          organization: { connect: { id: buyerOrg.id } },
          isActive: true,
          emailVerified: true,
        },
      });

      const supplier = await tx.user.create({
        data: {
          email: 'supplier-user@example.com',
          name: 'Supplier User',
          organization: { connect: { id: supplierOrg.id } },
          isActive: true,
          emailVerified: true,
        },
      });

      // Create farm for supplier
      const farm = await tx.farm.create({
        data: {
          name: 'Supplier Farm',
          organization: { connect: { id: supplierOrg.id } },
          totalArea: 500.0,
          location: {
            latitude: 42.0,
            longitude: -85.0,
            address: '789 Supplier Road, Farm Town, FT 67890',
          },
          cropTypes: ['corn', 'soybeans'],
          establishedDate: new Date('2010-01-01'),
          certifications: ['organic'],
          isActive: true,
        },
      });

      // Create commodities
      const commodity1 = await tx.commodity.create({
        data: {
          name: 'Premium Corn',
          category: 'grain',
          variety: 'yellow',
          qualityGrade: 'premium',
          quantity: 5000.0,
          unit: 'bushel',
          harvestDate: new Date(),
          storageLocation: 'Main Storage',
          farm: { connect: { id: farm.id } },
          isActive: true,
          isGlobal: false,
        },
      });

      const commodity2 = await tx.commodity.create({
        data: {
          name: 'Organic Soybeans',
          category: 'grain',
          variety: 'non-gmo',
          qualityGrade: 'premium',
          quantity: 3000.0,
          unit: 'bushel',
          harvestDate: new Date(),
          storageLocation: 'Secondary Storage',
          farm: { connect: { id: farm.id } },
          isActive: true,
          isGlobal: false,
        },
      });

      // Create orders
      const order1 = await tx.order.create({
        data: {
          orderNumber: 'ORD-CORN-001',
          title: 'Bulk Corn Purchase',
          type: OrderType.BUY,
          status: OrderStatus.PENDING,
          commodityId: commodity1.id,
          quantity: 1000.0,
          pricePerUnit: 6.5,
          totalPrice: 6500.0,
          deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          deliveryLocation: 'Buyer Warehouse, Main St, Buyer City',
          terms: {
            paymentMethod: 'credit',
            deliveryTerms: 'FOB destination',
            qualityRequirements: 'Grade A premium',
          },
          buyerOrg: { connect: { id: buyerOrg.id } },
          supplierOrg: { connect: { id: supplierOrg.id } },
          createdBy: { connect: { id: buyer.id } },
          farm: { connect: { id: farm.id } },
          currency: 'USD',
        },
      });

      const order2 = await tx.order.create({
        data: {
          orderNumber: 'ORD-SOY-001',
          title: 'Organic Soybean Order',
          type: OrderType.BUY,
          status: OrderStatus.CONFIRMED,
          commodityId: commodity2.id,
          quantity: 500.0,
          pricePerUnit: 12.0,
          totalPrice: 6000.0,
          deliveryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          deliveryLocation: 'Processing Plant, Industrial Ave, Processor City',
          terms: {
            paymentMethod: 'escrow',
            deliveryTerms: 'FOB origin',
            qualityRequirements: 'Certified organic',
          },
          buyerOrg: { connect: { id: buyerOrg.id } },
          supplierOrg: { connect: { id: supplierOrg.id } },
          createdBy: { connect: { id: buyer.id } },
          farm: { connect: { id: farm.id } },
          currency: 'USD',
        },
      });

      return {
        buyerOrg,
        supplierOrg,
        buyer,
        supplier,
        farm,
        commodities: [commodity1, commodity2],
        orders: [order1, order2],
      };
    });
  }

  /**
   * Seed full ecosystem scenario with comprehensive test data
   */
  private async seedFullEcosystemScenario(): Promise<FullEcosystemScenarioResult> {
    // This would create a comprehensive test environment
    // with multiple organizations, farms, users, commodities, orders, etc.
    const basicData = await this.seedBasicFarmScenario();
    const multiData = await this.seedMultiFarmScenario();
    const orderData = await this.seedOrdersScenario();

    return {
      basic: basicData,
      multi: multiData,
      orders: orderData,
    };
  }

  // Utility Methods

  /**
   * Wait for async operation with timeout
   */
  async waitForAsyncOperation<T>(
    operation: Promise<T>,
    timeout: number = 5000,
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeout}ms`)),
          timeout,
        ),
      ),
    ]);
  }

  /**
   * Generate unique test identifier
   */
  generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create authenticated request with JWT token
   */
  async createAuthenticatedRequest(
    user?: UserWithRelations,
  ): Promise<request.SuperTest<request.Test>> {
    if (!user) {
      user = await this.createUser();
    }

    // This would typically involve creating a JWT token
    // For now, we'll return the basic request object
    // In a real implementation, you'd add authentication headers
    const req = this.request();

    // Add authentication header when auth is implemented
    // req.set('Authorization', `Bearer ${token}`);

    return req;
  }

  /**
   * Assert JSON API response format
   */
  assertJsonApiResponse(
    response: request.Response,
    expectedType?: string,
  ): void {
    expect(response.body).toHaveProperty('data');

    if (expectedType) {
      if (Array.isArray(response.body.data)) {
        response.body.data.forEach((item: any) => {
          expect(item).toHaveProperty('type', expectedType);
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('attributes');
        });
      } else {
        expect(response.body.data).toHaveProperty('type', expectedType);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('attributes');
      }
    }
  }

  /**
   * Get database health status
   */
  async getDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
    return await this._dbManager.getHealthStatus();
  }

  /**
   * Assign Organization Owner role to user (has all permissions from init-test-db.ts)
   */
  async assignOrganizationOwnerRole(userId: string, organizationId: string): Promise<void> {
    // Find the Organization Owner role (created by init-test-db.ts)
    let organizationOwnerRole = await this.prisma.role.findFirst({
      where: {
        name: 'Organization Owner',
        isSystemRole: true,
        scope: 'ORGANIZATION',
        organizationId: null, // System roles have null organizationId
      },
    });

    if (!organizationOwnerRole) {
      // Create the Organization Owner role with all permissions
      organizationOwnerRole = await this.prisma.role.create({
        data: {
          name: 'Organization Owner',
          description: 'Organization owner with full access to all features',
          isSystemRole: true,
          organizationId: null,
          scope: 'ORGANIZATION',
        },
      });
    }

    // Ensure the role has all permissions (whether it was just created or already existed)
    const existingPermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: organizationOwnerRole.id },
    });

    // Ensure the role has all permissions (whether it was just created or already existed)
    if (existingPermissions.length === 0) {
      const allPermissions = await this.prisma.permission.findMany();

      for (const permission of allPermissions) {
        await this.prisma.rolePermission.create({
          data: {
            roleId: organizationOwnerRole.id,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
    }

    // Check if user already has this role assigned
    const existingUserRole = await this.prisma.userRole.findFirst({
      where: {
        userId: userId,
        roleId: organizationOwnerRole.id,
      },
    });

    // Assign the role to the user if not already assigned
    if (!existingUserRole) {
      await this.prisma.userRole.create({
        data: {
          userId: userId,
          roleId: organizationOwnerRole.id,
          isActive: true,
        },
      });
    }
  }

  /**
   * Assign farm manager role to a user
   */
  async assignFarmManagerRole(userId: string, organizationId: string, farmId?: string): Promise<void> {
    // First, ensure farm, activities, and orders permissions exist
    await this.ensureFarmPermissions();
    await this.ensureActivitiesPermissions();
    await this.ensureOrdersPermissions();
    
    // Use farmId parameter (can be undefined for organization-level roles)
    const targetFarmId = farmId || null;

    // Create or get the Farm Manager role
    let farmManagerRole = await this.prisma.role.findFirst({
      where: {
        name: 'Farm Manager',
        organizationId: organizationId,
      },
    });

    if (!farmManagerRole) {
      farmManagerRole = await this.prisma.role.create({
        data: {
          name: 'Farm Manager',
          description: 'Manage farm operations and team',
          organizationId: organizationId,
          level: 80,
          isActive: true,
          isSystemRole: true,
        },
      });

      // Assign farm permissions to the role
      const farmPermissions = await this.prisma.permission.findMany({
        where: {
          resource: 'farms',
        },
      });

      await Promise.all(
        farmPermissions.map(permission =>
          this.prisma.rolePermission.create({
            data: {
              roleId: farmManagerRole.id,
              permissionId: permission.id,
              granted: true,
            },
          })
        )
      );

      // Assign activities permissions to the role
      const activitiesPermissions = await this.prisma.permission.findMany({
        where: {
          resource: 'activities',
        },
      });

      await Promise.all(
        activitiesPermissions.map(permission =>
          this.prisma.rolePermission.create({
            data: {
              roleId: farmManagerRole.id,
              permissionId: permission.id,
              granted: true,
            },
          })
        )
      );

      // Ensure marketplace permissions exist and assign them to the role
      await this.ensureMarketplacePermissions();
      const marketplacePermissions = await this.prisma.permission.findMany({
        where: {
          resource: 'marketplace',
        },
      });

      await Promise.all(
        marketplacePermissions.map(permission =>
          this.prisma.rolePermission.create({
            data: {
              roleId: farmManagerRole.id,
              permissionId: permission.id,
              granted: true,
            },
          })
        )
      );

      // Ensure orders permissions exist and assign them to the role
      const ordersPermissions = await this.prisma.permission.findMany({
        where: {
          resource: 'orders',
        },
      });

      await Promise.all(
        ordersPermissions.map(permission =>
          this.prisma.rolePermission.create({
            data: {
              roleId: farmManagerRole.id,
              permissionId: permission.id,
              granted: true,
            },
          })
        )
      );

      // Ensure media permissions exist and assign them to the role
      const mediaPermissions = await this.prisma.permission.findMany({
        where: {
          resource: 'media',
        },
      });

      await Promise.all(
        mediaPermissions.map(permission =>
          this.prisma.rolePermission.create({
            data: {
              roleId: farmManagerRole.id,
              permissionId: permission.id,
              granted: true,
            },
          })
        )
      );

    }

    // Assign the role to the user
    // Use the provided farmId or a placeholder for organization-level roles
    await this.prisma.userRole.create({
      data: {
        userId: userId,
        roleId: farmManagerRole.id,
        farmId: targetFarmId || 'org-level-role',
        isActive: true,
      },
    });
  }

  /**
   * Ensure farm permissions exist in the database
   */
  async ensureFarmPermissions(): Promise<void> {
    const farmPermissions = [
      { resource: 'farms', action: 'create', description: 'Create farms' },
      { resource: 'farms', action: 'read', description: 'View farm information' },
      { resource: 'farms', action: 'update', description: 'Update farm details' },
      { resource: 'farms', action: 'delete', description: 'Delete farms' },
      { resource: 'farms', action: 'manage', description: 'Full farm management' },
    ];

    for (const permission of farmPermissions) {
      await this.prisma.permission.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action,
          },
        },
        update: permission,
        create: {
          ...permission,
          isSystemPermission: true,
        },
      });
    }
  }

  /**
   * Ensure activities permissions exist in the database
   */
  async ensureActivitiesPermissions(): Promise<void> {
    const activitiesPermissions = [
      { resource: 'activities', action: 'create', description: 'Create activities' },
      { resource: 'activities', action: 'read', description: 'View activities' },
      { resource: 'activities', action: 'update', description: 'Update activities' },
      { resource: 'activities', action: 'delete', description: 'Delete activities' },
      { resource: 'activities', action: 'execute', description: 'Execute activities' },
      { resource: 'activities', action: 'assign', description: 'Assign activities' },
      { resource: 'activities', action: 'bulk_schedule', description: 'Bulk schedule activities' },
    ];

    for (const permission of activitiesPermissions) {
      await this.prisma.permission.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action,
          },
        },
        update: permission,
        create: {
          ...permission,
          isSystemPermission: true,
        },
      });
    }
  }

  /**
   * Ensure marketplace permissions exist in the database
   */
  async ensureMarketplacePermissions(): Promise<void> {
    const marketplacePermissions = [
      { resource: 'marketplace', action: 'browse', description: 'Browse marketplace' },
      { resource: 'marketplace', action: 'create', description: 'Create marketplace listings' },
      { resource: 'marketplace', action: 'read', description: 'View marketplace listings' },
      { resource: 'marketplace', action: 'update', description: 'Update marketplace listings' },
      { resource: 'marketplace', action: 'delete', description: 'Delete marketplace listings' },
      { resource: 'marketplace', action: 'manage', description: 'Full marketplace management' },
      { resource: 'marketplace', action: 'generate_contract', description: 'Generate contracts' },
      { resource: 'marketplace', action: 'create_listing', description: 'Create marketplace listings' },
    ];

    for (const permission of marketplacePermissions) {
      await this.prisma.permission.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action,
          },
        },
        update: permission,
        create: {
          ...permission,
          isSystemPermission: true,
        },
      });
    }
  }

  /**
   * Ensure orders permissions exist in the database
   */
  async ensureOrdersPermissions(): Promise<void> {
    const ordersPermissions = [
      { resource: 'orders', action: 'create', description: 'Create orders' },
      { resource: 'orders', action: 'read', description: 'View orders' },
      { resource: 'orders', action: 'update', description: 'Update orders' },
      { resource: 'orders', action: 'delete', description: 'Delete orders' },
      { resource: 'orders', action: 'manage', description: 'Full order management' },
      { resource: 'orders', action: 'publish', description: 'Publish orders' },
      { resource: 'orders', action: 'accept', description: 'Accept orders' },
      { resource: 'orders', action: 'reject', description: 'Reject orders' },
      { resource: 'orders', action: 'counter_offer', description: 'Make counter offers' },
      { resource: 'orders', action: 'confirm', description: 'Confirm orders' },
      { resource: 'orders', action: 'start_fulfillment', description: 'Start order fulfillment' },
      { resource: 'orders', action: 'complete', description: 'Complete orders' },
    ];

    for (const permission of ordersPermissions) {
      await this.prisma.permission.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action,
          },
        },
        update: permission,
        create: {
          ...permission,
          isSystemPermission: true,
        },
      });
    }
  }

  /**
   * Seed basic RBAC data for testing
   */
  async seedBasicRbacData(organizationId: string): Promise<void> {
    // Create basic permissions
    const permissions = await Promise.all([
      // RBAC permissions (required by RBAC controller)
      this.prisma.permission.create({
        data: {
          resource: 'rbac',
          action: 'create',
          description: 'Create RBAC resources (roles, permissions)',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'rbac',
          action: 'read',
          description: 'View RBAC resources (roles, permissions)',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'rbac',
          action: 'update',
          description: 'Update RBAC resources (roles, permissions)',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'rbac',
          action: 'delete',
          description: 'Delete RBAC resources (roles, permissions)',
          isSystemPermission: true,
        },
      }),
      // Legacy role permissions (for backward compatibility)
      this.prisma.permission.create({
        data: {
          resource: 'role',
          action: 'create',
          description: 'Create new roles',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'role',
          action: 'read',
          description: 'View roles',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'role',
          action: 'update',
          description: 'Update roles',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'role',
          action: 'delete',
          description: 'Delete roles',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'user',
          action: 'read',
          description: 'View users',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'user',
          action: 'update',
          description: 'Update users',
          isSystemPermission: true,
        },
      }),
      this.prisma.permission.create({
        data: {
          resource: 'permission',
          action: 'read',
          description: 'View permissions',
          isSystemPermission: true,
        },
      }),
    ]);

    // Create basic roles for the organization
    const adminRole = await this.prisma.role.create({
      data: {
        name: 'Admin',
        description: 'Administrator role with full access',
        organizationId: organizationId,
        level: 100,
        isActive: true,
        isSystemRole: true,
      },
    });

    const managerRole = await this.prisma.role.create({
      data: {
        name: 'Manager',
        description: 'Manager role with limited admin access',
        organizationId: organizationId,
        level: 75,
        isActive: true,
        isSystemRole: true,
      },
    });

    const employeeRole = await this.prisma.role.create({
      data: {
        name: 'Employee',
        description: 'Basic employee role',
        organizationId: organizationId,
        level: 25,
        isActive: true,
        isSystemRole: true,
      },
    });

    // Assign permissions to admin role (all permissions)
    await Promise.all(
      permissions.map(permission =>
        this.prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
            granted: true,
          },
        })
      )
    );

    // Assign limited permissions to manager role
    const managerPermissions = permissions.filter(p => 
      p.resource === 'user' || (p.resource === 'role' && p.action === 'read') || (p.resource === 'rbac' && p.action === 'read')
    );
    await Promise.all(
      managerPermissions.map(permission =>
        this.prisma.rolePermission.create({
          data: {
            roleId: managerRole.id,
            permissionId: permission.id,
            granted: true,
          },
        })
      )
    );

    // Assign basic permissions to employee role (only non-sensitive read permissions)
    const employeePermissions = permissions.filter(p => 
      p.action === 'read' && p.resource !== 'role' && p.resource !== 'permission' && p.resource !== 'rbac'
    );
    await Promise.all(
      employeePermissions.map(permission =>
        this.prisma.rolePermission.create({
          data: {
            roleId: employeeRole.id,
            permissionId: permission.id,
            granted: true,
          },
        })
      )
    );
  }
}
