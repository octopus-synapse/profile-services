import { ConflictException, EntityNotFoundException } from '@/shared-kernel/exceptions';
import type {
  UpdatedUser,
  UpdateUserData,
  UserManagementRepositoryPort,
} from '../ports/user-management.port';

export class UpdateUserUseCase {
  constructor(private readonly repository: UserManagementRepositoryPort) {}

  async execute(userId: string, data: UpdateUserData): Promise<UpdatedUser> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new EntityNotFoundException('User');
    }

    try {
      return await this.repository.updateUser(userId, data);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        const target = this.getConstraintTarget(error);
        if (target?.includes('email')) {
          throw new ConflictException('Email already in use');
        }
        if (target?.includes('username')) {
          throw new ConflictException('Username already in use');
        }
        throw new ConflictException('A unique constraint was violated');
      }
      throw error;
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';
  }

  private getConstraintTarget(error: unknown): string[] | undefined {
    if (
      error !== null &&
      typeof error === 'object' &&
      'meta' in error &&
      error.meta &&
      typeof error.meta === 'object' &&
      'target' in error.meta
    ) {
      return error.meta.target as string[];
    }
    return undefined;
  }
}
