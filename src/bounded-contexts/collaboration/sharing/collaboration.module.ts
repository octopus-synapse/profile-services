/**
 * Resume Sharing Module
 *
 * Hexagonal architecture — wires use-cases via composition.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { EventPublisher } from '@/shared-kernel';
import {
  buildCollaborationUseCases,
  COLLABORATION_USE_CASES,
} from './application/collaboration.composition';
import { CollaborationController } from './collaboration.controller';
import { COLLABORATION_REPOSITORY } from './domain/ports/collaboration-repository.port';
import { PrismaCollaborationRepository } from './infrastructure/adapters/collaboration.repository';
import { CollabCommentService } from './services/collab-comment.service';

@Module({
  imports: [PrismaModule],
  controllers: [CollaborationController],
  providers: [
    { provide: COLLABORATION_REPOSITORY, useClass: PrismaCollaborationRepository },
    {
      provide: COLLABORATION_USE_CASES,
      useFactory: buildCollaborationUseCases,
      inject: [COLLABORATION_REPOSITORY, EventPublisher],
    },
    CollabCommentService,
  ],
  exports: [COLLABORATION_USE_CASES, CollabCommentService],
})
export class ResumeSharingModule {}
