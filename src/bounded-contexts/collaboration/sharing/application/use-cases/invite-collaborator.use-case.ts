import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CollaborationStartedEvent } from '@/bounded-contexts/collaboration/domain/events';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import type { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type {
  CollaboratorWithUser,
  InviteCollaboratorParams,
} from '../../domain/types/collaboration.types';

export class InviteCollaboratorUseCase {
  constructor(
    private readonly repo: CollaborationRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(params: InviteCollaboratorParams): Promise<CollaboratorWithUser> {
    const resume = await this.repo.findResumeOwner(params.resumeId);
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId !== params.inviterId)
      throw new ForbiddenException('Only resume owner can invite collaborators');
    if (params.inviterId === params.inviteeId)
      throw new BadRequestException('Cannot add yourself as a collaborator');

    const existing = await this.repo.findCollaborator(params.resumeId, params.inviteeId);
    if (existing) throw new ConflictException('User is already a collaborator');

    const collaborator = await this.repo.createCollaborator({
      resumeId: params.resumeId,
      userId: params.inviteeId,
      role: params.role,
      invitedBy: params.inviterId,
    });

    this.eventPublisher.publish(
      new CollaborationStartedEvent(collaborator.id, {
        resumeId: params.resumeId,
        ownerId: params.inviterId,
      }),
    );

    return collaborator;
  }
}
