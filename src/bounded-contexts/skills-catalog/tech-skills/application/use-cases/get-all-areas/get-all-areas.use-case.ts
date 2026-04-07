import type { TechArea } from '../../../dto/tech-area.dto';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../../../interfaces';
import type { CachePort, TechAreaRepositoryPort } from '../../ports/tech-skills.port';

export class GetAllAreasUseCase {
  constructor(
    private readonly repository: TechAreaRepositoryPort,
    private readonly cache: CachePort,
  ) {}

  async execute(): Promise<TechArea[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.AREAS_LIST;

    const cached = await this.cache.get<TechArea[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findAllActive();
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.AREAS_LIST);
    return result;
  }
}
