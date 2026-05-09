import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { InMemoryUserManagementRepository } from '../../../../shared-kernel/testing';
import { InMemoryAuthorizationService } from '../../../../shared-kernel/testing/in-memory';
import {
  InvalidUserRoleException,
  LastAdminCannotBeRemovedException,
} from '../../../domain/exceptions/users.exceptions';
import { LastAdminProtectionRule } from '../../../domain/rules/last-admin-protection.rule';
import { ValidRoleAssignmentRule } from '../../../domain/rules/valid-role-assignment.rule';
import { AssignRolesUseCase } from './assign-roles.use-case';

describe('AssignRolesUseCase', () => {
  let repository: InMemoryUserManagementRepository;
  let authorization: InMemoryAuthorizationService;
  let useCase: AssignRolesUseCase;

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    authorization = new InMemoryAuthorizationService();
    useCase = new AssignRolesUseCase(
      repository,
      new ValidRoleAssignmentRule(),
      new LastAdminProtectionRule(authorization),
    );
  });

  it('assigns recognised roles to an existing user', async () => {
    repository.seedUser({ id: 'user-1', roles: ['role_user'] });

    await useCase.execute('user-1', ['role_admin'], 'admin-1');

    expect(repository.getUser('user-1')?.roles).toEqual(['role_admin']);
  });

  it('throws InvalidUserRoleException for an unknown role', async () => {
    repository.seedUser({ id: 'user-1', roles: ['role_user'] });

    await expect(useCase.execute('user-1', ['role_ghost'], 'admin-1')).rejects.toThrow(
      InvalidUserRoleException,
    );
  });

  it('throws EntityNotFoundException when the target user does not exist', async () => {
    await expect(useCase.execute('missing', ['role_user'], 'admin-1')).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('refuses to demote the last admin', async () => {
    repository.seedUser({ id: 'admin-1', roles: ['role_admin'] });
    authorization.setRoleUserCount('admin', 1);

    await expect(useCase.execute('admin-1', ['role_user'], 'admin-1')).rejects.toThrow(
      LastAdminCannotBeRemovedException,
    );
    expect(repository.getUser('admin-1')?.roles).toEqual(['role_admin']);
  });

  it('allows demoting an admin while other admins remain', async () => {
    repository.seedUser({ id: 'admin-1', roles: ['role_admin'] });
    authorization.setRoleUserCount('admin', 3);

    await useCase.execute('admin-1', ['role_user'], 'admin-1');

    expect(repository.getUser('admin-1')?.roles).toEqual(['role_user']);
  });
});
