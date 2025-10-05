import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';

export class DatabaseTestManager {
  private container: StartedTestContainer | null = null;
  private prisma: PrismaClient | null = null;
  private static instance: DatabaseTestManager | null = null;

  private constructor() {}

  /**
   * Get singleton instance of DatabaseTestManager
   */
  static getInstance(): DatabaseTestManager {
    if (!DatabaseTestManager.instance) {
      DatabaseTestManager.instance = new DatabaseTestManager();
    }
    return DatabaseTestManager.instance;
  }

  /**
   * Start PostgreSQL container and initialize Prisma client
   */
  async startContainer(): Promise<void> {
    if (this.container) {
      return; // Already started
    }

    console.log('Starting PostgreSQL test container...');

    this.container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .withStartupTimeout(120000) // 2 minutes
      .start();

    const connectionUrl = this.getConnectionUrl();

    // Initialize Prisma client with test database URL
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
    });

    // Run migrations
    await this.runMigrations();

    // Initialize database with permissions and roles
    await this.initializeDatabase();

    console.log('PostgreSQL test container started successfully');
  }

  /**
   * Stop PostgreSQL container and cleanup
   */
  async stopContainer(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }

    if (this.container) {
      await this.container.stop();
      this.container = null;
      console.log('PostgreSQL test container stopped');
    }
  }

  /**
   * Get database connection URL
   */
  getConnectionUrl(): string {
    if (!this.container) {
      throw new Error('Container not started. Call startContainer() first.');
    }

    const host = this.container.getHost();
    const port = this.container.getMappedPort(5432);

    return `postgresql://test_user:test_password@${host}:${port}/test_db?schema=public`;
  }

  /**
   * Get Prisma client instance
   */
  getPrismaClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error(
        'Prisma client not initialized. Call startContainer() first.',
      );
    }
    return this.prisma;
  }

  /**
   * Run Prisma migrations against test database
   */
  async runMigrations(): Promise<void> {
    if (!this.container) {
      throw new Error('Container not started. Call startContainer() first.');
    }

    const connectionUrl = this.getConnectionUrl();
    join(process.cwd(), 'prisma', 'schema.prisma');

    try {
      // Set environment variable for migration
      process.env.DATABASE_URL = connectionUrl;

      // Run migrations using Prisma CLI
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: connectionUrl,
        },
      });

      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Initialize database with permissions and roles (minimal for tests)
   */
  async initializeDatabase(): Promise<void> {
    if (!this.prisma) {
      throw new Error(
        'Prisma client not initialized. Call startContainer() first.',
      );
    }

    try {
      // Set environment variable for init script
      const connectionUrl = this.getConnectionUrl();
      process.env.DATABASE_URL = connectionUrl;

      // Run the minimal test init script
      execSync('npx tsx tests/scripts/init-test-db.ts', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: connectionUrl,
        },
      });

      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Reset database by truncating all tables
   */
  async resetDatabase(): Promise<void> {
    if (!this.prisma) {
      throw new Error(
        'Prisma client not initialized. Call startContainer() first.',
      );
    }

    try {
      // Get all table names from the database
      const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;

      // Disable foreign key checks temporarily
      await this.prisma.$executeRaw`SET session_replication_role = replica;`;

      // Truncate all tables
      for (const table of tables) {
        if (table.tablename !== '_prisma_migrations') {
          await this.prisma.$executeRawUnsafe(
            `TRUNCATE TABLE "${table.tablename}" CASCADE;`,
          );
        }
      }

      // Re-enable foreign key checks
      await this.prisma.$executeRaw`SET session_replication_role = DEFAULT;`;

      console.log('Database reset completed successfully');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Clean up specific tables (useful for test isolation)
   */
  async cleanupTables(tableNames: string[]): Promise<void> {
    if (!this.prisma) {
      throw new Error(
        'Prisma client not initialized. Call startContainer() first.',
      );
    }

    try {
      // Disable foreign key checks temporarily
      await this.prisma.$executeRaw`SET session_replication_role = replica;`;

      // Truncate specified tables
      for (const tableName of tableNames) {
        await this.prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${tableName}" CASCADE;`,
        );
      }

      // Re-enable foreign key checks
      await this.prisma.$executeRaw`SET session_replication_role = DEFAULT;`;

      console.log(`Cleaned up tables: ${tableNames.join(', ')}`);
    } catch (error) {
      console.error('Failed to cleanup tables:', error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query (useful for test setup)
   */
  async executeRawQuery(query: string, params?: any[]): Promise<any> {
    if (!this.prisma) {
      throw new Error(
        'Prisma client not initialized. Call startContainer() first.',
      );
    }

    try {
      if (params && params.length > 0) {
        return await this.prisma.$queryRawUnsafe(query, ...params);
      } else {
        return await this.prisma.$queryRawUnsafe(query);
      }
    } catch (error) {
      console.error('Failed to execute raw query:', error);
      throw error;
    }
  }

  /**
   * Check if container is running
   */
  isRunning(): boolean {
    return this.container !== null && this.prisma !== null;
  }

  /**
   * Get container health status
   */
  async getHealthStatus(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.isRunning()) {
      return { healthy: false, error: 'Container not running' };
    }

    try {
      await this.prisma!.$queryRaw`SELECT 1`;
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
