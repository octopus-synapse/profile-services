import * as crypto from 'node:crypto';
import { API_LIMITS } from '@/shared-kernel';
import type { TechSkill } from '../../../dto/tech-skill.dto';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../../../interfaces';
import type { CachePort, TechSkillRepositoryPort } from '../../ports/tech-skills.port';

export class SearchSkillsUseCase {
  constructor(
    private readonly repository: TechSkillRepositoryPort,
    private readonly cache: CachePort,
  ) {}

  async execute(query: string, limit = 20): Promise<TechSkill[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 1) return [];

    const cacheKey = this.buildCacheKey(normalizedQuery);

    const cached = await this.cache.get<TechSkill[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.searchSkills(normalizedQuery, limit);
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_SEARCH);
    return result;
  }

  private buildCacheKey(query: string): string {
    const queryHash = crypto
      .createHash('md5')
      .update(`skill:${query}`)
      .digest('hex')
      .slice(0, API_LIMITS.MAX_SUGGESTIONS);
    return `${TECH_SKILLS_CACHE_KEYS.SKILLS_SEARCH}${queryHash}`;
  }
}
