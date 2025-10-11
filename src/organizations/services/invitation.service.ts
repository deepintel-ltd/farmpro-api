import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BrevoService } from '@/external-service/brevo/brevo.service';
import { randomBytes, createHash } from 'crypto';
import { InvitationStatus } from '@prisma/client';

export interface InvitationData {
  email: string;
  organizationId: string;
  roleName?: string;
  message?: string;
  inviterName: string;
  inviterEmail: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  organizationId: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  inviterName: string;
  inviterEmail: string;
  roleName?: string;
  message?: string;
}

export interface InvitationDetails {
  id: string;
  email: string;
  organizationId: string;
  organizationName: string;
  organizationPlan: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  inviterName: string;
  inviterEmail: string;
  roleName?: string;
  message?: string;
}

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);
  private readonly INVITATION_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService,
  ) {}

  /**
   * Send invitation to join organization
   */
  async sendInvitation(invitationData: InvitationData): Promise<InvitationResponse> {
    const { email, organizationId, roleName, message, inviterName, inviterEmail } = invitationData;

    this.logger.log(`Sending invitation to ${email} for organization ${organizationId} by ${inviterEmail}`);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if organization exists and is active
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { 
        id: true, 
        name: true, 
        maxUsers: true, 
        isActive: true,
        subscription: {
          select: {
            plan: {
              select: {
                tier: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!organization.isActive) {
      throw new BadRequestException('Organization is not active');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, organizationId: true, isActive: true },
    });

    if (existingUser) {
      if (existingUser.organizationId === organizationId) {
        throw new ConflictException('User is already a member of this organization');
      }
      if (existingUser.isActive) {
        throw new ConflictException('User already exists with a different organization');
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email,
        organizationId,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    // Check organization user limit
    const currentUserCount = await this.prisma.user.count({
      where: { 
        organizationId,
        isActive: true,
      },
    });

    if (currentUserCount >= organization.maxUsers) {
      throw new BadRequestException('Organization has reached maximum user limit');
    }

    // Generate invitation token and hash
    const invitationToken = this.generateInvitationToken();
    const tokenHash = this.hashToken(invitationToken);
    const expiresAt = new Date(Date.now() + this.INVITATION_EXPIRES_IN_MS);

    // Create invitation record in database
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        organizationId,
        token: invitationToken,
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt,
        inviterEmail,
        inviterName,
        roleName: roleName || 'Team Member',
        message,
      },
    });

    // Generate invitation URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${invitationToken}`;

    // Send invitation email
    try {
      await this.brevoService.sendInvitationEmail(
        email,
        invitationUrl,
        {
          firstName: email.split('@')[0],
          companyName: organization.name,
          roleName: roleName || 'Team Member',
          inviterName,
          message,
        }
      );

      this.logger.log(`Invitation email sent successfully to ${email} for organization ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${email}:`, error);
      
      // Update invitation status to indicate email failure
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          metadata: {
            ...invitation.metadata as any,
            emailSent: false,
            emailError: error.message,
          },
        },
      });
      
      // Don't throw error - invitation was created successfully
    }

    return {
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviterName: invitation.inviterName,
      inviterEmail: invitation.inviterEmail,
      roleName: invitation.roleName,
      message: invitation.message,
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

    // Validate input
    if (!token || token.length < 10) {
      throw new BadRequestException('Invalid invitation token');
    }

    if (!userData.name || !userData.password) {
      throw new BadRequestException('Name and password are required');
    }

    // Find invitation by token
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            maxUsers: true,
            isActive: true,
            subscription: {
              select: {
                plan: {
                  select: {
                    tier: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid token');
    }

    // Validate invitation status
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is ${invitation.status.toLowerCase()}`);
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Check if organization is still active
    if (!invitation.organization.isActive) {
      throw new BadRequestException('Organization is no longer active');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, organizationId: true, isActive: true },
    });

    if (existingUser && existingUser.isActive) {
      throw new ConflictException('User already exists and is active');
    }

    // Check organization user limit
    const currentUserCount = await this.prisma.user.count({
      where: { 
        organizationId: invitation.organizationId,
        isActive: true,
      },
    });

    if (currentUserCount >= invitation.organization.maxUsers) {
      throw new BadRequestException('Organization has reached maximum user limit');
    }

    // Hash password
    const { hash } = await import('@node-rs/argon2');
    const hashedPassword = await hash(userData.password);

    // Create user and update invitation in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create or update user
      const user = await tx.user.upsert({
        where: { email: invitation.email },
        update: {
          name: userData.name,
          phone: userData.phone,
          hashedPassword,
          organizationId: invitation.organizationId,
          isActive: true,
          emailVerified: true,
          profileComplete: true,
          authProvider: 'LOCAL',
        },
        create: {
          email: invitation.email,
          name: userData.name,
          phone: userData.phone,
          hashedPassword,
          organizationId: invitation.organizationId,
          isActive: true,
          emailVerified: true,
          profileComplete: true,
          authProvider: 'LOCAL',
        },
        include: {
          organization: true,
        },
      });

      // Update invitation status
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { 
          status: InvitationStatus.ACCEPTED,
          metadata: {
            ...invitation.metadata as any,
            acceptedAt: new Date().toISOString(),
            acceptedBy: user.id,
          },
        },
      });

      return user;
    });

    // Plan role assignment removed - using plan-based permissions now
    this.logger.log(`User ${result.id} added to organization ${invitation.organizationId} with plan-based permissions`);

    this.logger.log(`User ${result.email} successfully joined organization ${invitation.organization.name}`);

    return {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        organizationId: result.organizationId,
        organization: result.organization,
      },
      tokens: null, // Will be handled by auth service
    };
  }

  /**
   * Get pending invitations for organization
   */
  async getPendingInvitations(organizationId: string): Promise<InvitationResponse[]> {
    this.logger.log(`Getting pending invitations for organization ${organizationId}`);

    const invitations = await this.prisma.invitation.findMany({
      where: {
        organizationId,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviterName: invitation.inviterName,
      inviterEmail: invitation.inviterEmail,
      roleName: invitation.roleName,
      message: invitation.message,
    }));
  }

  /**
   * Get invitation details by ID
   */
  async getInvitationById(invitationId: string, organizationId: string): Promise<InvitationDetails> {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
      include: {
        organization: {
          select: {
            name: true,
            subscription: {
              select: {
                plan: {
                  select: {
                    tier: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
      organizationPlan: invitation.organization.subscription?.plan?.tier || 'FREE',
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviterName: invitation.inviterName,
      inviterEmail: invitation.inviterEmail,
      roleName: invitation.roleName,
      message: invitation.message,
    };
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string, organizationId: string): Promise<void> {
    this.logger.log(`Cancelling invitation ${invitationId} for organization ${organizationId}`);

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { 
        status: InvitationStatus.CANCELLED,
        metadata: {
          ...invitation.metadata as any,
          cancelledAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Successfully cancelled invitation ${invitationId}`);
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(invitationId: string, organizationId: string): Promise<void> {
    this.logger.log(`Resending invitation ${invitationId} for organization ${organizationId}`);

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or expired');
    }

    // Generate new invitation URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${invitation.token}`;

    try {
      await this.brevoService.sendInvitationEmail(
        invitation.email,
        invitationUrl,
        {
          firstName: invitation.email.split('@')[0],
          companyName: invitation.organization.name,
          roleName: invitation.roleName || 'Team Member',
          inviterName: invitation.inviterName,
          message: invitation.message,
        }
      );

      // Update metadata to track resend
      await this.prisma.invitation.update({
        where: { id: invitationId },
        data: {
          metadata: {
            ...invitation.metadata as any,
            lastResentAt: new Date().toISOString(),
            resendCount: ((invitation.metadata as any)?.resendCount || 0) + 1,
          },
        },
      });

      this.logger.log(`Successfully resent invitation email to ${invitation.email}`);
    } catch (error) {
      this.logger.error(`Failed to resend invitation email: ${error.message}`);
      throw new BadRequestException('Failed to resend invitation email');
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    this.logger.log('Cleaning up expired invitations');

    const result = await this.prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });

    this.logger.log(`Marked ${result.count} invitations as expired`);
    return result.count;
  }

  /**
   * Get invitation statistics for organization
   */
  async getInvitationStats(organizationId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    cancelled: number;
  }> {
    const stats = await this.prisma.invitation.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });

    const result = {
      total: 0,
      pending: 0,
      accepted: 0,
      expired: 0,
      cancelled: 0,
    };

    stats.forEach(stat => {
      result.total += stat._count;
      result[stat.status.toLowerCase() as keyof typeof result] = stat._count;
    });

    return result;
  }

  /**
   * Generate invitation token
   */
  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash invitation token
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
