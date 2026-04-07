import type {
  SpokenLanguage,
  SpokenLanguagesRepositoryPort,
} from '../../ports/spoken-languages.port';

export class GetSpokenLanguageByCodeUseCase {
  constructor(private readonly repository: SpokenLanguagesRepositoryPort) {}

  async execute(code: string): Promise<SpokenLanguage | null> {
    return this.repository.findByCode(code);
  }
}
