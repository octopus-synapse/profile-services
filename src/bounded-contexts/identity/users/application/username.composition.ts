import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { UsernameRepository } from '../infrastructure/adapters/persistence/username.repository';
import { UsernameUseCases } from './ports/username.port';
import { UpdateUsernameUseCase } from './use-cases/username/update-username.use-case';

export { UsernameUseCases };

/**
 * Factory function to build all username use cases.
 * Used for dependency injection in NestJS module.
 */
export function buildUsernameUseCases(prisma: PrismaService): UsernameUseCases {
  const repository = new UsernameRepository(prisma);

  return { updateUsernameUseCase: new UpdateUsernameUseCase(repository) };
}
