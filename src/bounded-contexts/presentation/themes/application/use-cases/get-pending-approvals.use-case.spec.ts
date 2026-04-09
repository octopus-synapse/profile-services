import { beforeEach, describe, expect, it } from 'bun:test';

import { ForbiddenException } from '@nestjs/common';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import type {
  ThemeRepositoryPort,
  ThemeWithAuthorEmail,
} from '../../domain/ports/theme.repository.port';
import { GetPendingApprovalsUseCase } from './get-pending-approvals.use-case';

describe('GetPendingApprovalsUseCase', () => {
  let useCase: GetPendingApprovalsUseCase;
  let permissionGranted: boolean;
  let pendingThemes: ThemeWithAuthorEmail[];

  const themeRepo = {
    findPendingApprovals: async () => pendingThemes,
  } as unknown as ThemeRepositoryPort;

  const authorization = {
    hasPermission: async () => permissionGranted,
  } as unknown as AuthorizationPort;

  beforeEach(() => {
    permissionGranted = true;
    pendingThemes = [
      { id: 'theme-1', name: 'Pending 1', author: { id: 'u1', name: 'User', email: 'u@e.com' } },
      { id: 'theme-2', name: 'Pending 2', author: { id: 'u2', name: 'User2', email: 'u2@e.com' } },
    ] as unknown as ThemeWithAuthorEmail[];
    useCase = new GetPendingApprovalsUseCase(themeRepo, authorization);
  });

  it('should return pending approvals for an approver', async () => {
    const result = await useCase.execute('approver-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('theme-1');
  });

  it('should throw ForbiddenException when user is not an approver', async () => {
    permissionGranted = false;

    await expect(useCase.execute('user-1')).rejects.toThrow(ForbiddenException);
  });
});
