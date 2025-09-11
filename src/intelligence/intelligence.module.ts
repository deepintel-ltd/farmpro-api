import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { OpenAIService } from './openai.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, OpenAIService],
  exports: [IntelligenceService, OpenAIService],
})
export class IntelligenceModule {}
