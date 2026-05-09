import { LoggerPort } from '@/shared-kernel';
import { EmailAlreadyExistsException } from '../../../../shared-kernel/exceptions/identity-shared.exceptions';
import { CreateUserUseCasePort } from '../../ports/create-user.use-case.port';
import type { CreatedUser, CreateUserData } from '../../ports/user-management.port';
import { UserManagementRepositoryPort } from '../../ports/user-management.port';

export class CreateUserUseCase extends CreateUserUseCasePort {
  constructor(
    private readonly repository: UserManagementRepositoryPort,
    private readonly hashPassword: (password: string) => Promise<string>,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async execute(data: CreateUserData): Promise<CreatedUser> {
    const hashedPassword = await this.hashPassword(data.password);

    try {
      return await this.repository.createUser({
        email: data.email,
        hashedPassword,
        name: data.name,
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new EmailAlreadyExistsException();
      }
      throw error;
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';
  }
}
