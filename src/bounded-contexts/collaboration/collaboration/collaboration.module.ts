/**
 * Collaboration Module
 *
 * Provides resume collaboration functionality.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';

@Module({
  imports: [PrismaModule],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
