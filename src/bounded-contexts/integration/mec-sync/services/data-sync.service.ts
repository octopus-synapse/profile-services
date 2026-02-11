/**
 * MEC Data Sync Service
 * Handles institution and course synchronization logic
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { MEC_CACHE_KEYS } from '../interfaces/mec-data.interface';
import { CourseRepository, InstitutionRepository } from '../repositories';
import { ParseResult } from './mec-csv-parser.service';

@Injectable()
export class DataSyncService {
  private readonly context = 'MecSync';

  constructor(
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
    private readonly institutionRepo: InstitutionRepository,
    private readonly courseRepo: CourseRepository,
  ) {}

  async syncInstitutions(parseResult: ParseResult): Promise<{ inserted: number; updated: number }> {
    const institutions = Array.from(parseResult.institutions.values());
    this.logger.log(`Syncing ${institutions.length} institutions...`, this.context);

    const existingInstitutionCodes = await this.institutionRepo.findAllExistingInstitutionCodes();
    const newInstitutions = institutions.filter(
      (institution) => !existingInstitutionCodes.has(institution.codigoIes),
    );

    if (newInstitutions.length === 0) {
      this.logger.log('No new institutions to insert', this.context);
      return { inserted: 0, updated: 0 };
    }

    const insertedInstitutionCount =
      await this.institutionRepo.bulkCreateInstitutions(newInstitutions);
    this.logger.log(`Inserted ${insertedInstitutionCount} new institutions`, this.context);

    return { inserted: insertedInstitutionCount, updated: 0 };
  }

  async syncCourses(parseResult: ParseResult): Promise<{ inserted: number; updated: number }> {
    this.logger.log(`Syncing ${parseResult.courses.length} courses...`, this.context);

    const existingCourseCodes = await this.courseRepo.findAllExistingCourseCodes();
    const validInstitutionCodes = await this.institutionRepo.findAllExistingInstitutionCodes();

    const newCourses = parseResult.courses.filter(
      (course) => !existingCourseCodes.has(course.codigoCurso),
    );

    if (newCourses.length === 0) {
      this.logger.log('No new courses to insert', this.context);
      return { inserted: 0, updated: 0 };
    }

    const insertedCourseCount = await this.courseRepo.bulkCreateCourses(
      newCourses,
      validInstitutionCodes,
    );
    this.logger.log(`Inserted ${insertedCourseCount} new courses`, this.context);

    return { inserted: insertedCourseCount, updated: 0 };
  }

  async invalidateCaches(): Promise<void> {
    this.logger.log('Invalidating MEC caches...', this.context);

    await Promise.all([
      this.cache.delete(MEC_CACHE_KEYS.INSTITUTIONS_LIST),
      this.cache.deletePattern(`${MEC_CACHE_KEYS.INSTITUTIONS_BY_UF}*`),
      this.cache.deletePattern(`${MEC_CACHE_KEYS.COURSES_BY_IES}*`),
      this.cache.deletePattern(`${MEC_CACHE_KEYS.COURSES_SEARCH}*`),
    ]);

    this.logger.log('MEC caches invalidated', this.context);
  }
}
