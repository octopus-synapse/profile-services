/**
 * Course Query Service (Refactored)
 * Single Responsibility: Query operations for courses
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../../common/cache/cache.service';
import { CourseRepository } from '../repositories';
import { CourseDto } from '../dto';
import {
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
} from '../interfaces/mec-data.interface';
import {
  APP_CONSTANTS,
  API_LIMITS,
} from '../../common/constants/config';

@Injectable()
export class CourseQueryService {
  constructor(
    private readonly repository: CourseRepository,
    private readonly cache: CacheService,
  ) {}

  async listByInstitution(codigoIes: number): Promise<CourseDto[]> {
    const cacheKey = `${MEC_CACHE_KEYS.COURSES_BY_IES}${codigoIes}`;

    const cached = await this.cache.get<CourseDto[]>(cacheKey);
    if (cached) return cached;

    const courses = await this.repository.findByInstitution(codigoIes);

    await this.cache.set(cacheKey, courses, MEC_CACHE_TTL.COURSES_BY_IES);

    return courses;
  }

  async getByCode(codigoCurso: number): Promise<CourseDto | null> {
    return this.repository.findByCode(codigoCurso);
  }

  async search(
    query: string,
    limit: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE,
  ): Promise<CourseDto[]> {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    const cacheKey = this.buildSearchCacheKey(normalizedQuery);

    const cached = await this.cache.get<CourseDto[]>(cacheKey);
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
