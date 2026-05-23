import type { PublicUsersList } from '../../ports/user-profile.port';
import { UserProfileRepositoryPort } from '../../ports/user-profile.port';

export class ListPublicUsersUseCase {
  constructor(private readonly repository: UserProfileRepositoryPort) {}

  async execute(page: number, limit: number): Promise<PublicUsersList> {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 500);
    const { items, total } = await this.repository.listPublicUsers(safePage, safeLimit);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    };
  }
}
