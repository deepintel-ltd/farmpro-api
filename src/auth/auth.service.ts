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
  SessionResponse,
  TokenValidationResponse,
  SuccessMessageResponse,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // =============================================================================
  // Auth Flow & JWT Management
  // =============================================================================

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const { email, password, name, phone, organizationName, organizationType, inviteCode } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create organization and user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          type: organizationType,
          email: email,
          isActive: true,
          plan: 'basic',
          maxUsers: 5,
          maxFarms: 1,
          features: ['basic_features'],
        },
      });

      // Create user
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
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      // Assign default admin role for organization owner
      const adminRole = await tx.role.findFirst({
        where: {
          name: 'admin',
          organizationId: organization.id,
        },
      });

      if (!adminRole) {
        // Create admin role for the organization
        const newAdminRole = await tx.role.create({
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
            roleId: newAdminRole.id,
            isActive: true,
          },
        });
      }

      return { user, organization };
    });

    // Generate tokens
    const tokens = await this.generateTokens(result.user.id, result.user.email, result.user.organizationId);

    // Update refresh token in database
    await this.updateRefreshToken(result.user.id, tokens.refreshToken);

    const userResponse = this.formatUserResponse(result.user);

    return {
      tokens,
      user: userResponse,
      message: 'Registration successful. Please verify your email.',
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.organizationId);

    // Update refresh token and last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        refreshTokenHash: await this.hashRefreshToken(tokens.refreshToken),
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const userResponse = this.formatUserResponse(user);

    return {
      tokens,
      user: userResponse,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string; expiresIn: number }> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshTokenHash || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify refresh token hash
      const isValidRefreshToken = await verify(user.refreshTokenHash, refreshToken);
      if (!isValidRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token is expired
      if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Generate new access token
      const accessTokenPayload = {
        email: user.email,
        sub: user.id,
        organizationId: user.organizationId,
      };

      const accessToken = this.jwtService.sign(accessTokenPayload);
      const expiresIn = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS', 3600);

      return {
        accessToken,
        expiresIn,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<SuccessMessageResponse> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });

    return {
      message: 'Logged out successfully',
      success: true,
    };
  }

  async logoutAll(userId: string): Promise<SuccessMessageResponse> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });

    return {
      message: 'Logged out from all devices successfully',
      success: true,
    };
  }

  // =============================================================================
  // Password Management
  // =============================================================================

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<SuccessMessageResponse> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
        success: true,
      };
    }

    // Generate reset token
    const resetToken = this.generateSecureToken();
    const resetTokenHash = this.hashToken(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token (in a real app, you'd have a separate table for this)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          ...((user.metadata as any) || {}),
          resetTokenHash,
          resetTokenExpiresAt: resetTokenExpiresAt.toISOString(),
        },
      },
    });

    // TODO: Send email with reset token
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      success: true,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<SuccessMessageResponse> {
    const { token, newPassword } = resetPasswordDto;

    const tokenHash = this.hashToken(token);

    // Find user with matching reset token
    const users = await this.prisma.user.findMany({
      where: {
        metadata: {
          path: ['resetTokenHash'],
          equals: tokenHash,
        },
      },
    });

    const user = users.find(u => {
      const metadata = u.metadata as any;
      return metadata?.resetTokenExpiresAt && new Date(metadata.resetTokenExpiresAt) > new Date();
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        metadata: {
          ...((user.metadata as any) || {}),
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
        refreshTokenHash: null, // Invalidate all sessions
        refreshTokenExpiresAt: null,
      },
    });

    return {
      message: 'Password reset successfully',
      success: true,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<SuccessMessageResponse> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedPassword) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await verify(user.hashedPassword, currentPassword);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword,
        refreshTokenHash: null, // Invalidate all sessions
        refreshTokenExpiresAt: null,
      },
    });

    return {
      message: 'Password changed successfully',
      success: true,
    };
  }

  // =============================================================================
  // Email & Account Verification
  // =============================================================================

  async sendVerification(userId: string): Promise<SuccessMessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }

    // Generate verification token
    const verificationToken = this.generateSecureToken();
    const verificationTokenHash = this.hashToken(verificationToken);
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...((user.metadata as any) || {}),
          verificationTokenHash,
          verificationTokenExpiresAt: verificationTokenExpiresAt.toISOString(),
        },
      },
    });

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, verificationToken);

    return {
      message: 'Verification email sent',
      success: true,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<SuccessMessageResponse> {
    const { token } = verifyEmailDto;

    const tokenHash = this.hashToken(token);

    // Find user with matching verification token
    const users = await this.prisma.user.findMany({
      where: {
        metadata: {
          path: ['verificationTokenHash'],
          equals: tokenHash,
        },
      },
    });

    const user = users.find(u => {
      const metadata = u.metadata as any;
      return metadata?.verificationTokenExpiresAt && new Date(metadata.verificationTokenExpiresAt) > new Date();
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }

    // Mark email as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        metadata: {
          ...((user.metadata as any) || {}),
          verificationTokenHash: null,
          verificationTokenExpiresAt: null,
        },
      },
    });

    return {
      message: 'Email verified successfully',
      success: true,
    };
  }

  // =============================================================================
  // Session Management
  // =============================================================================

  async getCurrentUser(userId: string): Promise<AuthUserResponse> {
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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUserResponse(user);
  }

  async validateToken(validateTokenDto: ValidateTokenDto): Promise<TokenValidationResponse> {
    const { token } = validateTokenDto;

    try {
      const payload = this.jwtService.verify(token);
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
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

      if (!user || !user.isActive) {
        return { valid: false };
      }

      return {
        valid: true,
        user: this.formatUserResponse(user),
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async getSessions(userId: string): Promise<{ sessions: SessionResponse[] }> {
    // In a real implementation, you'd store session information in the database
    // For now, we'll return a mock response
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mock session data - in production, you'd have a sessions table
    const sessions: SessionResponse[] = [
      {
        id: 'current-session',
        deviceInfo: 'Web Browser',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0...',
        lastActivity: new Date(),
        createdAt: user.lastLoginAt || user.createdAt,
        isCurrent: true,
      },
    ];

    return { sessions };
  }

  async revokeSession(userId: string, sessionId: string): Promise<SuccessMessageResponse> {
    // In a real implementation, you'd remove the specific session
    // For now, we'll just invalidate all sessions if it's the current session
    if (sessionId === 'current-session') {
      await this.logout(userId);
    }

    return {
      message: 'Session revoked successfully',
      success: true,
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  async validateUser(email: string, password: string): Promise<any> {
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

    if (user && user.hashedPassword) {
      const isPasswordValid = await verify(user.hashedPassword, password);
      if (isPasswordValid) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hashedPassword, refreshTokenHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  private async generateTokens(userId: string, email: string, organizationId: string): Promise<TokensResponse> {
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

    const expiresIn = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS', 3600);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
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

  private formatUserResponse(user: any): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      organizationId: user.organizationId,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        type: user.organization.type,
        isVerified: user.organization.isVerified,
        plan: user.organization.plan,
      },
      roles: user.userRoles?.map((userRole: any) => ({
        id: userRole.role.id,
        name: userRole.role.name,
        level: userRole.role.level,
      })),
      metadata: user.metadata,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
