/**
 * MEC Sync Service
 * Orchestrates the synchronization process with idempotency guarantees
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { MecCsvParserService } from './mec-csv-parser.service';
import {
  NormalizedInstitution,
  NormalizedCourse,
  SyncResult,
  SyncMetadata,
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
} from '../interfaces/mec-data.interface';
import { MecSyncStatus } from '@prisma/client';

const BATCH_SIZE = 500; // Records per batch insert

@Injectable()
export class MecSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
    private readonly csvParser: MecCsvParserService,
  ) {}

  /**
   * Execute full synchronization process
   */
  async sync(triggeredBy: string = 'manual'): Promise<SyncResult> {
    const startTime = Date.now();

    // Try to acquire distributed lock
    const lockAcquired = await this.cache.acquireLock(
      MEC_CACHE_KEYS.SYNC_LOCK,
      MEC_CACHE_TTL.SYNC_LOCK,
    );

    if (!lockAcquired) {
      throw new Error('Sync already in progress. Please wait for the current sync to complete.');
    }

    // Create sync log entry
    const syncLog = await this.prisma.mecSyncLog.create({
      data: {
        status: MecSyncStatus.RUNNING,
        triggeredBy,
      },
    });

    try {
      this.logger.log(`Starting MEC sync (id: ${syncLog.id})`, 'MecSync');

      // Step 1: Download and parse CSV
      const parseResult = await this.csvParser.downloadAndParse();

      // Step 2: Sync institutions (idempotent)
      const institutionResult = await this.syncInstitutions(
        Array.from(parseResult.institutions.values()),
      );

      // Step 3: Sync courses (idempotent)
      const courseResult = await this.syncCourses(parseResult.courses);

      // Step 4: Invalidate caches
      await this.invalidateCaches();

      // Step 5: Update sync metadata in Redis
      const duration = Date.now() - startTime;
      await this.updateSyncMetadata({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'success',
        lastSyncDuration: duration,
        totalInstitutions: parseResult.institutions.size,
        totalCourses: parseResult.courses.length,
        triggeredBy,
      });

      // Step 6: Update sync log
      await this.prisma.mecSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: MecSyncStatus.SUCCESS,
          completedAt: new Date(),
          institutionsInserted: institutionResult.inserted,
          institutionsUpdated: institutionResult.updated,
          coursesInserted: courseResult.inserted,
          coursesUpdated: courseResult.updated,
          totalRowsProcessed: parseResult.totalRows,
          sourceFileSize: parseResult.fileSize,
        },
      });

      const result: SyncResult = {
        institutionsInserted: institutionResult.inserted,
        institutionsUpdated: institutionResult.updated,
        coursesInserted: courseResult.inserted,
        coursesUpdated: courseResult.updated,
        totalRowsProcessed: parseResult.totalRows,
        errors: parseResult.errors,
      };

      this.logger.log(
        `MEC sync completed in ${(duration / 1000).toFixed(2)}s: ` +
          `${result.institutionsInserted} new institutions, ${result.coursesInserted} new courses`,
        'MecSync',
      );

      return result;
    } catch (error) {
      // Update sync log with error
      await this.prisma.mecSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: MecSyncStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: error instanceof Error ? { stack: error.stack || '' } : undefined,
        },
      });

      // Update metadata with failure
      await this.updateSyncMetadata({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'failed',
        lastSyncDuration: Date.now() - startTime,
        totalInstitutions: 0,
        totalCourses: 0,
        triggeredBy,
      });

      this.logger.error(
        'MEC sync failed',
        error instanceof Error ? error.stack : undefined,
        'MecSync',
      );

      throw error;
    } finally {
      // Always release the lock
      await this.cache.releaseLock(MEC_CACHE_KEYS.SYNC_LOCK);
    }
  }

  /**
   * Sync institutions with idempotent inserts
   */
  private async syncInstitutions(
    institutions: NormalizedInstitution[],
  ): Promise<{ inserted: number; updated: number }> {
    this.logger.log(`Syncing ${institutions.length} institutions...`, 'MecSync');

    // Get existing institution codes
    const existingCodes = await this.prisma.mecInstitution.findMany({
      select: { codigoIes: true },
    });
    const existingSet = new Set(existingCodes.map((i) => i.codigoIes));

    // Filter only new institutions
    const newInstitutions = institutions.filter((i) => !existingSet.has(i.codigoIes));

    if (newInstitutions.length === 0) {
      this.logger.log('No new institutions to insert', 'MecSync');
      return { inserted: 0, updated: 0 };
    }

    // Batch insert new institutions
    let inserted = 0;
    for (let i = 0; i < newInstitutions.length; i += BATCH_SIZE) {
      const batch = newInstitutions.slice(i, i + BATCH_SIZE);

      await this.prisma.mecInstitution.createMany({
        data: batch.map((inst) => ({
          codigoIes: inst.codigoIes,
          nome: inst.nome,
          sigla: inst.sigla,
          organizacao: inst.organizacao,
          categoria: inst.categoria,
          uf: inst.uf,
          municipio: inst.municipio,
          codigoMunicipio: inst.codigoMunicipio,
        })),
        skipDuplicates: true, // Extra safety for race conditions
      });

      inserted += batch.length;

      if (i % (BATCH_SIZE * 10) === 0 && i > 0) {
        this.logger.log(`Inserted ${inserted}/${newInstitutions.length} institutions`, 'MecSync');
      }
    }

    this.logger.log(`Inserted ${inserted} new institutions`, 'MecSync');
    return { inserted, updated: 0 };
  }

  /**
   * Sync courses with idempotent inserts
   */
  private async syncCourses(
    courses: NormalizedCourse[],
  ): Promise<{ inserted: number; updated: number }> {
    this.logger.log(`Syncing ${courses.length} courses...`, 'MecSync');

    // Get existing course codes
    const existingCodes = await this.prisma.mecCourse.findMany({
      select: { codigoCurso: true },
    });
    const existingSet = new Set(existingCodes.map((c) => c.codigoCurso));

    // Get valid institution codes (courses must reference existing institutions)
    const validIesCodes = await this.prisma.mecInstitution.findMany({
      select: { codigoIes: true },
    });
    const validIesSet = new Set(validIesCodes.map((i) => i.codigoIes));

    // Filter only new courses with valid institution references
    const newCourses = courses.filter(
      (c) => !existingSet.has(c.codigoCurso) && validIesSet.has(c.codigoIes),
    );

    if (newCourses.length === 0) {
      this.logger.log('No new courses to insert', 'MecSync');
      return { inserted: 0, updated: 0 };
    }

    // Batch insert new courses
    let inserted = 0;
    for (let i = 0; i < newCourses.length; i += BATCH_SIZE) {
      const batch = newCourses.slice(i, i + BATCH_SIZE);

      await this.prisma.mecCourse.createMany({
        data: batch.map((course) => ({
          codigoCurso: course.codigoCurso,
          codigoIes: course.codigoIes,
          nome: course.nome,
          grau: course.grau,
          modalidade: course.modalidade,
          areaConhecimento: course.areaConhecimento,
          cargaHoraria: course.cargaHoraria,
          situacao: course.situacao,
        })),
        skipDuplicates: true, // Extra safety for race conditions
      });

      inserted += batch.length;

      if (i % (BATCH_SIZE * 10) === 0 && i > 0) {
        this.logger.log(`Inserted ${inserted}/${newCourses.length} courses`, 'MecSync');
      }
    }

    this.logger.log(`Inserted ${inserted} new courses`, 'MecSync');
    return { inserted, updated: 0 };
  }

  /**
   * Invalidate all MEC-related caches after sync
   */
  private async invalidateCaches(): Promise<void> {
    this.logger.log('Invalidating MEC caches...', 'MecSync');

    await Promise.all([
      this.cache.delete(MEC_CACHE_KEYS.INSTITUTIONS_LIST),
      this.cache.deletePattern(`${MEC_CACHE_KEYS.INSTITUTIONS_BY_UF}*`),
      this.cache.deletePattern(`${MEC_CACHE_KEYS.COURSES_BY_IES}*`),
      this.cache.deletePattern(`${MEC_CACHE_KEYS.COURSES_SEARCH}*`),
    ]);

    this.logger.log('MEC caches invalidated', 'MecSync');
  }

  /**
   * Update sync metadata in Redis
   */
  private async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    await this.cache.set(MEC_CACHE_KEYS.SYNC_METADATA, metadata, MEC_CACHE_TTL.METADATA);
  }

  /**
   * Get sync metadata from Redis
   */
  async getSyncMetadata(): Promise<SyncMetadata | null> {
    return this.cache.get<SyncMetadata>(MEC_CACHE_KEYS.SYNC_METADATA);
  }

  /**
   * Check if sync is currently running
   */
  async isSyncRunning(): Promise<boolean> {
    return this.cache.isLocked(MEC_CACHE_KEYS.SYNC_LOCK);
  }

  /**
   * Get last sync log from database
   */
  async getLastSyncLog() {
    return this.prisma.mecSyncLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit = 10) {
    return this.prisma.mecSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
