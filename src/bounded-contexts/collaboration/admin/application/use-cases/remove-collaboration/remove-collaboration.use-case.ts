/**
 * Admin-scoped removal of a collaborator from a resume. Skips the
 * requester-permission checks of `sharing/remove-collaborator` because
 * `PLATFORM_MANAGE` already authorises arbitrary deletion.
 */

import { AdminCollaborationsRepositoryPort } from '../../../domain/ports/admin-collaborations.repository.port';

export class RemoveCollaborationUseCase {
  constructor(private readonly repository: AdminCollaborationsRepositoryPort) {}

  async execute(resumeId: string, userId: string): Promise<void> {
    await this.repository.removeCollaborator(resumeId, userId);
  }
}
