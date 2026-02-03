/**
 * Course Query Service (Refactored)
 * Single Responsibility: Query operations for courses
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
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

  async listCoursesByInstitutionCode(codigoIes: number): Promise<Course[]> {
    const cacheKey = `${MEC_CACHE_KEYS.COURSES_BY_IES}${codigoIes}`;

    const cachedCourses = await this.cache.get<Course[]>(cacheKey);
    if (cachedCourses) return cachedCourses;

    const institutionCourses =
      await this.repository.findCoursesByInstitutionCode(codigoIes);

    await this.cache.set(
      cacheKey,
      institutionCourses,
      MEC_CACHE_TTL.COURSES_BY_IES,
    );

    return institutionCourses;
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
      return [];
    }

    const cacheKey = this.buildSearchCacheKey(normalizedQuery);

    const cachedCourses = await this.cache.get<Course[]>(cacheKey);
    if (cachedCourses) return cachedCourses;

    const matchingCourses = await this.repository.searchCoursesByName(
      normalizedQuery,
      limit,
    );

    await this.cache.set(
      cacheKey,
      matchingCourses,
      MEC_CACHE_TTL.COURSES_SEARCH,
    );

    return matchingCourses;
  }

  async findAllKnowledgeAreas(): Promise<string[]> {
    return this.repository.findAllDistinctKnowledgeAreas();
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
