/**
 * Get Pending Approvals Use Case
 */

import { ForbiddenException } from '@nestjs/common';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class GetPendingApprovalsUseCase {
  constructor(
    private readonly themeRepo: ThemeRepositoryPort,
    private readonly authorization: AuthorizationPort,
  ) {}

  async execute(approverId: string) {
    await this.assertIsApprover(approverId);
    return this.themeRepo.findPendingApprovals();
  }

  private async assertIsApprover(userId: string) {
    const hasPermission = await this.authorization.hasPermission(userId, 'theme', 'approve');
    if (!hasPermission) {
      throw new ForbiddenException('Only approvers can perform this action');
    }
  }
}
