import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  USER_MANAGEMENT_USE_CASES,
  type UserManagementUseCases,
} from './ports/user-management.port';
import { UserManagementRepository } from './repository/user-management.repository';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { DeleteUserUseCase } from './use-cases/delete-user.use-case';
import { GetUserDetailsUseCase } from './use-cases/get-user-details.use-case';
import { ListUsersUseCase } from './use-cases/list-users.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';

export { USER_MANAGEMENT_USE_CASES };

export function buildUserManagementUseCases(
  prisma: PrismaService,
  hashPassword: (password: string) => Promise<string>,
): UserManagementUseCases {
  const repository = new UserManagementRepository(prisma);

  return {
    listUsersUseCase: new ListUsersUseCase(repository),
    getUserDetailsUseCase: new GetUserDetailsUseCase(repository),
    createUserUseCase: new CreateUserUseCase(repository, hashPassword),
    updateUserUseCase: new UpdateUserUseCase(repository),
    deleteUserUseCase: new DeleteUserUseCase(repository),
    resetPasswordUseCase: new ResetPasswordUseCase(repository, hashPassword),
  };
}
