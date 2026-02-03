/**
 * Authorization Management Service
 *
 * Application service that handles role and permission assignments,
 * emitting domain events for each change.
 *
 * This separates write operations (assignments) from read operations
 * (permission checking in AuthorizationService).
 */

import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@/shared-kernel';
import { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';
import {
  RoleAssignedEvent,
  RoleRevokedEvent,
  PermissionGrantedEvent,
  PermissionDeniedEvent,
  GroupMembershipChangedEvent,
} from '../domain/events';

export interface AssignRoleParams {
  userId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: Date;
}

export interface RevokeRoleParams {
  userId: string;
  roleId: string;
  revokedBy?: string;
  reason?: string;
}

export interface GrantPermissionParams {
  userId: string;
  permissionId: string;
  assignedBy?: string;
  expiresAt?: Date;
  reason?: string;
}

export interface DenyPermissionParams {
  userId: string;
  permissionId: string;
  deniedBy?: string;
  reason?: string;
}

export interface GroupMembershipParams {
  userId: string;
  groupId: string;
  assignedBy?: string;
  expiresAt?: Date;
}

@Injectable()
export class AuthorizationManagementService {
  constructor(
    private readonly userAuthRepo: UserAuthorizationRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async assignRole(params: AssignRoleParams): Promise<void> {
    await this.userAuthRepo.assignRole(params.userId, params.roleId, {
      assignedBy: params.assignedBy,
      expiresAt: params.expiresAt,
    });

    this.eventPublisher.publish(
      new RoleAssignedEvent(params.userId, {
        roleId: params.roleId,
        assignedBy: params.assignedBy ?? 'system',
      }),
    );
  }

  async revokeRole(params: RevokeRoleParams): Promise<void> {
    await this.userAuthRepo.revokeRole(params.userId, params.roleId);

    this.eventPublisher.publish(
      new RoleRevokedEvent(params.userId, {
        roleId: params.roleId,
        revokedBy: params.revokedBy ?? 'system',
        reason: params.reason ?? 'manual revocation',
      }),
    );
  }

  async grantPermission(params: GrantPermissionParams): Promise<void> {
    await this.userAuthRepo.grantPermission(
      params.userId,
      params.permissionId,
      {
        assignedBy: params.assignedBy,
        expiresAt: params.expiresAt,
        reason: params.reason,
      },
    );

    this.eventPublisher.publish(
      new PermissionGrantedEvent(params.userId, {
        permissionId: params.permissionId,
        grantedBy: params.assignedBy ?? 'system',
      }),
    );
  }

  async denyPermission(params: DenyPermissionParams): Promise<void> {
    await this.userAuthRepo.denyPermission(params.userId, params.permissionId, {
      assignedBy: params.deniedBy,
      reason: params.reason,
    });

    this.eventPublisher.publish(
      new PermissionDeniedEvent(params.userId, {
        permissionId: params.permissionId,
        deniedBy: params.deniedBy ?? 'system',
        reason: params.reason ?? 'explicit denial',
      }),
    );
  }

  async addToGroup(params: GroupMembershipParams): Promise<void> {
    await this.userAuthRepo.addToGroup(params.userId, params.groupId, {
      assignedBy: params.assignedBy,
      expiresAt: params.expiresAt,
    });

    this.eventPublisher.publish(
      new GroupMembershipChangedEvent(params.userId, {
        groupId: params.groupId,
        action: 'added',
      }),
    );
  }

  async removeFromGroup(userId: string, groupId: string): Promise<void> {
    await this.userAuthRepo.removeFromGroup(userId, groupId);

    this.eventPublisher.publish(
      new GroupMembershipChangedEvent(userId, {
        groupId,
        action: 'removed',
      }),
    );
  }
}
