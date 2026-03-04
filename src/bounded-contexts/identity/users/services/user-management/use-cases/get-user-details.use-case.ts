import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { UserDetails, UserManagementRepositoryPort } from '../ports/user-management.port';

export class GetUserDetailsUseCase {
  constructor(private readonly repository: UserManagementRepositoryPort) {}

  async execute(userId: string): Promise<UserDetails> {
    const user = await this.repository.findUserDetails(userId);

    if (!user) {
      throw new EntityNotFoundException('User');
    }

    return user;
  }
}
