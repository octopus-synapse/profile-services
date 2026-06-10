/**
 * Institution Query Service — read-side cache + repository fan-out used
 * by the public institution endpoints. Cache keys live in
 * `MEC_CACHE_KEYS`; TTLs in `MEC_CACHE_TTL`. Search bypasses the cache
 * entirely (results are query-specific and short-lived).
 */

import { APP_CONFIG, LoggerPort } from '@/shared-kernel';
import { MEC_CACHE_KEYS, MEC_CACHE_TTL } from '../../domain/entities/mec-row';
import { tokenizeInstitutionQuery } from '../../domain/services/institution-search-ranking';
import { MecCachePort } from '../../domain/ports/mec-cache.port';
import {
  type InstitutionWithCoursesRow,
  MecInstitutionRepositoryPort,
} from '../../domain/ports/mec-institution.repository.port';
import type { CourseBasic, Institution, InstitutionWithCourses } from '../../schemas/mec.schema';

export class InstitutionQueryService {
  private readonly context = 'InstitutionQuery';

  constructor(
    private readonly logger: LoggerPort,
    private readonly repository: MecInstitutionRepositoryPort,
    private readonly cache: MecCachePort,
  ) {}

  async listAllActiveInstitutions(): Promise<Institution[]> {
    const cached = await this.cache.get<Institution[]>(MEC_CACHE_KEYS.INSTITUTIONS_LIST);
    if (cached) return cached;

    const institutions = await this.repository.listActiveInstitutions();
    await this.cache.set(
      MEC_CACHE_KEYS.INSTITUTIONS_LIST,
      institutions,
      MEC_CACHE_TTL.INSTITUTIONS_LIST,
    );
    return institutions;
  }

  async listInstitutionsByState(uf: string): Promise<Institution[]> {
    const normalizedUf = uf.toUpperCase();
    const cacheKey = `${MEC_CACHE_KEYS.INSTITUTIONS_BY_UF}${normalizedUf}`;

    const cached = await this.cache.get<Institution[]>(cacheKey);
    if (cached) return cached;

    const institutions = await this.repository.findInstitutionsByUf(normalizedUf);
    await this.cache.set(cacheKey, institutions, MEC_CACHE_TTL.INSTITUTIONS_BY_UF);
    return institutions;
  }

  async findInstitutionByCodeWithCourses(
    codigoIes: number,
  ): Promise<InstitutionWithCourses | null> {
    const found: InstitutionWithCoursesRow | null =
      await this.repository.findInstitutionByCode(codigoIes);
    if (!found) return null;

    return {
      id: found.id,
      codigoIes: found.codigoIes,
      nome: found.nome,
      sigla: found.sigla,
      uf: found.uf,
      municipio: found.municipio,
      categoria: found.categoria,
      organizacao: found.organizacao,
      courses: found.courses as CourseBasic[],
    };
  }

  async searchInstitutions(
    searchQuery: string,
    limit: number = APP_CONFIG.DEFAULT_PAGE_SIZE,
  ): Promise<Institution[]> {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      this.logger.debug(`Search ignored — query too short: "${searchQuery}"`, this.context);
      return [];
    }

    return this.repository.searchInstitutions(tokenizeInstitutionQuery(normalizedQuery), limit);
  }

  async listStateCodes(): Promise<string[]> {
    return this.repository.listDistinctUfs();
  }
}
