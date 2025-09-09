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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
