/**
 * MEC Data Sync Service
 * Handles institution and course synchronization logic
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { InstitutionRepository, CourseRepository } from '../repositories';
import { MEC_CACHE_KEYS } from '../interfaces/mec-data.interface';
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

  async syncInstitutions(
    parseResult: ParseResult,
  ): Promise<{ inserted: number; updated: number }> {
    const institutions = Array.from(parseResult.institutions.values());
    this.logger.log(
      `Syncing ${institutions.length} institutions...`,
      this.context,
    );

    const existingCodes = await this.institutionRepo.getExistingCodes();
    const newInstitutions = institutions.filter(
      (i) => !existingCodes.has(i.codigoIes),
    );

    if (newInstitutions.length === 0) {
      this.logger.log('No new institutions to insert', this.context);
      return { inserted: 0, updated: 0 };
    }

    const inserted = await this.institutionRepo.bulkCreate(newInstitutions);
    this.logger.log(`Inserted ${inserted} new institutions`, this.context);

    return { inserted, updated: 0 };
  }

  async syncCourses(
    parseResult: ParseResult,
  ): Promise<{ inserted: number; updated: number }> {
    this.logger.log(
      `Syncing ${parseResult.courses.length} courses...`,
      this.context,
    );

    const existingCodes = await this.courseRepo.getExistingCodes();
    const validIesCodes = await this.institutionRepo.getExistingCodes();

    const newCourses = parseResult.courses.filter(
      (c) => !existingCodes.has(c.codigoCurso),
    );

    if (newCourses.length === 0) {
      this.logger.log('No new courses to insert', this.context);
      return { inserted: 0, updated: 0 };
    }

    const inserted = await this.courseRepo.bulkCreate(
      newCourses,
      validIesCodes,
    );
    this.logger.log(`Inserted ${inserted} new courses`, this.context);

    return { inserted, updated: 0 };
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
