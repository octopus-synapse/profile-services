import type { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { LastAdminProtectionRule } from '../../../domain/rules/last-admin-protection.rule';
import type { ValidRoleAssignmentRule } from '../../../domain/rules/valid-role-assignment.rule';
import { AssignRolesUseCasePort } from '../../ports/assign-roles.use-case.port';
import { UserManagementRepositoryPort } from '../../ports/user-management.port';

export class AssignRolesUseCase extends AssignRolesUseCasePort {
  constructor(
    private readonly repository: UserManagementRepositoryPort,
    private readonly validRoleAssignment: ValidRoleAssignmentRule,
    private readonly lastAdminProtection: LastAdminProtectionRule,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  async execute(userId: string, roles: string[], assignedBy: string): Promise<void> {
    this.validRoleAssignment.ensure(roles);

    const details = await this.repository.findUserDetails(userId);
    if (!details) {
      throw new EntityNotFoundException('User');
    }

    await this.lastAdminProtection.ensureRoleChangeKeepsAtLeastOneAdmin(
      userId,
      roles,
      details.roles,
    );

    await this.repository.setUserRoles(userId, roles);
    this.logger?.log(`Assigned roles to user ${userId}`, 'AssignRolesUseCase', {
      roles,
      assignedBy,
    });
  }
}
