import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SuccessStoryController } from './controllers/success-story.controller';
import { SuccessStoryService } from './services/success-story.service';

@Module({
  imports: [PrismaModule],
  controllers: [SuccessStoryController],
  providers: [SuccessStoryService],
  exports: [SuccessStoryService],
})
export class SuccessStoriesModule {}
