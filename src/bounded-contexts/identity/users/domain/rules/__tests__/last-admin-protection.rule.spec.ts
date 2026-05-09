import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryAuthorizationService } from '../../../../shared-kernel/testing/in-memory';
import {
  LastAdminCannotBeRemovedException,
  LastManagerCannotBeDeletedException,
} from '../../exceptions/users.exceptions';
import { LastAdminProtectionRule } from '../last-admin-protection.rule';

describe('LastAdminProtectionRule', () => {
  let authorization: InMemoryAuthorizationService;
  let rule: LastAdminProtectionRule;

  beforeEach(() => {
    authorization = new InMemoryAuthorizationService();
    rule = new LastAdminProtectionRule(authorization);
  });

  describe('ensureNotLastAdminBeforeDeletion', () => {
    it('does nothing when the target lacks the manage permission', async () => {
      await expect(rule.ensureNotLastAdminBeforeDeletion('user-1')).resolves.toBeUndefined();
    });

    it('does nothing when other admins exist', async () => {
      authorization.setUserPermission('admin-1', 'user:manage');
      authorization.setRoleUserCount('admin', 3);

      await expect(rule.ensureNotLastAdminBeforeDeletion('admin-1')).resolves.toBeUndefined();
    });

    it('throws when the target is the last privileged user', async () => {
      authorization.setUserPermission('admin-1', 'user:manage');
      authorization.setRoleUserCount('admin', 1);

      await expect(rule.ensureNotLastAdminBeforeDeletion('admin-1')).rejects.toThrow(
        LastManagerCannotBeDeletedException,
      );
    });
  });

  describe('ensureRoleChangeKeepsAtLeastOneAdmin', () => {
    it('does nothing when the next role set still includes admin', async () => {
      await expect(
        rule.ensureRoleChangeKeepsAtLeastOneAdmin('user-1', ['role_admin'], ['role_admin']),
      ).resolves.toBeUndefined();
    });

    it('does nothing when the user was not an admin to begin with', async () => {
      await expect(
        rule.ensureRoleChangeKeepsAtLeastOneAdmin('user-1', ['role_user'], ['role_user']),
      ).resolves.toBeUndefined();
    });

    it('does nothing when other admins remain after the change', async () => {
      authorization.setRoleUserCount('admin', 3);

      await expect(
        rule.ensureRoleChangeKeepsAtLeastOneAdmin('user-1', ['role_user'], ['role_admin']),
      ).resolves.toBeUndefined();
    });

    it('throws when the change would remove the last admin', async () => {
      authorization.setRoleUserCount('admin', 1);

      await expect(
        rule.ensureRoleChangeKeepsAtLeastOneAdmin('user-1', ['role_user'], ['role_admin']),
      ).rejects.toThrow(LastAdminCannotBeRemovedException);
    });
  });
});
