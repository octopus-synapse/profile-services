import { ForbiddenException } from '@nestjs/common';
import type { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type { CollaboratorWithUser } from '../../domain/types/collaboration.types';

export class GetCollaboratorsUseCase {
  constructor(private readonly repo: CollaborationRepositoryPort) {}

  async execute(resumeId: string, requesterId: string): Promise<CollaboratorWithUser[]> {
    const resume = await this.repo.findResumeOwner(resumeId);
    const isOwner = resume?.userId === requesterId;

    if (!isOwner) {
      const collaborator = await this.repo.findCollaborator(resumeId, requesterId);
      if (!collaborator) throw new ForbiddenException('Access denied to this resume');
    }

    return this.repo.findCollaborators(resumeId);
  }
}
