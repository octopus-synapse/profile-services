/**
 * Resume Sharing Module
 *
 * Hexagonal architecture — wires use-cases via composition. Controllers
 * are synthesized from `collaboration.routes.ts`.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventPublisher, LoggerPort } from '@/shared-kernel';
import {
  buildCollaborationUseCases,
  CollaborationUseCases,
} from './application/collaboration.composition';
import { CollaborationHttpBundle, collaborationRoutes } from './collaboration.routes';
import { CollaborationRepositoryPort } from './domain/ports/collaboration-repository.port';
import { PrismaCollaborationRepository } from './infrastructure/adapters/collaboration.repository';
import { CollabCommentService } from './services/collab-comment.service';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(CollaborationHttpBundle, collaborationRoutes),
  providers: [
    { provide: CollaborationRepositoryPort, useClass: PrismaCollaborationRepository },
    {
      provide: CollaborationUseCases,
      useFactory: buildCollaborationUseCases,
      inject: [CollaborationRepositoryPort, EventPublisher, LoggerPort],
    },
    CollabCommentService,
    {
      provide: CollaborationHttpBundle,
      useFactory: (
        collaboration: CollaborationUseCases,
        comments: CollabCommentService,
      ): CollaborationHttpBundle => ({ collaboration, comments }),
      inject: [CollaborationUseCases, CollabCommentService],
    },
  ],
  exports: [CollaborationUseCases, CollabCommentService],
})
export class ResumeSharingModule {}
