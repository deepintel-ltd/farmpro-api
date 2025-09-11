import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    FarmsModule,
    InventoryModule,
    OrganizationsModule,
    MarketModule,
    AnalyticsModule,
    OrdersModule,
    IntelligenceModule,
    ActivitiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
