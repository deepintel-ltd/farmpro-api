import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { hash, verify } from '@node-rs/argon2';
import { randomBytes, createHash } from 'crypto';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ValidateTokenDto,
  LoginResponse,
  RegisterResponse,
  TokensResponse,
  AuthUserResponse,
  SuccessMessageResponse,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly JWT_EXPIRES_IN: number;
  private readonly REFRESH_TOKEN_EXPIRES_IN_MS: number;
  private readonly PASSWORD_RESET_EXPIRES_IN_MS: number;
  private readonly EMAIL_VERIFICATION_EXPIRES_IN_MS: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.JWT_EXPIRES_IN = this.configService.get<number>(
      'JWT_EXPIRES_IN_SECONDS',
      3600,
    );
    this.REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.PASSWORD_RESET_EXPIRES_IN_MS = 60 * 60 * 1000; // 1 hour
    this.EMAIL_VERIFICATION_EXPIRES_IN_MS = 24 * 60 * 60 * 1000; // 24 hours
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
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          type: organizationType,
          email,
          isActive: true,
          plan: 'basic',
          maxUsers: 5,
          maxFarms: 1,
          features: ['basic_features'],
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
        },
        include: {
          organization: true,
        },
      });

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

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
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
    const userResponse = this.formatUserResponse(userWithRoles!);

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

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        refreshTokenHash: await this.hashRefreshToken(tokens.refreshToken),
        refreshTokenExpiresAt: new Date(
          Date.now() + this.REFRESH_TOKEN_EXPIRES_IN_MS,
        ),
        ...(sessionMetadata && { 
          metadata: {
            ...((user.metadata as any) || {}),
            ...sessionMetadata,
          },
        }),
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
  ): Promise<{ accessToken: string; expiresIn: number }> {
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

      return {
        accessToken,
        expiresIn: this.JWT_EXPIRES_IN,
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
      select: { id: true },
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
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }

    const verificationToken = this.generateSecureToken();
    const verificationTokenHash = this.hashToken(verificationToken);
    const expiresAt = new Date(
      Date.now() + this.EMAIL_VERIFICATION_EXPIRES_IN_MS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          verificationTokenHash,
          verificationTokenExpiresAt: expiresAt.toISOString(),
        },
      },
    });

    return {
      message: 'Verification email sent',
      success: true,
    };
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<SuccessMessageResponse> {
    const { token } = verifyEmailDto;

    const tokenHash = this.hashToken(token);
    const user = await this.findUserByToken(tokenHash, 'verificationTokenHash');

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        metadata: null,
      },
    });

    return {
      message: 'Email verified successfully',
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

  async validateUser(email: string, password: string) {
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
        return this.omitSensitiveFields(user);
      }
    }
    return null;
  }

  private async getUserWithRoles(userId: string) {
    return this.prisma.user.findUnique({
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
      const metadata = user.metadata as any;
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
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
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
      const sessionMetadata = (user.metadata as any)?.session || {};
      
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

  private formatUserResponse(user: any): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      organizationId: user.organizationId,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        type: user.organization.type,
        isVerified: user.organization.isVerified,
        plan: user.organization.plan,
      },
      roles:
        user.userRoles?.map((userRole: any) => ({
          id: userRole.role.id,
          name: userRole.role.name,
          level: userRole.role.level,
        })) ?? [],
      metadata: user.metadata,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
