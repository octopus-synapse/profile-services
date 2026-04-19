import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type { RemoveCollaboratorParams } from '../../domain/types/collaboration.types';

export class RemoveCollaboratorUseCase {
  constructor(private readonly repo: CollaborationRepositoryPort) {}

  async execute(params: RemoveCollaboratorParams): Promise<void> {
    const resume = await this.repo.findResumeOwner(params.resumeId);
    if (!resume) throw new EntityNotFoundException('Resume', params.resumeId);

    const isOwner = resume.userId === params.requesterId;
    const isSelf = params.requesterId === params.targetUserId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenException(
        'Only owner can remove collaborators, or you can remove yourself',
      );
    }

    const collaborator = await this.repo.findCollaborator(params.resumeId, params.targetUserId);
    if (!collaborator) throw new EntityNotFoundException('Collaborator', params.targetUserId);

    await this.repo.deleteCollaborator(params.resumeId, params.targetUserId);
  }
}
