import type { AuthorizationServicePort } from '@/bounded-contexts/identity/authorization';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { LastAdminProtectionRule } from '../domain/rules/last-admin-protection.rule';
import { ValidRoleAssignmentRule } from '../domain/rules/valid-role-assignment.rule';
import { UserManagementRepository } from '../infrastructure/adapters/persistence/user-management.repository';
import type { AdminResetPasswordUseCasePort } from './ports/admin-reset-password.use-case.port';
import type { AssignRolesUseCasePort } from './ports/assign-roles.use-case.port';
import type { CreateUserUseCasePort } from './ports/create-user.use-case.port';
import type { DeleteUserUseCasePort } from './ports/delete-user.use-case.port';
import type { GetUserDetailsUseCasePort } from './ports/get-user-details.use-case.port';
import type { ListUsersUseCasePort } from './ports/list-users.use-case.port';
import type { UpdateUserUseCasePort } from './ports/update-user.use-case.port';
import { UserManagementUseCases } from './ports/user-management.port';
import { AdminResetUserPasswordUseCase } from './use-cases/user-management/admin-reset-user-password.use-case';
import { AssignRolesUseCase } from './use-cases/user-management/assign-roles.use-case';
import { CreateUserUseCase } from './use-cases/user-management/create-user.use-case';
import { DeleteUserUseCase } from './use-cases/user-management/delete-user.use-case';
import { GetUserDetailsUseCase } from './use-cases/user-management/get-user-details.use-case';
import { ListUsersUseCase } from './use-cases/user-management/list-users.use-case';
import { UpdateUserUseCase } from './use-cases/user-management/update-user.use-case';

export { UserManagementUseCases };

export interface UserManagementUseCasesBundle {
  readonly listUsers: ListUsersUseCasePort;
  readonly getUserDetails: GetUserDetailsUseCasePort;
  readonly createUser: CreateUserUseCasePort;
  readonly updateUser: UpdateUserUseCasePort;
  readonly deleteUser: DeleteUserUseCasePort;
  readonly adminResetPassword: AdminResetPasswordUseCasePort;
  readonly assignRoles: AssignRolesUseCasePort;
}

export function buildUserManagementUseCases(
  prisma: PrismaService,
  hashPassword: (password: string) => Promise<string>,
  authorization: AuthorizationServicePort,
  logger: LoggerPort,
): UserManagementUseCasesBundle {
  const repository = new UserManagementRepository(prisma, logger);
  const lastAdminProtection = new LastAdminProtectionRule(authorization);
  const validRoleAssignment = new ValidRoleAssignmentRule();

  return {
    listUsers: new ListUsersUseCase(repository),
    getUserDetails: new GetUserDetailsUseCase(repository),
    createUser: new CreateUserUseCase(repository, hashPassword, logger),
    updateUser: new UpdateUserUseCase(repository),
    deleteUser: new DeleteUserUseCase(repository, lastAdminProtection, logger),
    adminResetPassword: new AdminResetUserPasswordUseCase(repository, hashPassword, logger),
    assignRoles: new AssignRolesUseCase(
      repository,
      validRoleAssignment,
      lastAdminProtection,
      logger,
    ),
  };
}
