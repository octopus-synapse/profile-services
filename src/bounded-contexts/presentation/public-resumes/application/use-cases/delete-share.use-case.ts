/**
 * Delete Share Use Case
 */

import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { ShareRepositoryPort } from '../../domain/ports/share.repository.port';

export class DeleteShareUseCase {
  constructor(private readonly shareRepo: ShareRepositoryPort) {}

  async execute(userId: string, shareId: string) {
    const share = await this.shareRepo.findByIdWithResume(shareId);

    if (!share) {
      throw new EntityNotFoundException('Share', shareId);
    }

    if (share.resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this share');
    }

    return this.shareRepo.delete(shareId);
  }
}
