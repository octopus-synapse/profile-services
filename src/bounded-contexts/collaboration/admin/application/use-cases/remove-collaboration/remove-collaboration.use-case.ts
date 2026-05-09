/**
 * Admin-scoped removal of a collaborator from a resume. Skips the
 * requester-permission checks of `sharing/remove-collaborator` because
 * `PLATFORM_MANAGE` already authorises arbitrary deletion.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminCollaborationsRepositoryPort } from '../../../domain/ports/admin-collaborations.repository.port';

export class RemoveCollaborationUseCase {
  constructor(private readonly repository: AdminCollaborationsRepositoryPort) {}

  async execute(resumeId: string, userId: string): Promise<void> {
    const existing = await this.repository.findCollaborator(resumeId, userId);
    if (!existing) {
      throw new EntityNotFoundException('Collaboration', `${resumeId}/${userId}`);
    }
    await this.repository.removeCollaborator(resumeId, userId);
  }
}
