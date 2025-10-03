import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { RbacModule } from '@/rbac/rbac.module';
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
import { getRateLimitConfig } from '@/common/config/rate-limit.config';
import { PlatformAdminModule } from '@/platform-admin/platform-admin.module';
import { BillingModule } from '@/billing/billing.module';
import { WeatherModule } from '@/weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot(getRateLimitConfig()),
    PrismaModule,
    AuthModule,
    RbacModule,
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
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
