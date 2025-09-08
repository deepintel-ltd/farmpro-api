import { TestContext } from './test-context';
import {
  PrismaClient,
  InventoryStatus,
  Prisma,
  Organization,
  User,
  Farm,
  Commodity,
  Order,
  Inventory,
} from '@prisma/client';
import * as request from 'supertest';

// Type for Prisma model names
type PrismaModelName = Uncapitalize<Prisma.ModelName>;

// Interface for farm ecosystem result
interface FarmEcosystemResult {
  organizations: Organization[];
  users: User[];
  farms: Farm[];
  commodities: Commodity[];
}

// Interface for trading scenario result
interface TradingScenarioResult {
  buyers: Array<{
    organization: Organization;
    user: User;
    orders: Order[];
  }>;
  suppliers: Array<{
    organization: Organization;
    user: User;
    farm: Farm;
    commodity: Commodity;
  }>;
  orders: Order[];
  commodities: Commodity[];
}

// Interface for inventory scenario result
interface InventoryScenarioResult {
  organizations: Organization[];
  warehouses: Array<{
    organization: Organization;
    location: string;
    inventory: Inventory[];
  }>;
  inventory: Inventory[];
  commodities: Commodity[];
}

/**
 * Additional test helper utilities for use with TestContext
 */

/**
 * Database assertion helpers
 */
export class DatabaseAssertions {
  constructor(private prisma: PrismaClient) {}

  /**
   * Assert that a record exists in the database
   */
  async assertRecordExists<T = unknown>(
    model: PrismaModelName,
    where: Record<string, unknown>,
    message?: string,
  ): Promise<T> {
    const record = await (this.prisma as any)[model].findFirst({ where });
    if (!record) {
      throw new Error(
        message ||
          `Expected record to exist in ${model} with ${JSON.stringify(where)}`,
      );
    }
    return record as T;
  }

  /**
   * Assert that a record does not exist in the database
   */
  async assertRecordNotExists(
    model: PrismaModelName,
    where: Record<string, unknown>,
    message?: string,
  ): Promise<void> {
    const record = await (this.prisma as any)[model].findFirst({ where });
    if (record) {
      throw new Error(
        message ||
          `Expected record to not exist in ${model} with ${JSON.stringify(where)}`,
      );
    }
  }

  /**
   * Assert record count in a table
   */
  async assertRecordCount(
    model: PrismaModelName,
    expectedCount: number,
    where?: Record<string, unknown>,
    message?: string,
  ): Promise<void> {
    const count = await (this.prisma as any)[model].count({ where });
    if (count !== expectedCount) {
      throw new Error(
        message ||
          `Expected ${expectedCount} records in ${model}${where ? ` with ${JSON.stringify(where)}` : ''}, but found ${count}`,
      );
    }
  }

  /**
   * Assert that records have specific relationships
   */
  async assertRelationship(
    parentModel: PrismaModelName,
    parentId: string,
    relationField: string,
    expectedCount: number,
    message?: string,
  ): Promise<void> {
    const parent = await (this.prisma as any)[parentModel].findUnique({
      where: { id: parentId },
      include: { [relationField]: true },
    });

    if (!parent) {
      throw new Error(
        `Parent record not found in ${parentModel} with id ${parentId}`,
      );
    }

    const actualCount = Array.isArray(parent[relationField])
      ? parent[relationField].length
      : parent[relationField]
        ? 1
        : 0;

    if (actualCount !== expectedCount) {
      throw new Error(
        message ||
          `Expected ${expectedCount} related records in ${relationField}, but found ${actualCount}`,
      );
    }
  }
}

/**
 * API response assertion helpers
 */
export class ApiAssertions {
  /**
   * Assert JSON API response structure
   */
  static assertJsonApiResponse(
    response: request.Response,
    expectedType?: string,
    expectedCount?: number,
  ): void {
    expect(response.body).toHaveProperty('data');

    if (Array.isArray(response.body.data)) {
      if (expectedCount !== undefined) {
        expect(response.body.data).toHaveLength(expectedCount);
      }

      if (expectedType) {
        response.body.data.forEach((item: unknown) => {
          expect(item).toHaveProperty('type', expectedType);
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('attributes');
        });
      }
    } else {
      if (expectedType) {
        expect(response.body.data).toHaveProperty('type', expectedType);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('attributes');
      }
    }
  }

  /**
   * Assert JSON API error response structure
   */
  static assertJsonApiErrorResponse(
    response: request.Response,
    expectedStatus?: string,
    expectedTitle?: string,
  ): void {
    expect(response.body).toHaveProperty('errors');
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);

    const error = response.body.errors[0];
    expect(error).toHaveProperty('status');
    expect(error).toHaveProperty('title');

    if (expectedStatus) {
      expect(error.status).toBe(expectedStatus);
    }

