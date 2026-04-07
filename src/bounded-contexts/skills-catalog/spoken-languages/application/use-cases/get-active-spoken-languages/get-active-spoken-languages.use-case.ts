import type {
  SpokenLanguage,
  SpokenLanguagesRepositoryPort,
} from '../../ports/spoken-languages.port';

export class GetActiveSpokenLanguagesUseCase {
  constructor(private readonly repository: SpokenLanguagesRepositoryPort) {}

  async execute(): Promise<SpokenLanguage[]> {
    return this.repository.findAllActive();
  }
}
