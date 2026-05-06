import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { UserManagementRepository } from '../infrastructure/adapters/persistence/user-management.repository';
import { UserManagementUseCases } from './ports/user-management.port';
import { AdminResetUserPasswordUseCase } from './use-cases/user-management/admin-reset-user-password.use-case';
import { CreateUserUseCase } from './use-cases/user-management/create-user.use-case';
import { DeleteUserUseCase } from './use-cases/user-management/delete-user.use-case';
import { GetUserDetailsUseCase } from './use-cases/user-management/get-user-details.use-case';
import { ListUsersUseCase } from './use-cases/user-management/list-users.use-case';
import { UpdateUserUseCase } from './use-cases/user-management/update-user.use-case';

export { UserManagementUseCases };

export function buildUserManagementUseCases(
  prisma: PrismaService,
  hashPassword: (password: string) => Promise<string>,
  logger: LoggerPort,
): UserManagementUseCases {
  const repository = new UserManagementRepository(prisma, logger);

  return {
    listUsersUseCase: new ListUsersUseCase(repository),
    getUserDetailsUseCase: new GetUserDetailsUseCase(repository),
    createUserUseCase: new CreateUserUseCase(repository, hashPassword, logger),
    updateUserUseCase: new UpdateUserUseCase(repository),
    deleteUserUseCase: new DeleteUserUseCase(repository),
    resetPasswordUseCase: new AdminResetUserPasswordUseCase(repository, hashPassword, logger),
  };
}
