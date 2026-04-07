import type { TechNiche } from '../../../dto/tech-niche.dto';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL, type TechAreaType } from '../../../interfaces';
import type { CachePort, TechNicheRepositoryPort } from '../../ports/tech-skills.port';

export class GetNichesByAreaUseCase {
  constructor(
    private readonly repository: TechNicheRepositoryPort,
    private readonly cache: CachePort,
  ) {}

  async execute(areaType: TechAreaType): Promise<TechNiche[]> {
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_AREA}${areaType}`;

    const cached = await this.cache.get<TechNiche[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findByAreaType(areaType);
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_BY_AREA);
    return result;
  }
}
