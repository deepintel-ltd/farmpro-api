import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RbacController],
})
export class RbacModule {}