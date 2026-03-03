import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { USERNAME_USE_CASES, type UsernameUseCases } from './ports/username.port';
import { UsernameRepository } from './repository/username.repository';
import { UpdateUsernameUseCase } from './use-cases/update-username.use-case';

export { USERNAME_USE_CASES };

/**
 * Factory function to build all username use cases.
 * Used for dependency injection in NestJS module.
 */
export function buildUsernameUseCases(prisma: PrismaService): UsernameUseCases {
  const repository = new UsernameRepository(prisma);

  return {
    updateUsernameUseCase: new UpdateUsernameUseCase(repository),
  };
}
