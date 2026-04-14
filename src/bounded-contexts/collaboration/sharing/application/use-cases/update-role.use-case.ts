import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { CollaborationRepositoryPort } from '../../domain/ports/collaboration-repository.port';
import type {
  CollaboratorWithUser,
  UpdateRoleParams,
} from '../../domain/types/collaboration.types';

export class UpdateRoleUseCase {
  constructor(private readonly repo: CollaborationRepositoryPort) {}

  async execute(params: UpdateRoleParams): Promise<CollaboratorWithUser> {
    const resume = await this.repo.findResumeOwner(params.resumeId);
    if (!resume) throw new EntityNotFoundException('Resume', params.resumeId);
    if (resume.userId !== params.requesterId)
      throw new ForbiddenException('Only resume owner can update roles');

    const existing = await this.repo.findCollaborator(params.resumeId, params.targetUserId);
    if (!existing) throw new EntityNotFoundException('Collaborator', params.targetUserId);

    return this.repo.updateRole(params.resumeId, params.targetUserId, params.newRole);
  }
}
