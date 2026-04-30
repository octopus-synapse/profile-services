import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { UserPreferencesRepository } from '../infrastructure/adapters/persistence/user-preferences.repository';
import { UserPreferencesUseCases } from './ports/user-preferences.port';
import { GetFullPreferencesUseCase } from './use-cases/user-preferences/get-full-preferences.use-case';
import { GetPreferencesUseCase } from './use-cases/user-preferences/get-preferences.use-case';
import { UpdateFullPreferencesUseCase } from './use-cases/user-preferences/update-full-preferences.use-case';
import { UpdatePreferencesUseCase } from './use-cases/user-preferences/update-preferences.use-case';

export { UserPreferencesUseCases };

export function buildUserPreferencesUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
): UserPreferencesUseCases {
  const repository = new UserPreferencesRepository(prisma, logger);

  return {
    getPreferencesUseCase: new GetPreferencesUseCase(repository),
    updatePreferencesUseCase: new UpdatePreferencesUseCase(repository),
    getFullPreferencesUseCase: new GetFullPreferencesUseCase(repository),
    updateFullPreferencesUseCase: new UpdateFullPreferencesUseCase(repository),
  };
}
