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
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        organizationId: true,
        refreshTokenExpiresAt: true,
        metadata: true,
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            plan: true,
            features: true,
            allowedModules: true,
            isVerified: true,
            isActive: true,
            suspendedAt: true,
          },
        },
        userRoles: {
          where: { isActive: true },
          select: {
            id: true,
            farmId: true,
            role: {
              select: {
                id: true,
                name: true,
                level: true,
                scope: true,
                isPlatformAdmin: true,
                permissions: {
                  where: { granted: true },
                  select: {
                    permission: {
                      select: {
                        resource: true,
                        action: true,
                      },
                    },
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

    // Check if organization is suspended
    if (user.organization.suspendedAt) {
      throw new UnauthorizedException('Organization is suspended');
    }

    if (!user.organization.isActive) {
      throw new UnauthorizedException('Organization is inactive');
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

    // Check if user is platform admin
    const isPlatformAdmin = user.userRoles.some(
      (ur) => ur.role.isPlatformAdmin,
    );

    // Extract roles
    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      level: ur.role.level,
      scope: ur.role.scope,
      farmId: ur.farmId || undefined,
    }));

    // Extract and flatten permissions
    const permissionsSet = new Set<string>();
    user.userRoles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        permissionsSet.add(`${rp.permission.resource}:${rp.permission.action}`);
      });
    });
    const permissions = Array.from(permissionsSet);

    // Get capabilities based on organization type
    const capabilities =
      ORGANIZATION_FEATURES[user.organization.type].capabilities;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      isPlatformAdmin,
      roles,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        type: user.organization.type,
        plan: user.organization.plan,
        features: user.organization.features,
        allowedModules: user.organization.allowedModules,
        isVerified: user.organization.isVerified,
        isSuspended: !!user.organization.suspendedAt,
      },
      permissions,
      capabilities,
    };
  }
}
