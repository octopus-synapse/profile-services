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
  CollaborationUseCases,
} from './application/collaboration.composition';
import { CollaborationController } from './collaboration.controller';
import { CollaborationRepositoryPort } from './domain/ports/collaboration-repository.port';
import { PrismaCollaborationRepository } from './infrastructure/adapters/collaboration.repository';
import { CollabCommentService } from './services/collab-comment.service';

@Module({
  imports: [PrismaModule],
  controllers: [CollaborationController],
  providers: [
    { provide: CollaborationRepositoryPort, useClass: PrismaCollaborationRepository },
    {
      provide: CollaborationUseCases,
      useFactory: buildCollaborationUseCases,
      inject: [CollaborationRepositoryPort, EventPublisher],
    },
    CollabCommentService,
  ],
  exports: [CollaborationUseCases, CollabCommentService],
})
export class ResumeSharingModule {}
