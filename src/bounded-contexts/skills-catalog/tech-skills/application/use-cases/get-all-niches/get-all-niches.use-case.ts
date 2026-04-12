import type { TechNiche } from '../../../dto/tech-niche.dto';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../../../interfaces';
import type { CachePort, TechNicheRepositoryPort } from '../../ports/tech-skills.port';

export class GetAllNichesUseCase {
  constructor(
    private readonly repository: TechNicheRepositoryPort,
    private readonly cache: CachePort,
  ) {}

  async execute(): Promise<TechNiche[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.NICHES_LIST;

    const cached = await this.cache.get<TechNiche[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findAllActive();
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.NICHES_LIST);
    return result;
  }
}
