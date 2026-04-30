/**
 * Data Sync Service — handles the institution + course bulk insert
 * pass. Skips rows whose codes already exist (this is an additive
 * pipeline; updates are intentionally not wired here yet) and
 * invalidates the read-side caches at the end so the next API call
 * reflects the freshly-synced data.
 */

import { LoggerPort } from '@/shared-kernel';
import { MEC_CACHE_KEYS } from '../../domain/entities/mec-row';
import { MecCachePort } from '../../domain/ports/mec-cache.port';
import { MecCourseRepositoryPort } from '../../domain/ports/mec-course.repository.port';
import { MecInstitutionRepositoryPort } from '../../domain/ports/mec-institution.repository.port';
import type { ParseResult } from './mec-csv-parser.service';

export class DataSyncService {
  private readonly context = 'MecSync';

  constructor(
    private readonly logger: LoggerPort,
    private readonly cache: MecCachePort,
    private readonly institutionRepo: MecInstitutionRepositoryPort,
    private readonly courseRepo: MecCourseRepositoryPort,
  ) {}

  async syncInstitutions(parseResult: ParseResult): Promise<{ inserted: number; updated: number }> {
    const institutions = Array.from(parseResult.institutions.values());
    this.logger.log(`Syncing ${institutions.length} institutions...`, this.context);

    const existing = await this.institutionRepo.findAllExistingInstitutionCodes();
    const newOnes = institutions.filter((i) => !existing.has(i.codigoIes));

    if (newOnes.length === 0) {
      this.logger.log('No new institutions to insert', this.context);
      return { inserted: 0, updated: 0 };
    }

    const inserted = await this.institutionRepo.bulkCreateInstitutions(newOnes);
    this.logger.log(`Inserted ${inserted} new institutions`, this.context);

    return { inserted, updated: 0 };
  }

  async syncCourses(parseResult: ParseResult): Promise<{ inserted: number; updated: number }> {
    this.logger.log(`Syncing ${parseResult.courses.length} courses...`, this.context);

    const existing = await this.courseRepo.findAllExistingCourseCodes();
    const validInstitutionCodes = await this.institutionRepo.findAllExistingInstitutionCodes();

    const newOnes = parseResult.courses.filter((c) => !existing.has(c.codigoCurso));

    if (newOnes.length === 0) {
      this.logger.log('No new courses to insert', this.context);
      return { inserted: 0, updated: 0 };
    }

    const inserted = await this.courseRepo.bulkCreateCourses(newOnes, validInstitutionCodes);
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
