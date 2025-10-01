import { randomBytes, createHash } from 'crypto';

import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { BrevoService } from '../external-service/brevo/brevo.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService
  ) {}

  /**
   * Send email verification to a user
   */
  public async sendEmailVerification(
    userId: string,
    email: string,
    firstName: string
  ): Promise<void> {
    try {
      // Generate verification token
      const verificationToken = this.generateEmailVerificationToken();
      const tokenHash = this.hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store verification token (hashed for security)
      await this.prisma.emailVerification.create({
        data: {
          token: verificationToken, // Store plaintext for easy lookup in development
          tokenHash, // Store hash for security
          userId,
          email,
          expiresAt,
          requestedAt: new Date(),
        },
      });

      // Generate verification URL
      const verificationUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      // Send verification email
      await this.brevoService.sendEmailVerification(email, verificationToken, verificationUrl, {
        firstName: firstName ?? 'User',
      });

      this.logger.log(`Email verification sent to ${email} for user ${userId}`);
    } catch (error) {
      this.logger.error(
        'Failed to send email verification',
        (error as Error).stack,
        `EmailVerificationService.sendEmailVerification - userId: ${userId}, email: ${email}`
      );
      // Don't throw - allow registration to continue
    }
  }

  /**
   * Verify user email with token
   */
  public async verifyEmailWithToken(token: string): Promise<{ message: string }> {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        token,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, email: true, emailVerified: true },
        },
      },
    });

    if (!verification) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (verification.user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }

    // Mark email as verified
    await this.verifyUserEmail(verification.userId);

    // Mark verification token as used
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    this.logger.log(`Email verified successfully for user ${verification.userId}`);

    return { message: 'Email successfully verified. You can now log in to your account.' };
  }

  /**
   * Mark user email as verified
   */
  public async verifyUserEmail(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
      },
    });
  }

  /**
   * Send welcome email to new user
   */
  public async sendWelcomeEmail(
    email: string,
    firstName: string,
    lastName: string,
    companyName: string
  ): Promise<void> {
    try {
      await this.brevoService.sendWelcomeEmail(email, {
        firstName: firstName ?? 'User',
        lastName: lastName ?? '',
        companyName,
      });
      
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        'Failed to send welcome email',
        (error as Error).stack,
        `EmailVerificationService.sendWelcomeEmail - email: ${email}, companyName: ${companyName}`
      );
      // Don't throw - allow registration to continue
    }
  }

  /**
   * Resend email verification
   */
  public async resendEmailVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
        isActive: true,
      },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    const message =
      'If an account with this email exists and is not verified, you will receive a verification link';

    if (!user || user.emailVerified) {
      return { message };
    }

    // Check rate limiting
    await this.validateEmailVerificationRateLimit(user.id);

    // Invalidate existing tokens
    await this.prisma.emailVerification.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });

    // Send new verification email
    await this.sendEmailVerification(user.id, user.email, user.name);

    return { message };
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    firstName?: string
  ): Promise<void> {
    try {
      await this.brevoService.sendPasswordResetEmail(email, resetToken, {
        firstName: firstName ?? 'User',
      });
      
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        'Failed to send password reset email',
        (error as Error).stack,
        `EmailVerificationService.sendPasswordResetEmail - email: ${email}`
      );
      // Don't throw - allow the process to continue
    }
  }

  /**
   * Validate email verification rate limiting
   */
  private async validateEmailVerificationRateLimit(userId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentAttempts = await this.prisma.emailVerification.count({
      where: {
        userId,
        requestedAt: { gte: oneHourAgo },
      },
    });

    if (recentAttempts >= 3) {
      throw new UnauthorizedException(
        'Too many verification email requests. Please wait an hour before trying again.'
      );
    }
  }

  /**
   * Generate secure email verification token
   */
  private generateEmailVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash token for security
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
