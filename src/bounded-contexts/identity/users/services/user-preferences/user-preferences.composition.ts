import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  USER_PREFERENCES_USE_CASES,
  type UserPreferencesUseCases,
} from './ports/user-preferences.port';
import { UserPreferencesRepository } from './repository/user-preferences.repository';
import { GetFullPreferencesUseCase } from './use-cases/get-full-preferences.use-case';
import { GetPreferencesUseCase } from './use-cases/get-preferences.use-case';
import { UpdateFullPreferencesUseCase } from './use-cases/update-full-preferences.use-case';
import { UpdatePreferencesUseCase } from './use-cases/update-preferences.use-case';

export { USER_PREFERENCES_USE_CASES };

export function buildUserPreferencesUseCases(prisma: PrismaService): UserPreferencesUseCases {
  const repository = new UserPreferencesRepository(prisma);

  return {
    getPreferencesUseCase: new GetPreferencesUseCase(repository),
    updatePreferencesUseCase: new UpdatePreferencesUseCase(repository),
    getFullPreferencesUseCase: new GetFullPreferencesUseCase(repository),
    updateFullPreferencesUseCase: new UpdateFullPreferencesUseCase(repository),
  };
}