    if (expectedTitle) {
      expect(error.title).toBe(expectedTitle);
    }
  }

  /**
   * Assert pagination metadata in JSON API response
   */
  static assertPaginationMeta(
    response: request.Response,
    expectedPage: number,
    expectedSize: number,
    expectedTotal?: number,
  ): void {
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toHaveProperty('pagination');

    const pagination = response.body.meta.pagination;
    expect(pagination).toHaveProperty('page', expectedPage);
    expect(pagination).toHaveProperty('size', expectedSize);

    if (expectedTotal !== undefined) {
      expect(pagination).toHaveProperty('total', expectedTotal);
      expect(pagination).toHaveProperty(
        'pages',
        Math.ceil(expectedTotal / expectedSize),
      );
    }
  }

  /**
   * Assert response includes specific relationships
   */
  static assertIncludes(
    response: request.Response,
    expectedTypes: string[],
  ): void {
    expect(response.body).toHaveProperty('included');
    expect(Array.isArray(response.body.included)).toBe(true);

    const includedTypes = response.body.included.map((item: any) => item.type);
    expectedTypes.forEach((type) => {
      expect(includedTypes).toContain(type);
    });
  }
}

/**
 * Test data builders for complex scenarios
 */
export class TestDataBuilder {
  constructor(private testContext: TestContext) {}

  /**
   * Build a complete farm ecosystem
   */
  async buildFarmEcosystem(
    options: {
      farmCount?: number;
      commoditiesPerFarm?: number;
      usersPerOrg?: number;
    } = {},
  ): Promise<FarmEcosystemResult> {
    const { farmCount = 2, commoditiesPerFarm = 3, usersPerOrg = 2 } = options;

    const ecosystem: FarmEcosystemResult = {
      organizations: [],
      users: [],
      farms: [],
      commodities: [],
    };

    for (let i = 0; i < farmCount; i++) {
      const org = await this.testContext.createOrganization({
        name: `Ecosystem Org ${i + 1}`,
      });
      ecosystem.organizations.push(org);

      // Create users for this organization
      const orgUsers = [];
      for (let j = 0; j < usersPerOrg; j++) {
        const user = await this.testContext.createUser({
          organizationId: org.id,
          name: `User ${j + 1} - Org ${i + 1}`,
        });
        orgUsers.push(user);
        ecosystem.users.push(user);
      }

      // Create farm for this organization
      const farm = await this.testContext.createFarm({
        organization: { connect: { id: org.id } },
        name: `Ecosystem Farm ${i + 1}`,
        totalArea: (i + 1) * 100,
      });
      ecosystem.farms.push(farm);

      // Create commodities for this farm
      const farmCommodities = [];
      for (let k = 0; k < commoditiesPerFarm; k++) {
        const commodity = await this.testContext.createCommodity({
          farm: { connect: { id: farm.id } },
          name: `Commodity ${k + 1} - Farm ${i + 1}`,
          category: ['grain', 'vegetable', 'fruit'][k % 3],
          quantity: (k + 1) * 500,
          isGlobal: false,
        });
        farmCommodities.push(commodity);
        ecosystem.commodities.push(commodity);
      }
    }

    return ecosystem;
  }

  /**
   * Build a trading scenario with buyers and suppliers
   */
  async buildTradingScenario(
    options: {
      buyerCount?: number;
      supplierCount?: number;
      ordersPerBuyer?: number;
    } = {},
  ): Promise<TradingScenarioResult> {
    const { buyerCount = 2, supplierCount = 3, ordersPerBuyer = 2 } = options;

    const scenario: TradingScenarioResult = {
      buyers: [],
      suppliers: [],
      orders: [],
      commodities: [],
    };

    // Create suppliers with farms and commodities
    for (let i = 0; i < supplierCount; i++) {
      const supplierOrg = await this.testContext.createOrganization({
        name: `Supplier ${i + 1}`,
        type: 'FARM_OPERATION',
      });

      const supplierUser = await this.testContext.createUser({
        organizationId: supplierOrg.id,
        name: `Supplier User ${i + 1}`,
      });

      const farm = await this.testContext.createFarm({
        organization: { connect: { id: supplierOrg.id } },
        name: `Supplier Farm ${i + 1}`,
      });

      const commodity = await this.testContext.createCommodity({
        farm: { connect: { id: farm.id } },
        name: `Supplier Commodity ${i + 1}`,
        quantity: 1000 * (i + 1),
        isGlobal: false,
      });

      scenario.suppliers.push({
        organization: supplierOrg,
        user: supplierUser,
        farm,
        commodity,
      });
      scenario.commodities.push(commodity);
    }

    // Create buyers and orders
    for (let i = 0; i < buyerCount; i++) {
      const buyerOrg = await this.testContext.createOrganization({
        name: `Buyer ${i + 1}`,
        type: 'COMMODITY_TRADER',
      });

      const buyerUser = await this.testContext.createUser({
        organizationId: buyerOrg.id,
        name: `Buyer User ${i + 1}`,
      });

      const buyer = {
        organization: buyerOrg,
        user: buyerUser,
        orders: [],
      };

      // Create orders for this buyer
      for (let j = 0; j < ordersPerBuyer; j++) {
        const supplier = scenario.suppliers[j % scenario.suppliers.length];

        const order = await this.testContext.createOrder({
          buyerOrg: { connect: { id: buyerOrg.id } },
          supplierOrg: { connect: { id: supplier.organization.id } },
          createdBy: { connect: { id: buyerUser.id } },
          commodityId: supplier.commodity.id,
          farm: { connect: { id: supplier.farm.id } },
          title: `Order ${j + 1} - Buyer ${i + 1}`,
          quantity: 100 * (j + 1),
          pricePerUnit: 5.0 + j * 0.5,
        });

        buyer.orders.push(order);
        scenario.orders.push(order);
      }

      scenario.buyers.push(buyer);
    }

    return scenario;
  }

