import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailVerificationService } from '@/auth/email-verification.service';
import { BrevoService } from '@/external-service/brevo/brevo.service';
import { PlanFeatureMapperService } from '@/billing/services/plan-feature-mapper.service';
import { SubscriptionTier } from '@prisma/client';
import { hash, verify } from '@node-rs/argon2';
import { randomBytes, createHash } from 'crypto';
import { UserMetadata } from './types/user-metadata.types';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ValidateTokenDto,
  CompleteProfileDto,
  LoginResponse,
  RegisterResponse,
  TokensResponse,
  AuthUserResponse,
  SuccessMessageResponse,
} from './dto/auth.dto';

interface UserWithOrganizationAndRoles {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  emailVerified: boolean;
  isActive: boolean;
  profileComplete: boolean;
  authProvider: 'LOCAL' | 'GOOGLE' | 'GITHUB' | null;
  lastLoginAt: Date | null;
  organizationId: string | null;
  metadata?: UserMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    type: 'FARM_OPERATION' | 'COMMODITY_TRADER' | 'LOGISTICS_PROVIDER' | 'INTEGRATED_FARM';
    isVerified: boolean;
    plan: string;
  } | null;
  userRoles?: Array<{
    role: {
      id: string;
      name: string;
      level: number;
    };
  }>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_EXPIRES_IN: number;
  private readonly REFRESH_TOKEN_EXPIRES_IN_MS: number;
  private readonly PASSWORD_RESET_EXPIRES_IN_MS: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly brevoService: BrevoService,
    private readonly planFeatureMapper: PlanFeatureMapperService,
  ) {
    this.JWT_EXPIRES_IN = this.configService.get<number>(
      'JWT_EXPIRES_IN_SECONDS',
      3600,
    );
    this.REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.PASSWORD_RESET_EXPIRES_IN_MS = 60 * 60 * 1000; // 1 hour
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const { email, password, name, phone, organizationName, organizationType } =
      registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const { allowedModules, features } = this.planFeatureMapper.getOrganizationFeatures(
        organizationType,
        SubscriptionTier.FREE
      );

      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          type: organizationType,
          email,
          isActive: true,
          plan: SubscriptionTier.FREE,
          maxUsers: 1,
          maxFarms: 1,
          features,
          allowedModules,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name,
          phone,
          hashedPassword,
          organizationId: organization.id,
          isActive: true,
          emailVerified: false,
          profileComplete: true,
          authProvider: 'LOCAL',
        },
        include: {
          organization: true,
        },
      });

      const organizationOwnerRole = await tx.role.findFirst({
        where: {
          name: 'Organization Owner',
          isSystemRole: true,
          scope: 'ORGANIZATION',
        },
      });

      if (!organizationOwnerRole) {
        throw new BadRequestException('Organization Owner role not found. Please contact support.');
      }

      const adminRole = await tx.role.upsert({
        where: {
          name_organizationId: {
            name: 'Organization Owner',
            organizationId: organization.id,
          },
        },
        create: {
          name: 'Organization Owner',
          description: 'Full control over organization and all resources',
          organizationId: organization.id,
          level: 90,
          isActive: true,
          isSystemRole: false,
          scope: 'ORGANIZATION',
        },
        update: {}, // No update needed - role already exists with correct values
      });

      const systemRolePermissions = await tx.rolePermission.findMany({
        where: { roleId: organizationOwnerRole.id },
        include: { permission: true },
      });

      await Promise.all(
        systemRolePermissions.map(rolePermission =>
          tx.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: adminRole.id,
                permissionId: rolePermission.permissionId,
              },
            },
            create: {
              roleId: adminRole.id,
              permissionId: rolePermission.permissionId,
              granted: rolePermission.granted,
              conditions: rolePermission.conditions,
            },
            update: {
              granted: rolePermission.granted,
              conditions: rolePermission.conditions,
            },
          })
        )
      );

      await tx.userRole.upsert({
        where: {
          userId_roleId_farmId: {
            userId: user.id,
            roleId: adminRole.id,
            farmId: null,
          },
        },
        create: {
          userId: user.id,
          roleId: adminRole.id,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });

      return user;
    });

    const tokens = await this.generateTokens(
      result.id,
      result.email,
      result.organizationId,
    );

    await this.updateRefreshToken(result.id, tokens.refreshToken);

    const userWithRoles = await this.getUserWithRoles(result.id);
    if (!userWithRoles) {
      throw new BadRequestException('Failed to retrieve user after registration');
    }
    const userResponse = this.formatUserResponse(userWithRoles);

    // Send email verification using EmailVerificationService
    await this.emailVerificationService.sendEmailVerification(
      result.id,
      result.email,
      result.name
    );

    // Send welcome email
    await this.emailVerificationService.sendWelcomeEmail(
      result.email,
      result.name,
      '', // lastName not available in this context
      organizationName
    );

    // Send new user notification to organization admins
    await this.sendNewUserNotification(result.id, result.organizationId);

    return {
      tokens,
      user: userResponse,
      message: 'Registration successful. Please verify your email.',
    };
  }

  async login(
    loginDto: LoginDto,
    sessionInfo?: {
      deviceInfo?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<LoginResponse> {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.organizationId,
    );

    // Store session metadata
    const sessionMetadata = sessionInfo ? {
      session: {
        deviceInfo: sessionInfo.deviceInfo,
        ipAddress: sessionInfo.ipAddress,
        userAgent: sessionInfo.userAgent,
        loginAt: new Date().toISOString(),
      },
    } : undefined;

    // Prepare metadata update
    const currentMetadata = (user.metadata as UserMetadata) || {};
    const updatedMetadata: UserMetadata = {
      ...currentMetadata,
      ...(sessionMetadata || {}),
      loggedOutAt: null, // Clear logout timestamp on new login
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        refreshTokenHash: await this.hashRefreshToken(tokens.refreshToken),
        refreshTokenExpiresAt: new Date(
          Date.now() + this.REFRESH_TOKEN_EXPIRES_IN_MS,
        ),
        metadata: updatedMetadata,
      },
    });

    const userResponse = this.formatUserResponse(user);

    return {
      tokens,
      user: userResponse,
    };
  }

  async refresh(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; tokenType: 'Bearer' }> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          organizationId: true,
          refreshTokenHash: true,
          refreshTokenExpiresAt: true,
          isActive: true,
        },
      });

      if (!user || !user.refreshTokenHash || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isValidRefreshToken = await verify(
        user.refreshTokenHash,
        refreshToken,
      );
      if (!isValidRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (
        user.refreshTokenExpiresAt &&
        user.refreshTokenExpiresAt < new Date()
      ) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const accessToken = this.jwtService.sign({
        email: user.email,
        sub: user.id,
        organizationId: user.organizationId,
      });

      // Generate new refresh token
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.REFRESH_TOKEN_EXPIRES_IN_MS / 1000,
        },
      );

      // Update user with new refresh token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokenHash: await this.hashRefreshToken(newRefreshToken),
          refreshTokenExpiresAt: new Date(
            Date.now() + this.REFRESH_TOKEN_EXPIRES_IN_MS,
          ),
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.JWT_EXPIRES_IN,
        tokenType: 'Bearer' as const,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<SuccessMessageResponse> {
    await this.clearRefreshToken(userId);
    return {
      message: 'Logged out successfully',
      success: true,
    };
  }

  async logoutAll(userId: string): Promise<SuccessMessageResponse> {
    await this.clearRefreshToken(userId);
    return {
      message: 'Logged out from all devices successfully',
      success: true,
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<SuccessMessageResponse> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!user) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
        success: true,
      };
    }

    const resetToken = this.generateSecureToken();
    const resetTokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + this.PASSWORD_RESET_EXPIRES_IN_MS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          resetTokenHash,
          resetTokenExpiresAt: expiresAt.toISOString(),
        },
      },
    });

    await this.emailVerificationService.sendPasswordResetEmail(
      email,
      resetToken,
      user.name
    );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
      success: true,
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<SuccessMessageResponse> {
    const { token, newPassword } = resetPasswordDto;

    const tokenHash = this.hashToken(token);
    const user = await this.findUserByToken(tokenHash, 'resetTokenHash');

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        metadata: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });

    return {
      message: 'Password reset successfully',
      success: true,
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<SuccessMessageResponse> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, hashedPassword: true },
    });

    if (!user?.hashedPassword) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await verify(
      user.hashedPassword,
      currentPassword,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });

    return {
      message: 'Password changed successfully',
      success: true,
    };
  }

  async sendVerification(userId: string): Promise<SuccessMessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }
    await this.emailVerificationService.sendEmailVerification(
      userId,
      user.email,
      user.name
    );

    return {
      message: 'Verification email sent',
      success: true,
    };
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<SuccessMessageResponse> {
    const { token } = verifyEmailDto;

    const result = await this.emailVerificationService.verifyEmailWithToken(token);

    return {
      message: result.message,
      success: true,
    };
  }

  async getCurrentUser(userId: string): Promise<AuthUserResponse> {
    const user = await this.getUserWithRoles(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUserResponse(user);
  }

  async validateToken(
    validateTokenDto: ValidateTokenDto,
  ): Promise<AuthUserResponse> {
    const { token } = validateTokenDto;

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.getUserWithRoles(payload.sub);

      if (!user?.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      return this.formatUserResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async validateUser(email: string, password: string): Promise<UserWithOrganizationAndRoles | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true,
          },
          where: {
            isActive: true,
          },
        },
      },
    });

    if (user?.hashedPassword) {
      const isPasswordValid = await verify(user.hashedPassword, password);
      if (isPasswordValid) {
        return this.omitSensitiveFields(user) as UserWithOrganizationAndRoles;
      }
    }
    return null;
  }

  private async getUserWithRoles(userId: string): Promise<UserWithOrganizationAndRoles | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true,
          },
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      ...user,
      metadata: user.metadata as UserMetadata | null,
    };
  }

  private async findUserByToken(tokenHash: string, tokenType: string) {
    const users = await this.prisma.user.findMany({
      where: {
        metadata: {
          path: [tokenType],
          equals: tokenHash,
        },
      },
      select: { id: true, emailVerified: true, metadata: true },
    });

    return users.find((user) => {
      const metadata = user.metadata as UserMetadata;
      const expiresAt = metadata?.[tokenType.replace('Hash', 'ExpiresAt')];
      return expiresAt && new Date(expiresAt) > new Date();
    });
  }

  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string,
  ): Promise<TokensResponse> {
    const payload = {
      email,
      sub: userId,
      organizationId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.JWT_EXPIRES_IN,
      tokenType: 'Bearer',
    };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = new Date(
      Date.now() + this.REFRESH_TOKEN_EXPIRES_IN_MS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });
  }

  private async clearRefreshToken(userId: string): Promise<void> {
    // Get current user to preserve existing metadata
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        metadata: {
          ...((user?.metadata as UserMetadata) || {}),
          loggedOutAt: new Date().toISOString(),
        } as UserMetadata,
      },
    });
  }

  private async hashPassword(password: string): Promise<string> {
    return hash(password);
  }

  private async hashRefreshToken(refreshToken: string): Promise<string> {
    return hash(refreshToken);
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async getSessions(userId: string): Promise<{
    data: Array<{
      id: string;
      type: 'sessions';
      attributes: {
        id: string;
        deviceInfo: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        lastActivity: string;
        createdAt: string;
        isActive: boolean;
      };
    }>;
    meta?: {
      totalCount: number;
    };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        refreshTokenHash: true,
        refreshTokenExpiresAt: true,
        lastLoginAt: true,
        createdAt: true,
        metadata: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const sessions = [];

    // If user has an active refresh token, create a session entry
    if (user.refreshTokenHash && user.refreshTokenExpiresAt && user.refreshTokenExpiresAt > new Date()) {
      const sessionMetadata = (user.metadata as UserMetadata)?.session || {};
      
      sessions.push({
        id: 'current-session',
        type: 'sessions' as const,
        attributes: {
          id: 'current-session',
          deviceInfo: sessionMetadata.deviceInfo || 'Unknown Device',
          ipAddress: sessionMetadata.ipAddress || null,
          userAgent: sessionMetadata.userAgent || null,
          lastActivity: (user.lastLoginAt || user.createdAt).toISOString(),
          createdAt: (user.lastLoginAt || user.createdAt).toISOString(),
          isActive: true,
        },
      });
    }

    return {
      data: sessions,
      meta: {
        totalCount: sessions.length,
      },
    };
  }

  async revokeSession(
    userId: string,
    sessionId: string,
  ): Promise<SuccessMessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, refreshTokenHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // For current session management, we only support revoking the current session
    if (sessionId === 'current-session') {
      if (!user.refreshTokenHash) {
        throw new BadRequestException('No active session found');
      }

      await this.clearRefreshToken(userId);
      
      return {
        message: 'Session revoked successfully',
        success: true,
      };
    }

    throw new BadRequestException('Invalid session ID');
  }

  private omitSensitiveFields<
    T extends { hashedPassword?: string; refreshTokenHash?: string },
  >(user: T): Omit<T, 'hashedPassword' | 'refreshTokenHash'> {
    const result = { ...user };
    delete result.hashedPassword;
    delete result.refreshTokenHash;
    return result;
  }

  private formatUserResponse(user: UserWithOrganizationAndRoles): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      profileComplete: user.profileComplete,
      authProvider: user.authProvider,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      organizationId: user.organizationId,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        type: user.organization.type,
        isVerified: user.organization.isVerified,
        plan: user.organization.plan,
      } : null,
      roles: user.userRoles?.map((userRole) => ({
        id: userRole.role.id,
        name: userRole.role.name,
        level: userRole.role.level,
      })) ?? [],
      metadata: user.metadata,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async completeProfile(
    userId: string,
    completeProfileDto: CompleteProfileDto,
  ): Promise<LoginResponse> {
    const { organizationName, organizationType, phone } = completeProfileDto;

    // Get current user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profileComplete: true,
        organizationId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate: Check if profile already complete
    if (user.profileComplete) {
      throw new ConflictException('Profile already complete');
    }

    // Validate: Check if user already has organization
    if (user.organizationId) {
      throw new ConflictException('User already has an organization');
    }

    // Validate: Check if organization name already exists
    const existingOrg = await this.prisma.organization.findFirst({
      where: { name: organizationName },
    });

    if (existingOrg) {
      throw new ConflictException('Organization name already exists');
    }

    // Create organization and update user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Initialize organization features based on type and plan
      const { allowedModules, features } = this.planFeatureMapper.getOrganizationFeatures(
        organizationType,
        SubscriptionTier.FREE
      );

      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          type: organizationType,
          email: user.email,
          isActive: true,
          plan: SubscriptionTier.FREE,
          maxUsers: 1,
          maxFarms: 1,
          features,
          allowedModules,
        },
      });

      // Create admin role for the organization
      const adminRole = await tx.role.create({
        data: {
          name: 'admin',
          description: 'Organization administrator',
          organizationId: organization.id,
          level: 100,
          isActive: true,
          isSystemRole: false,
        },
      });

      // Assign admin role to user
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
          isActive: true,
        },
      });

      // Update user with organization and profile completion status
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          organizationId: organization.id,
          phone: phone || null,
          profileComplete: true,
          updatedAt: new Date(),
        },
        include: {
          organization: true,
          userRoles: {
            include: {
              role: true,
            },
            where: {
              isActive: true,
            },
          },
        },
      });

      return updatedUser;
    });

    // Generate new tokens with updated user information
    const tokens = await this.generateTokens(
      result.id,
      result.email,
      result.organizationId!,
    );

    await this.updateRefreshToken(result.id, tokens.refreshToken);

    // Format user response
    const userResponse = this.formatUserResponse(result as UserWithOrganizationAndRoles);

    // Send welcome email
    await this.emailVerificationService.sendWelcomeEmail(
      result.email,
      result.name,
      '', // lastName not available
      organizationName
    );

    return {
      tokens,
      user: userResponse,
    };
  }

  /**
   * Send new user notification to organization admins
   */
  private async sendNewUserNotification(userId: string, organizationId: string): Promise<void> {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      if (!user) return;

      // Get organization details
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          name: true,
        },
      });

      if (!organization) return;

      // Get admin users separately
      const adminUsers = await this.prisma.user.findMany({
        where: {
          organizationId,
          userRoles: {
            some: {
              role: {
                name: { in: ['admin', 'Organization Owner'] },
                isActive: true,
              },
              isActive: true,
            },
          },
        },
        select: {
          email: true,
          name: true,
        },
      });

      // Get user statistics
      const totalUsers = await this.prisma.user.count({
        where: { organizationId },
      });

      const activeUsers = await this.prisma.user.count({
        where: {
          organizationId,
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      const newRegistrations = await this.prisma.user.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      const companyUsers = await this.prisma.user.count({
        where: { organizationId },
      });

      // Send notification to all admin users
      for (const admin of adminUsers) {
        await this.brevoService.sendNewUserNotification(admin.email, {
          firstName: user.name.split(' ')[0],
          lastName: user.name.split(' ').slice(1).join(' ') || '',
          companyName: organization.name,
          userEmail: user.email,
          userRole: 'Team Member', // Default role for new users
          totalUsers,
          activeUsers,
          newRegistrations,
          companyUsers,
          registrationDate: user.createdAt.toLocaleDateString(),
        });
      }

      this.logger.log(`New user notification sent for user ${userId} to ${adminUsers.length} admins`);
    } catch (error) {
      this.logger.error(
        'Failed to send new user notification',
        (error as Error).stack,
        `AuthService.sendNewUserNotification - userId: ${userId}, organizationId: ${organizationId}`
      );
      // Don't throw - allow registration to continue
    }
  }
}
