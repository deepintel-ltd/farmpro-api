import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { UserMetadata, hasLogoutMetadata } from '../types/user-metadata.types';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ORGANIZATION_FEATURES } from '@/common/config/organization-features.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any): Promise<CurrentUser> {
    // Load user with full authorization context
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            features: true,
            allowedModules: true,
            isVerified: true,
            isActive: true,
            suspendedAt: true,
            subscription: {
              select: {
                plan: {
                  select: {
                    tier: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Check if user is platform admin
    const isPlatformAdmin = user.isPlatformAdmin;

    // For platform admins and users with incomplete profiles, organization is optional
    if (!isPlatformAdmin && user.profileComplete === true) {
      // Regular users with complete profiles must have organization
      if (!user.organization) {
        throw new UnauthorizedException('User must belong to an organization');
      }

      // Check if organization is suspended
      if (user.organization.suspendedAt) {
        throw new UnauthorizedException('Organization is suspended');
      }

      if (!user.organization.isActive) {
        throw new UnauthorizedException('Organization is inactive');
      }
    }

    // Check if user has been logged out after this token was issued
    const metadata = user.metadata as UserMetadata;
    if (!user.refreshTokenExpiresAt && hasLogoutMetadata(metadata)) {
      const loggedOutAt = new Date(metadata.loggedOutAt).getTime() / 1000;
      const tokenIssuedAt = payload.iat;

      if (tokenIssuedAt < loggedOutAt) {
        throw new UnauthorizedException('Token invalidated by logout');
      }
    }

    // In simplified RBAC, permissions are determined by plan tier
    // No need to extract roles or permissions from database
    const roles: any[] = [];
    const permissions: string[] = [];

    // Get capabilities based on organization type (if organization exists)
    const capabilities = user.organization 
      ? ORGANIZATION_FEATURES[user.organization.type].capabilities
      : []; // Platform admins get empty capabilities by default

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      isPlatformAdmin,
      roles,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        type: user.organization.type,
        plan: user.organization.subscription?.plan?.tier || 'FREE',
        features: user.organization.features,
        allowedModules: user.organization.allowedModules,
        isVerified: user.organization.isVerified,
        isSuspended: !!user.organization.suspendedAt,
      } : null,
      permissions,
      capabilities,
    };
  }
}
