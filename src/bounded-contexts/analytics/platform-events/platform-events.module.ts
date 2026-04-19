import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PlatformEventsController } from './platform-events.controller';
import { PlatformEventsService } from './platform-events.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformEventsController],
  providers: [PlatformEventsService],
})
export class PlatformEventsModule {}
