import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { GetUserDetailsUseCasePort } from '../../ports/get-user-details.use-case.port';
import type { UserDetails } from '../../ports/user-management.port';
import { UserManagementRepositoryPort } from '../../ports/user-management.port';

export class GetUserDetailsUseCase extends GetUserDetailsUseCasePort {
  constructor(private readonly repository: UserManagementRepositoryPort) {
    super();
  }

  async execute(userId: string): Promise<UserDetails> {
    const user = await this.repository.findUserDetails(userId);

    if (!user) {
      throw new EntityNotFoundException('User');
    }

    return user;
  }
}
