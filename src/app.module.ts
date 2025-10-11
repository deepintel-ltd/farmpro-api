import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { FarmsModule } from '@/farms/farms.module';
import { InventoryModule } from '@/inventory/inventory.module';
import { OrganizationsModule } from '@/organizations/organizations.module';
import { MarketModule } from '@/market/market.module';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { OrdersModule } from '@/orders/orders.module';
import { IntelligenceModule } from '@/intelligence/intelligence.module';
import { ActivitiesModule } from '@/activities/activities.module';
import { MediaModule } from '@/media/media.module';
import { HealthModule } from '@/health/health.module';
import { AppCacheModule } from '@/common/cache.module';
import { BrevoModule } from '@/external-service/brevo/brevo.module';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { AuthorizationGuard } from '@/common/guards/authorization.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { getRateLimitConfig } from '@/common/config/rate-limit.config';
import { PlatformAdminModule } from '@/platform-admin/platform-admin.module';
import { BillingModule } from '@/billing/billing.module';
import { WeatherModule } from '@/weather/weather.module';
import { UsersModule } from '@/users/users.module';
import { TransactionsModule } from '@/transactions/transactions.module';
import { ExecutiveDashboardModule } from '@/executive-dashboard/executive-dashboard.module';
import { UsageLimitMiddleware } from '@/common/middleware/usage-limit.middleware';
import { OrganizationImpersonationGuard } from '@/common/guards/organization-impersonation.guard';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot(getRateLimitConfig()),
    PrismaModule,
    CommonModule,
    AuthModule,
    PlatformAdminModule,
    FarmsModule,
    InventoryModule,
    OrganizationsModule,
    MarketModule,
    AnalyticsModule,
    OrdersModule,
    IntelligenceModule,
    ActivitiesModule,
    MediaModule,
    HealthModule,
    AppCacheModule,
    BrevoModule,
    BillingModule,
    WeatherModule,
    UsersModule,
    TransactionsModule,
    ExecutiveDashboardModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OrganizationImpersonationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(UsageLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL }); // Apply to all routes
  }
}
