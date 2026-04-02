import { ConflictException } from '@/shared-kernel/exceptions';
import type {
  CreatedUser,
  CreateUserData,
  UserManagementRepositoryPort,
} from '../../ports/user-management.port';

export class CreateUserUseCase {
  constructor(
    private readonly repository: UserManagementRepositoryPort,
    private readonly hashPassword: (password: string) => Promise<string>,
  ) {}

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
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';
  }
}
