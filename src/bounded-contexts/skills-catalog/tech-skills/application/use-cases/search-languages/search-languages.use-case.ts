import * as crypto from 'node:crypto';
import { API_LIMITS } from '@/shared-kernel';
import type { ProgrammingLanguage } from '../../../dto/programming-language.dto';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../../../interfaces';
import type { CachePort, ProgrammingLanguageRepositoryPort } from '../../ports/tech-skills.port';

export class SearchLanguagesUseCase {
  constructor(
    private readonly repository: ProgrammingLanguageRepositoryPort,
    private readonly cache: CachePort,
  ) {}

  async execute(query: string, limit = 20): Promise<ProgrammingLanguage[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 1) return [];

    const queryHash = crypto
      .createHash('md5')
      .update(`lang:${normalizedQuery}`)
      .digest('hex')
      .slice(0, API_LIMITS.MAX_SUGGESTIONS);
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_SEARCH}${queryHash}`;

    const cached = await this.cache.get<ProgrammingLanguage[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.search(normalizedQuery, limit);
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_SEARCH);
    return result;
  }
}
