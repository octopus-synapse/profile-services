/**
 * Course Query Service (Refactored)
 * Single Responsibility: Query operations for courses
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../../common/cache/cache.service';
import { CourseRepository } from '../repositories';
import { Course } from '@octopus-synapse/profile-contracts';
import {
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
} from '../interfaces/mec-data.interface';
import { APP_CONFIG, API_LIMITS } from '@octopus-synapse/profile-contracts';

@Injectable()
export class CourseQueryService {
  constructor(
    private readonly repository: CourseRepository,
    private readonly cache: CacheService,
  ) {}

  async listByInstitution(codigoIes: number): Promise<Course[]> {
    const cacheKey = `${MEC_CACHE_KEYS.COURSES_BY_IES}${codigoIes}`;

    const cached = await this.cache.get<Course[]>(cacheKey);
    if (cached) return cached;

    const courses = await this.repository.findByInstitution(codigoIes);

    await this.cache.set(cacheKey, courses, MEC_CACHE_TTL.COURSES_BY_IES);

    return courses;
  }

  async getByCode(codigoCurso: number): Promise<Course | null> {
    return this.repository.findByCode(codigoCurso);
  }

  async search(
    query: string,
    limit: number = APP_CONFIG.DEFAULT_PAGE_SIZE,
  ): Promise<Course[]> {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    const cacheKey = this.buildSearchCacheKey(normalizedQuery);

    const cached = await this.cache.get<Course[]>(cacheKey);
    if (cached) return cached;

    const courses = await this.repository.search(normalizedQuery, limit);

    await this.cache.set(cacheKey, courses, MEC_CACHE_TTL.COURSES_SEARCH);

    return courses;
  }

  async getKnowledgeAreas(): Promise<string[]> {
    return this.repository.getDistinctAreas();
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
