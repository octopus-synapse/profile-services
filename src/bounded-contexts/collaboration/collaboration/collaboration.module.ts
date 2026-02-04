/**
 * Collaboration Module
 *
 * Provides resume collaboration functionality.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
