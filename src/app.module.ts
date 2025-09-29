import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
import { HealthModule } from '@/health/health.module';
import { AppCacheModule } from '@/common/cache.module';
import { BrevoModule } from '@/external-service/brevo/brevo.module';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { getRateLimitConfig } from '@/common/config/rate-limit.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot(getRateLimitConfig()),
    PrismaModule,
    AuthModule,
    RbacModule,
    FarmsModule,
    InventoryModule,
    OrganizationsModule,
    MarketModule,
    AnalyticsModule,
    OrdersModule,
    IntelligenceModule,
    ActivitiesModule,
    HealthModule,
    AppCacheModule,
    BrevoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
