import { APP_CONFIG } from '@/shared-kernel';
import type {
  SpokenLanguage,
  SpokenLanguagesRepositoryPort,
} from '../../ports/spoken-languages.port';

export class SearchSpokenLanguagesUseCase {
  constructor(private readonly repository: SpokenLanguagesRepositoryPort) {}

  async execute(
    query: string,
    limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
  ): Promise<SpokenLanguage[]> {
    return this.repository.searchByName(query, limit);
  }
}
