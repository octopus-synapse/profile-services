import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { InMemoryUserManagementRepository } from '../../../../shared-kernel/testing';
import { InMemoryAuthorizationService } from '../../../../shared-kernel/testing/in-memory';
import {
  CannotDeleteOwnAccountAsAdminException,
  LastManagerCannotBeDeletedException,
} from '../../../domain/exceptions/users.exceptions';
import { LastAdminProtectionRule } from '../../../domain/rules/last-admin-protection.rule';
import { DeleteUserUseCase } from './delete-user.use-case';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let repository: InMemoryUserManagementRepository;
  let authorization: InMemoryAuthorizationService;
  let rule: LastAdminProtectionRule;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    authorization = new InMemoryAuthorizationService();
    rule = new LastAdminProtectionRule(authorization);
    useCase = new DeleteUserUseCase(repository, rule);
  });

  it('throws EntityNotFoundException when the user does not exist', async () => {
    await expect(useCase.execute('user-123', 'admin-456')).rejects.toThrow(EntityNotFoundException);
  });

  it('throws CannotDeleteOwnAccountAsAdminException when the requester targets themselves', async () => {
    repository.seedUser({ id: 'user-123' });

    await expect(useCase.execute('user-123', 'user-123')).rejects.toThrow(
      CannotDeleteOwnAccountAsAdminException,
    );
  });

  it('deletes the user when the request is valid and there are other admins', async () => {
    repository.seedUser({ id: 'user-123' });

    await useCase.execute('user-123', 'admin-456');

    expect(repository.getUser('user-123')).toBeUndefined();
  });

  it('throws LastManagerCannotBeDeletedException when the last privileged user would be removed', async () => {
    repository.seedUser({ id: 'admin-1', role: 'ADMIN', roles: ['role_admin'] });
    authorization.setUserPermission('admin-1', 'user:manage');
    authorization.setRoleUserCount('admin', 1);

    await expect(useCase.execute('admin-1', 'admin-2')).rejects.toThrow(
      LastManagerCannotBeDeletedException,
    );
    expect(repository.getUser('admin-1')).toBeDefined();
  });
});
