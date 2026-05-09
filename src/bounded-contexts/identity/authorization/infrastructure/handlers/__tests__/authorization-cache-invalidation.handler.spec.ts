import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  PermissionDeniedEvent,
  PermissionGrantedEvent,
  RoleAssignedEvent,
  RoleRevokedEvent,
} from '../../../domain/events';
import { AuthorizationCacheInvalidationHandler } from '../authorization-cache-invalidation.handler';

describe('AuthorizationCacheInvalidationHandler', () => {
  let invalidateCache: ReturnType<typeof mock>;
  let handler: AuthorizationCacheInvalidationHandler;

  beforeEach(() => {
    invalidateCache = mock(() => undefined);
    handler = new AuthorizationCacheInvalidationHandler({
      invalidateCache,
    } as never);
  });

  it('invalidates cache for the user when a role is assigned', () => {
    handler.handleRoleAssigned(
      new RoleAssignedEvent('user-1', { roleId: 'role_admin', assignedBy: 'admin-1' }),
    );

    expect(invalidateCache).toHaveBeenCalledWith('user-1');
  });

  it('invalidates cache for the user when a role is revoked', () => {
    handler.handleRoleRevoked(
      new RoleRevokedEvent('user-1', {
        roleId: 'role_admin',
        revokedBy: 'admin-1',
        reason: 'demotion',
      }),
    );

    expect(invalidateCache).toHaveBeenCalledWith('user-1');
  });

  it('invalidates cache for the user when a permission is granted', () => {
    handler.handlePermissionGranted(
      new PermissionGrantedEvent('user-1', {
        permissionId: 'perm-1',
        grantedBy: 'admin-1',
      }),
    );

    expect(invalidateCache).toHaveBeenCalledWith('user-1');
  });

  it('invalidates cache for the user when a permission is denied', () => {
    handler.handlePermissionDenied(
      new PermissionDeniedEvent('user-1', {
        permissionId: 'perm-1',
        deniedBy: 'admin-1',
        reason: 'temporary lockdown',
      }),
    );

    expect(invalidateCache).toHaveBeenCalledWith('user-1');
  });
});
