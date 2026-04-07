/**
 * Submit Theme For Approval Use Case
 *
 * BUG-007 FIX: Enforces max 2 resubmissions for rejected themes.
 */

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ThemeStatus } from '@prisma/client';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

const MAX_RESUBMISSIONS = 2;

export class SubmitThemeForApprovalUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(userId: string, themeId: string) {
    const theme = await this.themeRepo.findById(themeId);
    if (!theme) throw new NotFoundException(ERROR_MESSAGES.THEME_NOT_FOUND);

    if (theme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CAN_ONLY_SUBMIT_OWN_THEMES);
    }

    const validStatuses: ThemeStatus[] = [ThemeStatus.PRIVATE, ThemeStatus.REJECTED];
    if (!validStatuses.includes(theme.status)) {
      throw new BadRequestException(ERROR_MESSAGES.THEME_MUST_BE_PRIVATE_OR_REJECTED);
    }

    if (theme.status === ThemeStatus.REJECTED) {
      if (theme.rejectionCount >= MAX_RESUBMISSIONS) {
        throw new UnprocessableEntityException(ERROR_MESSAGES.THEME_RESUBMISSION_LIMIT_REACHED);
      }
    }

    return this.themeRepo.update(themeId, {
      status: ThemeStatus.PENDING_APPROVAL,
      rejectionReason: null,
    });
  }
}
