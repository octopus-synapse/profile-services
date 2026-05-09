import { ListUsersUseCasePort } from '../../ports/list-users.use-case.port';
import type { UserListOptions, UserListResult } from '../../ports/user-management.port';
import { UserManagementRepositoryPort } from '../../ports/user-management.port';

export class ListUsersUseCase extends ListUsersUseCasePort {
  constructor(private readonly repository: UserManagementRepositoryPort) {
    super();
  }

  async execute(options: UserListOptions): Promise<UserListResult> {
    const { page, limit } = options;
    const { users, total } = await this.repository.findUsers(options);
    const totalPages = Math.ceil(total / limit);

    return {
      items: users,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
