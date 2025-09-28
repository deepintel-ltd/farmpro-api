import { PrismaService } from '../../src/prisma/prisma.service';
import { hash } from '@node-rs/argon2';
import { randomBytes, createHash } from 'crypto';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  hashedPassword: string;
  organizationId: string;
  emailVerified: boolean;
  isActive: boolean;
}

export interface TestOrganization {
  id: string;
  name: string;
  type: 'FARM_OPERATION' | 'COMMODITY_TRADER' | 'LOGISTICS_PROVIDER' | 'INTEGRATED_FARM';
  email: string;
  isVerified: boolean;
  isActive: boolean;
  plan: string;
}

export class AuthTestHelper {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a test organization
   */
  async createTestOrganization(overrides: Partial<TestOrganization> = {}): Promise<TestOrganization> {
    const defaultOrg: Omit<TestOrganization, 'id'> = {
      name: 'Test Organization',
      type: 'FARM_OPERATION',
      email: 'test@example.com',
      isVerified: true,
      isActive: true,
      plan: 'basic',
      ...overrides
    };

    const organization = await this.prisma.organization.create({
      data: {
        ...defaultOrg,
        phone: '+1234567890',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA'
        },
        description: 'Test organization',
        maxUsers: 10,
        maxFarms: 1,
        features: ['basic_features'],
        allowCustomRoles: false
      }
    });

    return organization as TestOrganization;
  }

  /**
   * Create a test user
   */
  async createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    // Create organization if not provided
    let organizationId = overrides.organizationId;
    if (!organizationId) {
      const org = await this.createTestOrganization();
      organizationId = org.id;
    }

    const defaultUser: Omit<TestUser, 'id'> = {
      email: 'testuser@example.com',
      name: 'Test User',
      phone: '+1234567890',
      hashedPassword: await hash('TestPassword123!'),
      organizationId,
      emailVerified: true,
      isActive: true,
      ...overrides
    };

    const user = await this.prisma.user.create({
      data: {
        ...defaultUser,
        hashedPassword: defaultUser.hashedPassword
      }
    });

    return user as TestUser;
  }

  /**
   * Create a test user with specific password
   */
  async createTestUserWithPassword(
    email: string, 
    password: string, 
    overrides: Partial<TestUser> = {}
  ): Promise<TestUser> {
    return this.createTestUser({
      email,
      hashedPassword: await hash(password),
      ...overrides
    });
  }

  /**
   * Create a password reset token (using email verification table for now)
   */
  async createPasswordResetToken(
    userId: string, 
    email: string,
    expiresInHours: number = 1
  ): Promise<string> {
    const token = 'test-reset-token-' + Date.now() + '-' + randomBytes(16).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    await this.prisma.emailVerification.create({
      data: {
        token,
        tokenHash,
        userId,
        email,
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
        requestedAt: new Date()
      }
    });

    return token;
  }

  /**
   * Create an email verification token
   */
  async createEmailVerificationToken(
    userId: string, 
    email: string,
    expiresInHours: number = 24
  ): Promise<string> {
    const token = 'test-verify-token-' + Date.now() + '-' + randomBytes(16).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    await this.prisma.emailVerification.create({
      data: {
        token,
        tokenHash,
        userId,
        email,
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
        requestedAt: new Date()
      }
    });

    return token;
  }

  /**
   * Create a user session (using User model refresh token fields)
   */
  async createUserSession(
    userId: string,
    refreshToken: string,
    expiresInHours: number = 7
  ): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: tokenHash,
        refreshTokenExpiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      }
    });
  }

  /**
   * Clean up auth-related data
   */
  async cleanupAuthData(): Promise<void> {
    await this.prisma.emailVerification.deleteMany();
    await this.prisma.userRole.deleteMany();
    await this.prisma.role.deleteMany();
    await this.prisma.user.deleteMany();
    await this.prisma.organization.deleteMany();
  }

  /**
   * Get user with roles
   */
  async getUserWithRoles(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        userRoles: {
          where: { isActive: true },
          include: {
            role: true
          }
        }
      }
    });
  }

  /**
   * Verify user exists and has expected properties
   */
  async verifyUserExists(email: string, expectedProperties: Partial<TestUser> = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true }
    });

    expect(user).toBeDefined();
    
    if (expectedProperties.email) expect(user?.email).toBe(expectedProperties.email);
    if (expectedProperties.name) expect(user?.name).toBe(expectedProperties.name);
    if (expectedProperties.emailVerified !== undefined) {
      expect(user?.emailVerified).toBe(expectedProperties.emailVerified);
    }
    if (expectedProperties.isActive !== undefined) {
      expect(user?.isActive).toBe(expectedProperties.isActive);
    }

    return user;
  }

  /**
   * Verify organization exists and has expected properties
   */
  async verifyOrganizationExists(name: string, expectedProperties: Partial<TestOrganization> = {}) {
    const organization = await this.prisma.organization.findFirst({
      where: { name }
    });

    expect(organization).toBeDefined();
    
    if (expectedProperties.name) expect(organization?.name).toBe(expectedProperties.name);
    if (expectedProperties.type) expect(organization?.type).toBe(expectedProperties.type);
    if (expectedProperties.plan) expect(organization?.plan).toBe(expectedProperties.plan);

    return organization;
  }

  /**
   * Generate test data for registration
   */
  generateRegistrationData(overrides: any = {}) {
    return {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      phone: '+1234567890',
      organizationName: 'Test Organization',
      organizationType: 'FARM_OPERATION',
      ...overrides
    };
  }

  /**
   * Generate test data for login
   */
  generateLoginData(overrides: any = {}) {
    return {
      email: 'test@example.com',
      password: 'TestPassword123!',
      ...overrides
    };
  }
}
