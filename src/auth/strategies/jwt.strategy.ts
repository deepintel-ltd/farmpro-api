import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { UserMetadata, hasLogoutMetadata } from '../types/user-metadata.types';

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

  async validate(payload: any) {
    // Verify user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        organizationId: true,
        refreshTokenExpiresAt: true,
        metadata: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Check if user has been logged out after this token was issued
    // We use the fact that logout clears refreshTokenExpiresAt and refreshTokenHash
    // If both are null and the token was issued after a recent time, it means logout occurred
    const metadata = user.metadata as UserMetadata;
    if (!user.refreshTokenExpiresAt && hasLogoutMetadata(metadata)) {
      const loggedOutAt = new Date(metadata.loggedOutAt).getTime() / 1000;
      const tokenIssuedAt = payload.iat;
      
      if (tokenIssuedAt < loggedOutAt) {
        throw new UnauthorizedException('Token invalidated by logout');
      }
    }

    return { 
      userId: user.id, 
      email: user.email,
      organizationId: user.organizationId,
    };
  }
}
