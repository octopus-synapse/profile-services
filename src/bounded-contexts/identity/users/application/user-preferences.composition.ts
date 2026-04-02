import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { UserPreferencesRepository } from '../infrastructure/adapters/persistence/user-preferences.repository';
import {
  USER_PREFERENCES_USE_CASES,
  type UserPreferencesUseCases,
} from './ports/user-preferences.port';
import { GetFullPreferencesUseCase } from './use-cases/user-preferences/get-full-preferences.use-case';
import { GetPreferencesUseCase } from './use-cases/user-preferences/get-preferences.use-case';
import { UpdateFullPreferencesUseCase } from './use-cases/user-preferences/update-full-preferences.use-case';
import { UpdatePreferencesUseCase } from './use-cases/user-preferences/update-preferences.use-case';

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
