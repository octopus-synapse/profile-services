/**
 * Delete Share Use Case
 */

import {
  ResumeShareAccessDeniedException,
  ShareNotFoundException,
} from '../../../domain/exceptions/presentation.exceptions';
import type { ShareRepositoryPort } from '../../domain/ports/share.repository.port';

export class DeleteShareUseCase {
  constructor(private readonly shareRepo: ShareRepositoryPort) {}

  async execute(userId: string, shareId: string) {
    const share = await this.shareRepo.findByIdWithResume(shareId);

    if (!share) {
      throw new ShareNotFoundException();
    }

    if (share.resume.userId !== userId) {
      throw new ResumeShareAccessDeniedException();
    }

    return this.shareRepo.delete(shareId);
  }
}
