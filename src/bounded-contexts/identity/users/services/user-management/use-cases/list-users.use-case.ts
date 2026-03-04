import type {
  UserListOptions,
  UserListResult,
  UserManagementRepositoryPort,
} from '../ports/user-management.port';

export class ListUsersUseCase {
  constructor(private readonly repository: UserManagementRepositoryPort) {}

  async execute(options: UserListOptions): Promise<UserListResult> {
    const { page, limit } = options;
    const { users, total } = await this.repository.findUsers(options);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
