import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from '@/auth/auth.service';
import { AuthController } from '@/auth/auth.controller';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { LocalStrategy } from '@/auth/strategies/local.strategy';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { EmailVerificationService } from '@/auth/email-verification.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { BrevoModule } from '@/external-service/brevo/brevo.module';
import { BillingModule } from '@/billing/billing.module';
import { OrganizationsModule } from '@/organizations/organizations.module';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    BrevoModule,
    BillingModule,
    OrganizationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailVerificationService,
    LocalStrategy,
    JwtStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, EmailVerificationService, JwtAuthGuard],
})
export class AuthModule {}
