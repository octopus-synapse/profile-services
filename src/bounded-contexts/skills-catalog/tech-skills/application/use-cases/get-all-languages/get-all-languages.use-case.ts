import type { LoggerPort } from '@/shared-kernel';
import type { ProgrammingLanguage } from '../../../dto/programming-language.dto';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../../../interfaces';
import { CachePort, ProgrammingLanguageRepositoryPort } from '../../ports/tech-skills.port';

export class GetAllLanguagesUseCase {
  constructor(
    private readonly repository: ProgrammingLanguageRepositoryPort,
    private readonly cache: CachePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(): Promise<ProgrammingLanguage[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.LANGUAGES_LIST;

    const cached = await this.cache.get<ProgrammingLanguage[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findAllActive();
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.LANGUAGES_LIST);
    return result;
  }
}
