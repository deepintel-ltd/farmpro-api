import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import {
  OrderOwnershipGuard,
  OrderParticipantGuard,
  OrderSupplierGuard,
} from './guards';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderOwnershipGuard,
    OrderParticipantGuard,
    OrderSupplierGuard,
  ],
  exports: [
    OrdersService,
    OrderOwnershipGuard,
    OrderParticipantGuard,
    OrderSupplierGuard,
  ],
})
export class OrdersModule {}