  /**
   * Build inventory scenario with multiple warehouses
   */
  async buildInventoryScenario(
    options: {
      warehouseCount?: number;
      itemsPerWarehouse?: number;
    } = {},
  ): Promise<InventoryScenarioResult> {
    const { warehouseCount = 3, itemsPerWarehouse = 5 } = options;

    const scenario: InventoryScenarioResult = {
      organizations: [],
      warehouses: [],
      inventory: [],
      commodities: [],
    };

    for (let i = 0; i < warehouseCount; i++) {
      const org = await this.testContext.createOrganization({
        name: `Warehouse Org ${i + 1}`,
        type: 'LOGISTICS_PROVIDER',
      });
      scenario.organizations.push(org);

      const warehouse = {
        organization: org,
        location: `Warehouse ${i + 1}`,
        inventory: [],
      };

      // Create inventory items for this warehouse
      for (let j = 0; j < itemsPerWarehouse; j++) {
        const commodity = await this.testContext.createCommodity({
          name: `Warehouse Item ${j + 1} - WH ${i + 1}`,
          category: ['grain', 'vegetable', 'fruit'][j % 3],
          quantity: 1000,
          isGlobal: true,
        });
        scenario.commodities.push(commodity);

        const inventoryItem = await this.testContext.createInventory({
          organization: { connect: { id: org.id } },
          commodity: { connect: { id: commodity.id } },
          quantity: 500 + j * 100,
          location: warehouse.location,
          status:
            j % 2 === 0 ? InventoryStatus.AVAILABLE : InventoryStatus.RESERVED,
        });

        warehouse.inventory.push(inventoryItem);
        scenario.inventory.push(inventoryItem);
      }

      scenario.warehouses.push(warehouse);
    }

    return scenario;
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceHelpers {
  /**
   * Measure execution time of an async operation
   */
  static async measureTime<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();
    const duration = endTime - startTime;

    return { result, duration };
  }

  /**
   * Run multiple operations in parallel and measure total time
   */
  static async measureParallelOperations<T>(
    operations: (() => Promise<T>)[],
  ): Promise<{ results: T[]; duration: number }> {
    const startTime = Date.now();
    const results = await Promise.all(operations.map((op) => op()));
    const endTime = Date.now();
    const duration = endTime - startTime;

    return { results, duration };
  }

  /**
   * Assert that an operation completes within a time limit
   */
  static async assertPerformance<T>(
    operation: () => Promise<T>,
    maxDuration: number,
    message?: string,
  ): Promise<T> {
    const { result, duration } = await this.measureTime(operation);

    if (duration > maxDuration) {
      throw new Error(
        message ||
          `Operation took ${duration}ms, expected to complete within ${maxDuration}ms`,
      );
    }

    return result;
  }
}

/**
 * Utility functions for common test patterns
 */
export const testUtils = {
  /**
   * Generate random test data
   */
  randomString: (length: number = 8): string => {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  },

  randomEmail: (): string => {
    return `test-${testUtils.randomString()}@example.com`;
  },

  randomNumber: (min: number = 1, max: number = 1000): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomDate: (daysFromNow: number = 30): Date => {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysFromNow);
    return new Date(now.getTime() + randomDays * 24 * 60 * 60 * 1000);
  },

  /**
   * Wait for a condition to be true
   */
  waitForCondition: async (
    condition: () => Promise<boolean> | boolean,
    timeout: number = 5000,
    interval: number = 100,
  ): Promise<void> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Retry an operation with exponential backoff
   */
  retryWithBackoff: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 100,
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  },
};
