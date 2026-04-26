import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { OnlyResumeOwnerOrSelfCanRemoveException } from '../../../domain/exceptions/collaboration.exceptions';
import { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type { RemoveCollaboratorParams } from '../../domain/types/collaboration.types';

export class RemoveCollaboratorUseCase {
  constructor(private readonly repo: CollaborationRepositoryPort) {}

  async execute(params: RemoveCollaboratorParams): Promise<void> {
    const resume = await this.repo.findResumeOwner(params.resumeId);
    if (!resume) throw new EntityNotFoundException('Resume', params.resumeId);

    const isOwner = resume.userId === params.requesterId;
    const isSelf = params.requesterId === params.targetUserId;

    if (!isOwner && !isSelf) {
      throw new OnlyResumeOwnerOrSelfCanRemoveException();
    }

    const collaborator = await this.repo.findCollaborator(params.resumeId, params.targetUserId);
    if (!collaborator) throw new EntityNotFoundException('Collaborator', params.targetUserId);

    await this.repo.deleteCollaborator(params.resumeId, params.targetUserId);
  }
}
