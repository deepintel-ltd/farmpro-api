import { DatabaseTestManager } from './database-test-manager';

/**
 * Configuration and utilities for database testing
 */
export class DatabaseTestConfig {
  private static dbManager: DatabaseTestManager;

  /**
   * Initialize database for testing
   * Call this in your test setup
   */
  static async setupDatabase(): Promise<DatabaseTestManager> {
    if (!DatabaseTestConfig.dbManager) {
      DatabaseTestConfig.dbManager = DatabaseTestManager.getInstance();
      await DatabaseTestConfig.dbManager.startContainer();
    }
    return DatabaseTestConfig.dbManager;
  }

  /**
   * Cleanup database after testing
   * Call this in your test teardown
   */
  static async teardownDatabase(): Promise<void> {
    if (DatabaseTestConfig.dbManager) {
      await DatabaseTestConfig.dbManager.stopContainer();
      DatabaseTestConfig.dbManager = null as any;
    }
  }

  /**
   * Reset database between tests
   */
  static async resetDatabase(): Promise<void> {
    if (DatabaseTestConfig.dbManager) {
      await DatabaseTestConfig.dbManager.resetDatabase();
    }
  }

  /**
   * Get database manager instance
   */
  static getDatabaseManager(): DatabaseTestManager {
    if (!DatabaseTestConfig.dbManager) {
      throw new Error('Database not initialized. Call setupDatabase() first.');
    }
    return DatabaseTestConfig.dbManager;
  }

  /**
   * Get Prisma client for testing
   */
  static getPrismaClient() {
    return DatabaseTestConfig.getDatabaseManager().getPrismaClient();
  }

  /**
   * Get database connection URL for testing
   */
  static getConnectionUrl(): string {
    return DatabaseTestConfig.getDatabaseManager().getConnectionUrl();
  }
}

/**
 * Decorator for test classes that need database
 * Usage: @WithDatabase
 */
export function WithDatabase<T extends { new (...args: any[]): object }>(constructor: T) {
  return class extends constructor {
    static async setupDatabase() {
      return await DatabaseTestConfig.setupDatabase();
    }

    static async teardownDatabase() {
      return await DatabaseTestConfig.teardownDatabase();
    }

    static async resetDatabase() {
      return await DatabaseTestConfig.resetDatabase();
    }
  };
}

/**
 * Test helper functions
 */
export const testHelpers = {
  /**
   * Wait for async operation with timeout
   */
  async waitFor(
    condition: () => Promise<boolean> | boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Generate unique test identifier
   */
  generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create test database URL with unique database name
   */
  createUniqueTestDatabaseUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    url.pathname = `/test_db_${this.generateTestId()}`;
    return url.toString();
  }
};
