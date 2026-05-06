/**
 * Course Query Service — read-side cache + repository fan-out for the
 * public course endpoints. Search results are keyed by an md5 of the
 * normalized query (truncated to API_LIMITS.MAX_SUGGESTIONS chars) so
 * the cache namespace stays bounded.
 */

import * as crypto from 'node:crypto';
import { API_LIMITS, APP_CONFIG, LoggerPort } from '@/shared-kernel';
import { MEC_CACHE_KEYS, MEC_CACHE_TTL } from '../../domain/entities/mec-row';
import { MecCachePort } from '../../domain/ports/mec-cache.port';
import { MecCourseRepositoryPort } from '../../domain/ports/mec-course.repository.port';
import type { Course } from '../../schemas/mec.schema';

export class CourseQueryService {
  private readonly context = 'CourseQuery';

  constructor(
    private readonly logger: LoggerPort,
    private readonly repository: MecCourseRepositoryPort,
    private readonly cache: MecCachePort,
  ) {}

  async listCoursesByInstitutionCode(codigoIes: number): Promise<Course[]> {
    const cacheKey = `${MEC_CACHE_KEYS.COURSES_BY_IES}${codigoIes}`;

    const cached = await this.cache.get<Course[]>(cacheKey);
    if (cached) return cached;

    const courses = await this.repository.findCoursesByInstitutionCode(codigoIes);
    await this.cache.set(cacheKey, courses, MEC_CACHE_TTL.COURSES_BY_IES);
    return courses;
  }

  async findCourseByCode(codigoCurso: number): Promise<Course | null> {
    return this.repository.findCourseByCode(codigoCurso);
  }

  async searchCoursesByName(
    searchQuery: string,
    limit: number = APP_CONFIG.DEFAULT_PAGE_SIZE,
  ): Promise<Course[]> {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      this.logger.debug(`Search ignored — query too short: "${searchQuery}"`, this.context);
      return [];
    }

    const cacheKey = this.buildSearchCacheKey(normalizedQuery);
    const cached = await this.cache.get<Course[]>(cacheKey);
    if (cached) return cached;

    const matches = await this.repository.searchCoursesByName(normalizedQuery, limit);
    await this.cache.set(cacheKey, matches, MEC_CACHE_TTL.COURSES_SEARCH);
    return matches;
  }

  async listKnowledgeAreas(): Promise<string[]> {
    return this.repository.listDistinctKnowledgeAreas();
  }

  private buildSearchCacheKey(query: string): string {
    const hash = crypto
      .createHash('md5')
      .update(query)
      .digest('hex')
      .slice(0, API_LIMITS.MAX_SUGGESTIONS);
    return `${MEC_CACHE_KEYS.COURSES_SEARCH}${hash}`;
  }
}
