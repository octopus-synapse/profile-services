import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PlatformEventsController } from './platform-events.controller';
import { PlatformEventsService } from './platform-events.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PlatformEventsController],
  providers: [PlatformEventsService],
})
export class PlatformEventsModule {}
