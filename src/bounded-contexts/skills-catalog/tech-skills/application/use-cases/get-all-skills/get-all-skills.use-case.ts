import type { TechSkill } from '../../../dto/tech-skill.dto';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../../../interfaces';
import type { CachePort, TechSkillRepositoryPort } from '../../ports/tech-skills.port';

export class GetAllSkillsUseCase {
  constructor(
    private readonly repository: TechSkillRepositoryPort,
    private readonly cache: CachePort,
  ) {}

  async execute(): Promise<TechSkill[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.SKILLS_LIST;

    const cached = await this.cache.get<TechSkill[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findAllActive();
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_LIST);
    return result;
  }
}
