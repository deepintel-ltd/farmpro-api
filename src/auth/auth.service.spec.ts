import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { BrevoService } from '../external-service/brevo/brevo.service';
import { PlanFeatureMapperService } from '../billing/services/plan-feature-mapper.service';
import { OrganizationType } from '@prisma/client';
import { createMock, DeepMocked } from '@golevelup/ts-jest';

// Mock argon2
jest.mock('@node-rs/argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockPrismaService: any;
  let mockJwtService: DeepMocked<JwtService>;
  let mockConfigService: DeepMocked<ConfigService>;
  let mockEmailVerificationService: DeepMocked<EmailVerificationService>;
  let mockBrevoService: DeepMocked<BrevoService>;
  let mockPlanFeatureMapper: DeepMocked<PlanFeatureMapperService>;

  beforeEach(() => {
    // Use simple Jest mocks for PrismaService (complex types)
    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      organization: {
        create: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      userRole: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    // Use @golevelup/ts-jest for simpler services
    mockJwtService = createMock<JwtService>();
    mockConfigService = createMock<ConfigService>();
    mockEmailVerificationService = createMock<EmailVerificationService>();
    mockBrevoService = createMock<BrevoService>();
    mockPlanFeatureMapper = createMock<PlanFeatureMapperService>();

    // Set up default mock implementations
    mockJwtService.sign.mockReturnValue('mock-token');
    mockJwtService.verify.mockReturnValue({});
    mockConfigService.get.mockReturnValue('mock-value');
    mockPlanFeatureMapper.getOrganizationFeatures.mockReturnValue({
      allowedModules: [],
      features: [],
    });

    // Create service instance with mocked dependencies
    const mockInvitationService = {} as any;
    
    service = new AuthService(
      mockPrismaService,
      mockJwtService,
      mockConfigService,
      mockEmailVerificationService,
      mockBrevoService,
      mockPlanFeatureMapper,
      mockInvitationService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      phone: '+1234567890',
      organizationName: 'Test Farm',
      organizationType: OrganizationType.FARM_OPERATION,
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: registerDto.email,
        name: registerDto.name,
        phone: registerDto.phone,
        organizationId: 'org-1',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
          id: 'org-1',
          name: registerDto.organizationName,
          type: registerDto.organizationType,
          isVerified: false,
          plan: 'basic',
        },
        userRoles: [],
      };

      // Mock the getUserWithRoles call by mocking the Prisma calls it makes
      const mockUserWithRoles = {
        id: 'user-1',
        email: registerDto.email,
        name: registerDto.name,
        phone: registerDto.phone,
        organizationId: 'org-1',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
          id: 'org-1',
          name: registerDto.organizationName,
          type: registerDto.organizationType,
          plan: 'basic',
          features: ['farm_management'],
          allowedModules: ['farm_management'],
          isVerified: true,
          isSuspended: false,
        },
        userRoles: [{
          id: 'role-1',
          role: {
            id: 'role-1',
            name: 'admin',
            level: 100,
            scope: 'ORGANIZATION',
          },
          isActive: true,
        }],
      };

      // Override the method with jest.fn() for Jest mock functionality
      mockPrismaService.user.findUnique = jest.fn()
        .mockResolvedValueOnce(null) // First call for existing user check
        .mockResolvedValueOnce(mockUserWithRoles) // Second call for getUserWithRoles
        .mockResolvedValue(mockUserWithRoles); // All subsequent calls

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValue(mockUser.organization),
          },
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          role: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'org-owner-role-1',
              name: 'Organization Owner',
              isSystemRole: true,
              scope: 'ORGANIZATION',
            }),
            upsert: jest.fn().mockResolvedValue({
              id: 'role-1',
              name: 'Organization Owner',
              organizationId: 'org-1',
            }),
          },
          rolePermission: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'rp-1',
                roleId: 'org-owner-role-1',
                permissionId: 'perm-1',
                granted: true,
                conditions: null,
                permission: {
                  id: 'perm-1',
                  name: 'farm_management:read',
                },
              },
            ]),
            upsert: jest.fn().mockResolvedValue({}),
          },
          userRole: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      mockJwtService.sign.mockReturnValue('mock-token');
      mockConfigService.get.mockReturnValue(3600);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('message');
      expect(result.user.email).toBe(registerDto.email);
      expect(mockPrismaService.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { email: registerDto.email },
        select: { id: true },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user data for valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        hashedPassword: 'hashed-password',
        isActive: true,
        organization: { id: 'org-1' },
        userRoles: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('hashedPassword');
    });

    it('should return null for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should return new access token for valid refresh token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        organizationId: 'org-1',
        refreshTokenHash: 'hashed-refresh-token',
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
      };

      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        organizationId: 'org-1',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-access-token');
      mockConfigService.get
        .mockReturnValueOnce('refresh-secret')
        .mockReturnValueOnce(3600);

      const result = await service.refresh({
        refreshToken: 'valid-refresh-token',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.refresh({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should always return success message', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        metadata: {},
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
    });

    it('should return success even for non-existent email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockUser = {
        id: 'user-1',
        metadata: {
          resetTokenHash: 'valid-token-hash',
          resetTokenExpiresAt: new Date(
            Date.now() + 60 * 60 * 1000,
          ).toISOString(),
        },
      };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.resetPassword({
        token: 'valid-token',
        newPassword: 'newpassword123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset successfully');
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const mockUser = {
        id: 'user-1',
        hashedPassword: 'current-hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        currentPassword: 'currentpassword',
        newPassword: 'newpassword123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      const mockUser = {
        id: 'user-1',
        hashedPassword: 'current-hashed-password',
      };

      const mockVerify = jest.mocked((await import('@node-rs/argon2')).verify);
      mockVerify.mockResolvedValueOnce(false);

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
