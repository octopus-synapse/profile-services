/**
 * Authorization Management Use Cases Tests
 *
 * Tests all 6 management use cases with in-memory repositories.
 * Verifies state mutations AND domain event publishing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { EventPublisherPort } from '@/shared-kernel';
import { InMemoryEventBus } from '../../../../shared-kernel/testing';
import {
  GroupMembershipChangedEvent,
  PermissionDeniedEvent,
  PermissionGrantedEvent,
  RoleAssignedEvent,
  RoleRevokedEvent,
} from '../../../domain/events';
import type { UserAuthorizationRepository } from '../../../infrastructure/repositories/user-authorization.repository';
import { InMemoryUserAuthorizationRepository } from '../../../testing';
import { AddToGroupUseCase } from './add-to-group.use-case';
import { AssignRoleUseCase } from './assign-role.use-case';
import { DenyPermissionUseCase } from './deny-permission.use-case';
import { GrantPermissionUseCase } from './grant-permission.use-case';
import { RemoveFromGroupUseCase } from './remove-from-group.use-case';
import { RevokeRoleUseCase } from './revoke-role.use-case';

const USER_ID = 'user-001';
const ROLE_ID = 'role-editor';
const PERMISSION_ID = 'perm-resume-create';
const GROUP_ID = 'group-engineering';

describe('AssignRoleUseCase', () => {
  let useCase: AssignRoleUseCase;
  let userAuthRepo: InMemoryUserAuthorizationRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    userAuthRepo = new InMemoryUserAuthorizationRepository();
    eventBus = new InMemoryEventBus();
    useCase = new AssignRoleUseCase(
      userAuthRepo as unknown as UserAuthorizationRepository,
      eventBus as unknown as EventPublisherPort,
    );
  });

  it('should assign a role to the user', async () => {
    await useCase.execute({ userId: USER_ID, roleId: ROLE_ID });

    const roles = await userAuthRepo.getUserRoles(USER_ID);
    expect(roles).toHaveLength(1);
    expect(roles[0].roleId).toBe(ROLE_ID);
  });

  it('should publish RoleAssignedEvent with correct payload', async () => {
    await useCase.execute({
      userId: USER_ID,
      roleId: ROLE_ID,
      assignedBy: 'admin-001',
    });

    expect(eventBus.hasPublished(RoleAssignedEvent)).toBe(true);
    const events = eventBus.getEventsByType(RoleAssignedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].payload.roleId).toBe(ROLE_ID);
    expect(events[0].payload.assignedBy).toBe('admin-001');
  });

  it('should default assignedBy to "system" in event', async () => {
    await useCase.execute({ userId: USER_ID, roleId: ROLE_ID });

    const events = eventBus.getEventsByType(RoleAssignedEvent);
    expect(events[0].payload.assignedBy).toBe('system');
  });

  it('should store expiration when provided', async () => {
    const expiresAt = new Date('2027-01-01');

    await useCase.execute({ userId: USER_ID, roleId: ROLE_ID, expiresAt });

    const roles = await userAuthRepo.getUserRoles(USER_ID);
    expect(roles[0].expiresAt).toEqual(expiresAt);
  });

  it('should update existing role assignment (idempotent)', async () => {
    await useCase.execute({ userId: USER_ID, roleId: ROLE_ID });
    await useCase.execute({ userId: USER_ID, roleId: ROLE_ID });

    const roles = await userAuthRepo.getUserRoles(USER_ID);
    expect(roles).toHaveLength(1);
  });
});

describe('RevokeRoleUseCase', () => {
  let useCase: RevokeRoleUseCase;
  let userAuthRepo: InMemoryUserAuthorizationRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    userAuthRepo = new InMemoryUserAuthorizationRepository();
    eventBus = new InMemoryEventBus();
    useCase = new RevokeRoleUseCase(
      userAuthRepo as unknown as UserAuthorizationRepository,
      eventBus as unknown as EventPublisherPort,
    );
  });

  it('should remove the role from the user', async () => {
    userAuthRepo.seedRole(USER_ID, { roleId: ROLE_ID });

    await useCase.execute({ userId: USER_ID, roleId: ROLE_ID });

    const roles = await userAuthRepo.getUserRoles(USER_ID);
    expect(roles).toHaveLength(0);
  });

  it('should publish RoleRevokedEvent with correct payload', async () => {
    userAuthRepo.seedRole(USER_ID, { roleId: ROLE_ID });

    await useCase.execute({
      userId: USER_ID,
      roleId: ROLE_ID,
      revokedBy: 'admin-001',
      reason: 'Role expired',
    });

    expect(eventBus.hasPublished(RoleRevokedEvent)).toBe(true);
    const events = eventBus.getEventsByType(RoleRevokedEvent);
    expect(events[0].payload.roleId).toBe(ROLE_ID);
    expect(events[0].payload.revokedBy).toBe('admin-001');
    expect(events[0].payload.reason).toBe('Role expired');
  });

  it('should default revokedBy and reason in event', async () => {
    userAuthRepo.seedRole(USER_ID, { roleId: ROLE_ID });

    await useCase.execute({ userId: USER_ID, roleId: ROLE_ID });

    const events = eventBus.getEventsByType(RoleRevokedEvent);
    expect(events[0].payload.revokedBy).toBe('system');
    expect(events[0].payload.reason).toBe('manual revocation');
  });

  it('should be safe to revoke a non-existent role', async () => {
    await useCase.execute({ userId: USER_ID, roleId: ROLE_ID });

    const roles = await userAuthRepo.getUserRoles(USER_ID);
    expect(roles).toHaveLength(0);
  });
});

describe('GrantPermissionUseCase', () => {
  let useCase: GrantPermissionUseCase;
  let userAuthRepo: InMemoryUserAuthorizationRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    userAuthRepo = new InMemoryUserAuthorizationRepository();
    eventBus = new InMemoryEventBus();
    useCase = new GrantPermissionUseCase(
      userAuthRepo as unknown as UserAuthorizationRepository,
      eventBus as unknown as EventPublisherPort,
    );
  });

  it('should grant a permission to the user', async () => {
    await useCase.execute({ userId: USER_ID, permissionId: PERMISSION_ID });

    const perms = await userAuthRepo.getUserPermissions(USER_ID);
    expect(perms).toHaveLength(1);
    expect(perms[0].permissionId).toBe(PERMISSION_ID);
    expect(perms[0].granted).toBe(true);
  });

  it('should publish PermissionGrantedEvent', async () => {
    await useCase.execute({
      userId: USER_ID,
      permissionId: PERMISSION_ID,
      assignedBy: 'admin-001',
    });

    expect(eventBus.hasPublished(PermissionGrantedEvent)).toBe(true);
    const events = eventBus.getEventsByType(PermissionGrantedEvent);
    expect(events[0].payload.permissionId).toBe(PERMISSION_ID);
    expect(events[0].payload.grantedBy).toBe('admin-001');
  });

  it('should default grantedBy to "system"', async () => {
    await useCase.execute({ userId: USER_ID, permissionId: PERMISSION_ID });

    const events = eventBus.getEventsByType(PermissionGrantedEvent);
    expect(events[0].payload.grantedBy).toBe('system');
  });

  it('should store expiration when provided', async () => {
    const expiresAt = new Date('2027-06-01');

    await useCase.execute({ userId: USER_ID, permissionId: PERMISSION_ID, expiresAt });

    const perms = await userAuthRepo.getUserPermissions(USER_ID);
    expect(perms[0].expiresAt).toEqual(expiresAt);
  });
});

describe('DenyPermissionUseCase', () => {
  let useCase: DenyPermissionUseCase;
  let userAuthRepo: InMemoryUserAuthorizationRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    userAuthRepo = new InMemoryUserAuthorizationRepository();
    eventBus = new InMemoryEventBus();
    useCase = new DenyPermissionUseCase(
      userAuthRepo as unknown as UserAuthorizationRepository,
      eventBus as unknown as EventPublisherPort,
    );
  });

  it('should deny a permission to the user', async () => {
    await useCase.execute({ userId: USER_ID, permissionId: PERMISSION_ID });

    const perms = await userAuthRepo.getUserPermissions(USER_ID);
    expect(perms).toHaveLength(1);
    expect(perms[0].permissionId).toBe(PERMISSION_ID);
    expect(perms[0].granted).toBe(false);
  });

  it('should publish PermissionDeniedEvent with correct payload', async () => {
    await useCase.execute({
      userId: USER_ID,
      permissionId: PERMISSION_ID,
      deniedBy: 'admin-001',
      reason: 'Security restriction',
    });

    expect(eventBus.hasPublished(PermissionDeniedEvent)).toBe(true);
    const events = eventBus.getEventsByType(PermissionDeniedEvent);
    expect(events[0].payload.permissionId).toBe(PERMISSION_ID);
    expect(events[0].payload.deniedBy).toBe('admin-001');
    expect(events[0].payload.reason).toBe('Security restriction');
  });

  it('should default deniedBy and reason in event', async () => {
    await useCase.execute({ userId: USER_ID, permissionId: PERMISSION_ID });

    const events = eventBus.getEventsByType(PermissionDeniedEvent);
    expect(events[0].payload.deniedBy).toBe('system');
    expect(events[0].payload.reason).toBe('explicit denial');
  });

  it('should override a previously granted permission', async () => {
    userAuthRepo.seedPermission(USER_ID, {
      permissionId: PERMISSION_ID,
      granted: true,
    });

    await useCase.execute({ userId: USER_ID, permissionId: PERMISSION_ID });

    const perms = await userAuthRepo.getUserPermissions(USER_ID);
    const perm = perms.find((p) => p.permissionId === PERMISSION_ID);
    expect(perm?.granted).toBe(false);
  });
});

describe('AddToGroupUseCase', () => {
  let useCase: AddToGroupUseCase;
  let userAuthRepo: InMemoryUserAuthorizationRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    userAuthRepo = new InMemoryUserAuthorizationRepository();
    eventBus = new InMemoryEventBus();
    useCase = new AddToGroupUseCase(
      userAuthRepo as unknown as UserAuthorizationRepository,
      eventBus as unknown as EventPublisherPort,
    );
  });

  it('should add the user to a group', async () => {
    await useCase.execute({ userId: USER_ID, groupId: GROUP_ID });

    const groups = await userAuthRepo.getUserGroups(USER_ID);
    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe(GROUP_ID);
  });

  it('should publish GroupMembershipChangedEvent with action "added"', async () => {
    await useCase.execute({ userId: USER_ID, groupId: GROUP_ID });

    expect(eventBus.hasPublished(GroupMembershipChangedEvent)).toBe(true);
    const events = eventBus.getEventsByType(GroupMembershipChangedEvent);
    expect(events[0].payload.groupId).toBe(GROUP_ID);
    expect(events[0].payload.action).toBe('added');
  });

  it('should store expiration when provided', async () => {
    const expiresAt = new Date('2027-03-15');

    await useCase.execute({ userId: USER_ID, groupId: GROUP_ID, expiresAt });

    const groups = await userAuthRepo.getUserGroups(USER_ID);
    expect(groups[0].expiresAt).toEqual(expiresAt);
  });

  it('should be idempotent for same group', async () => {
    await useCase.execute({ userId: USER_ID, groupId: GROUP_ID });
    await useCase.execute({ userId: USER_ID, groupId: GROUP_ID });

    const groups = await userAuthRepo.getUserGroups(USER_ID);
    expect(groups).toHaveLength(1);
  });
});

describe('RemoveFromGroupUseCase', () => {
  let useCase: RemoveFromGroupUseCase;
  let userAuthRepo: InMemoryUserAuthorizationRepository;
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    userAuthRepo = new InMemoryUserAuthorizationRepository();
    eventBus = new InMemoryEventBus();
    useCase = new RemoveFromGroupUseCase(
      userAuthRepo as unknown as UserAuthorizationRepository,
      eventBus as unknown as EventPublisherPort,
    );
  });

  it('should remove the user from a group', async () => {
    userAuthRepo.seedGroup(USER_ID, { groupId: GROUP_ID });

    await useCase.execute(USER_ID, GROUP_ID);

    const groups = await userAuthRepo.getUserGroups(USER_ID);
    expect(groups).toHaveLength(0);
  });

  it('should publish GroupMembershipChangedEvent with action "removed"', async () => {
    userAuthRepo.seedGroup(USER_ID, { groupId: GROUP_ID });

    await useCase.execute(USER_ID, GROUP_ID);

    expect(eventBus.hasPublished(GroupMembershipChangedEvent)).toBe(true);
    const events = eventBus.getEventsByType(GroupMembershipChangedEvent);
    expect(events[0].payload.groupId).toBe(GROUP_ID);
    expect(events[0].payload.action).toBe('removed');
  });

  it('should be safe to remove from a non-existent group', async () => {
    await useCase.execute(USER_ID, GROUP_ID);

    const groups = await userAuthRepo.getUserGroups(USER_ID);
    expect(groups).toHaveLength(0);
  });
});
