import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SpokenLanguagesRepository } from '../infrastructure/adapters/persistence/spoken-languages.repository';
import {
  SPOKEN_LANGUAGES_USE_CASES,
  type SpokenLanguagesUseCases,
} from './ports/spoken-languages.port';
import { GetActiveSpokenLanguagesUseCase } from './use-cases/get-active-spoken-languages/get-active-spoken-languages.use-case';
import { GetSpokenLanguageByCodeUseCase } from './use-cases/get-spoken-language-by-code/get-spoken-language-by-code.use-case';
import { SearchSpokenLanguagesUseCase } from './use-cases/search-spoken-languages/search-spoken-languages.use-case';

export { SPOKEN_LANGUAGES_USE_CASES };

export function buildSpokenLanguagesUseCases(prisma: PrismaService): SpokenLanguagesUseCases {
  const repository = new SpokenLanguagesRepository(prisma);

  return {
    getActiveSpokenLanguagesUseCase: new GetActiveSpokenLanguagesUseCase(repository),
    searchSpokenLanguagesUseCase: new SearchSpokenLanguagesUseCase(repository),
    getSpokenLanguageByCodeUseCase: new GetSpokenLanguageByCodeUseCase(repository),
  };
}
