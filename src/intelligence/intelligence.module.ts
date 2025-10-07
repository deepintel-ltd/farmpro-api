import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { OpenAIService } from './openai.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { UnifiedStorageService } from '../common/services/storage.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, OpenAIService, UnifiedStorageService],
  exports: [IntelligenceService, OpenAIService, UnifiedStorageService],
})
export class IntelligenceModule {}
