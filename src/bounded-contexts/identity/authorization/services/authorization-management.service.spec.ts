/**
 * Authorization Management Service Unit Tests
 *
 * Tests the role and permission assignment service.
 * Focus: Assignment operations and event publishing.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthorizationManagementService } from './authorization-management.service';
import type { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';
import type { EventPublisher } from '@/shared-kernel';

describe('AuthorizationManagementService', () => {
  let service: AuthorizationManagementService;
  let mockUserAuthRepo: Partial<UserAuthorizationRepository>;
  let mockEventPublisher: Partial<EventPublisher>;

  const mockUserId = 'user-123';
  const mockRoleId = 'role-456';
  const mockPermissionId = 'perm-789';
  const mockGroupId = 'group-abc';

  beforeEach(() => {
    mockUserAuthRepo = {
      assignRole: mock(() => Promise.resolve()),
      revokeRole: mock(() => Promise.resolve()),
      grantPermission: mock(() => Promise.resolve()),
      denyPermission: mock(() => Promise.resolve()),
      addToGroup: mock(() => Promise.resolve()),
      removeFromGroup: mock(() => Promise.resolve()),
    };

    mockEventPublisher = {
      publish: mock(() => {}),
    };

    service = new AuthorizationManagementService(
      mockUserAuthRepo as UserAuthorizationRepository,
      mockEventPublisher as EventPublisher,
    );
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      await service.assignRole({
        userId: mockUserId,
        roleId: mockRoleId,
      });

      expect(mockUserAuthRepo.assignRole).toHaveBeenCalledWith(
        mockUserId,
        mockRoleId,
        expect.any(Object),
      );
    });

    it('should publish RoleAssignedEvent', async () => {
      await service.assignRole({
        userId: mockUserId,
        roleId: mockRoleId,
        assignedBy: 'admin-user',
      });

      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should include expiration when provided', async () => {
      const expiresAt = new Date('2025-12-31');

      await service.assignRole({
        userId: mockUserId,
        roleId: mockRoleId,
        expiresAt,
      });

      expect(mockUserAuthRepo.assignRole).toHaveBeenCalledWith(
        mockUserId,
        mockRoleId,
        expect.objectContaining({ expiresAt }),
      );
    });
  });

  describe('revokeRole', () => {
    it('should revoke role from user', async () => {
      await service.revokeRole({
        userId: mockUserId,
        roleId: mockRoleId,
      });

      expect(mockUserAuthRepo.revokeRole).toHaveBeenCalledWith(
        mockUserId,
        mockRoleId,
      );
    });

    it('should publish RoleRevokedEvent', async () => {
      await service.revokeRole({
        userId: mockUserId,
        roleId: mockRoleId,
        reason: 'Access no longer needed',
      });

      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('grantPermission', () => {
    it('should grant permission to user', async () => {
      await service.grantPermission({
        userId: mockUserId,
        permissionId: mockPermissionId,
      });

      expect(mockUserAuthRepo.grantPermission).toHaveBeenCalledWith(
        mockUserId,
        mockPermissionId,
        expect.any(Object),
      );
    });

    it('should publish PermissionGrantedEvent', async () => {
      await service.grantPermission({
        userId: mockUserId,
        permissionId: mockPermissionId,
      });

      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('denyPermission', () => {
    it('should deny permission to user', async () => {
      await service.denyPermission({
        userId: mockUserId,
        permissionId: mockPermissionId,
        reason: 'Security restriction',
      });

      expect(mockUserAuthRepo.denyPermission).toHaveBeenCalledWith(
        mockUserId,
        mockPermissionId,
        expect.any(Object),
      );
    });

    it('should publish PermissionDeniedEvent', async () => {
      await service.denyPermission({
        userId: mockUserId,
        permissionId: mockPermissionId,
      });

      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('addToGroup', () => {
    it('should add user to group', async () => {
      await service.addToGroup({
        userId: mockUserId,
        groupId: mockGroupId,
      });

      expect(mockUserAuthRepo.addToGroup).toHaveBeenCalledWith(
        mockUserId,
        mockGroupId,
        expect.any(Object),
      );
    });

    it('should publish GroupMembershipChangedEvent', async () => {
      await service.addToGroup({
        userId: mockUserId,
        groupId: mockGroupId,
      });

      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('removeFromGroup', () => {
    it('should remove user from group', async () => {
      await service.removeFromGroup(mockUserId, mockGroupId);

      expect(mockUserAuthRepo.removeFromGroup).toHaveBeenCalledWith(
        mockUserId,
        mockGroupId,
      );
    });

    it('should publish GroupMembershipChangedEvent', async () => {
      await service.removeFromGroup(mockUserId, mockGroupId);

      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });
  });
});
