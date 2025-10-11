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
import { InvitationService } from '@/organizations/services/invitation.service';
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

interface UserWithOrganization {
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
  isPlatformAdmin: boolean;
  metadata?: UserMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    type: 'FARM_OPERATION' | 'COMMODITY_TRADER' | 'LOGISTICS_PROVIDER' | 'INTEGRATED_FARM';
    isVerified: boolean;
    features: string[];
    allowedModules: string[];
    subscription?: {
      plan: {
        tier: string;
      };
    };
  } | null;
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
    private readonly invitationService: InvitationService,
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
          maxUsers: 1,
          maxFarms: 1,
          features,
          allowedModules,
        },
      });

      // Create subscription for the organization
      const freePlan = await tx.subscriptionPlan.findFirst({
        where: { tier: 'FREE' }
      });

      if (freePlan) {
        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: freePlan.id,
            status: 'ACTIVE',
            currency: 'USD',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            autoRenew: true,
            metadata: {
              createdBy: 'auth-service',
              createdAt: new Date().toISOString()
            }
          }
        });
      }

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

      // Role assignment removed - using simplified RBAC system
      // Permissions are now determined by subscription plan tier

      return user;
    });

    // Plan-based permissions are now handled by UserContextService
    // No need to assign roles - permissions are determined by plan tier

    const tokens = await this.generateTokens(
      result.id,
      result.email,
      result.organizationId,
    );

    await this.updateRefreshToken(result.id, tokens.refreshToken);

    const userWithRoles = await this.getUserWithOrganization(result.id);
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
    const user = await this.getUserWithOrganization(userId);

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
      const user = await this.getUserWithOrganization(payload.sub);

      if (!user?.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      return this.formatUserResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async validateUser(email: string, password: string): Promise<UserWithOrganization | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
      },
    });

    if (user?.hashedPassword) {
      const isPasswordValid = await verify(user.hashedPassword, password);
      if (isPasswordValid) {
        return this.omitSensitiveFields(user) as UserWithOrganization;
      }
    }
    return null;
  }

  private async getUserWithOrganization(userId: string): Promise<UserWithOrganization | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
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
    // Get user context to include plan tier and platform admin status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    const planTier = user?.organization?.subscription?.plan?.tier || 'FREE';
    const isPlatformAdmin = user?.isPlatformAdmin || false;

    const payload = {
      email,
      sub: userId,
      organizationId,
      planTier,
      isPlatformAdmin,
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

  private formatUserResponse(user: UserWithOrganization): AuthUserResponse {
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
        plan: user.organization.subscription?.plan?.tier || 'FREE',
        features: user.organization.features,
        allowedModules: user.organization.allowedModules,
      } : null,
      isPlatformAdmin: user.isPlatformAdmin,
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
          maxUsers: 1,
          maxFarms: 1,
          features,
          allowedModules,
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
        },
      });

      return updatedUser;
    });

    // Plan-based permissions are now handled by UserContextService
    // No need to assign roles - permissions are determined by plan tier

    // Generate new tokens with updated user information
    const tokens = await this.generateTokens(
      result.id,
      result.email,
      result.organizationId!,
    );

    await this.updateRefreshToken(result.id, tokens.refreshToken);

    // Format user response
    const userResponse = this.formatUserResponse(result as UserWithOrganization);

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

      // Get admin users separately (platform admins or organization owners)
      const adminUsers = await this.prisma.user.findMany({
        where: {
          organizationId,
          OR: [
            { isPlatformAdmin: true },
            // For now, we'll consider all users in the organization as potential admins
            // In the future, you might want to add an isOrganizationAdmin field
          ],
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

  /**
   * Initiate Google OAuth flow
   */
  async initiateGoogleOAuth(): Promise<{ authUrl: string; state: string }> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI') || 
      `${this.configService.get<string>('API_BASE_URL')}/auth/google/callback`;
    const state = Math.random().toString(36).substring(2, 15);
    
    if (!googleClientId) {
      throw new BadRequestException('Google OAuth not configured');
    }
    
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', googleClientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    // TODO: Store state in database for validation
    this.logger.log(`Generated Google OAuth URL for state: ${state}`);

    return {
      authUrl: googleAuthUrl.toString(),
      state,
    };
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleOAuthCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<{ redirectUrl: string }> {
    const { code, error } = query;

    if (error) {
      this.logger.error(`Google OAuth error: ${error}`);
      return {
        redirectUrl: `${this.configService.get<string>('FRONTEND_URL')}/auth/error?error=${encodeURIComponent(error)}`,
      };
    }

    if (!code) {
      this.logger.error('No authorization code received from Google');
      return {
        redirectUrl: `${this.configService.get<string>('FRONTEND_URL')}/auth/error?error=no_code`,
      };
    }

    // TODO: Validate state parameter
    // const isValidState = await this.validateOAuthState(state);
    // if (!isValidState) {
    //   throw new BadRequestException('Invalid state parameter');
    // }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.configService.get<string>('GOOGLE_CLIENT_ID')!,
        client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET')!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.configService.get<string>('GOOGLE_REDIRECT_URI') || 
          `${this.configService.get<string>('API_BASE_URL')}/auth/google/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      this.logger.error(`Token exchange failed: ${errorData}`);
      throw new BadRequestException('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      this.logger.error(`User info fetch failed: ${errorData}`);
      throw new BadRequestException('Failed to get user info from Google');
    }

    const googleUser = await userResponse.json();

    // Handle OAuth user authentication/registration
    const result = await this.handleOAuthUser({
      email: googleUser.email,
      name: googleUser.name,
      provider: 'GOOGLE',
      providerId: googleUser.id,
      avatar: googleUser.picture,
    });

    // Redirect to frontend with tokens
    const frontendUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/callback?access_token=${result.tokens.accessToken}&refresh_token=${result.tokens.refreshToken}`;
    
    return {
      redirectUrl: frontendUrl,
    };
  }

  /**
   * Handle OAuth user authentication/registration
   */
  async handleOAuthUser(oauthData: {
    email: string;
    name: string;
    provider: 'GOOGLE' | 'GITHUB';
    providerId: string;
    avatar?: string;
  }): Promise<LoginResponse> {
    const { email, name, provider, avatar } = oauthData;

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
      },
    });

    // If user doesn't exist, create them
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatar,
          authProvider: provider,
          isActive: true,
          emailVerified: true, // OAuth users are pre-verified
          profileComplete: false, // They'll need to complete profile
        },
        include: {
          organization: true,
        },
      });
    } else {
      // Update existing user with OAuth info
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          authProvider: provider,
          emailVerified: true,
          avatar: avatar || user.avatar,
        },
        include: {
          organization: true,
        },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.organizationId || '',
    );

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const userResponse = this.formatUserResponse(user as UserWithOrganization);

    return {
      tokens,
      user: userResponse,
    };
  }

  /**
   * Accept invitation and join organization
   */
  async acceptInvitation(token: string, userData: {
    name: string;
    password: string;
    phone?: string;
  }): Promise<{ user: any; tokens: any }> {
    this.logger.log(`Accepting invitation with token: ${token.substring(0, 8)}...`);

    // Use invitation service to handle the invitation acceptance
    const result = await this.invitationService.acceptInvitation(token, userData);

    // Generate tokens for the new user
    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.user.organizationId,
    );

    await this.updateRefreshToken(result.user.id, tokens.refreshToken);

    this.logger.log(`User ${result.user.email} successfully joined organization via invitation`);

    return {
      user: result.user,
      tokens,
    };
  }
}
