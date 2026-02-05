/**
 * Institution Query Service (Refactored)
 * Single Responsibility: Query operations for institutions
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { InstitutionRepository } from '../repositories';
import {
  Institution,
  InstitutionWithCourses,
  CourseBasic,
} from '@/shared-kernel';
import {
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
} from '../interfaces/mec-data.interface';
import { APP_CONFIG } from '@/shared-kernel';

@Injectable()
export class InstitutionQueryService {
  constructor(
    private readonly repository: InstitutionRepository,
    private readonly cache: CacheService,
  ) {}

  async listAllActiveInstitutions(): Promise<Institution[]> {
    const cachedInstitutions = await this.cache.get<Institution[]>(
      MEC_CACHE_KEYS.INSTITUTIONS_LIST,
    );
    if (cachedInstitutions) return cachedInstitutions;

    const activeInstitutions =
      await this.repository.findAllActiveInstitutions();

    await this.cache.set(
      MEC_CACHE_KEYS.INSTITUTIONS_LIST,
      activeInstitutions,
      MEC_CACHE_TTL.INSTITUTIONS_LIST,
    );

    return activeInstitutions;
  }

  async listInstitutionsByState(uf: string): Promise<Institution[]> {
    const normalizedUf = uf.toUpperCase();
    const cacheKey = `${MEC_CACHE_KEYS.INSTITUTIONS_BY_UF}${normalizedUf}`;

    const cachedInstitutions = await this.cache.get<Institution[]>(cacheKey);
    if (cachedInstitutions) return cachedInstitutions;

    const institutionsInState =
      await this.repository.findInstitutionsByUf(normalizedUf);

    await this.cache.set(
      cacheKey,
      institutionsInState,
      MEC_CACHE_TTL.INSTITUTIONS_BY_UF,
    );

    return institutionsInState;
  }

  async findInstitutionByCodeWithCourses(
    codigoIes: number,
  ): Promise<InstitutionWithCourses | null> {
    const foundInstitution =
      await this.repository.findInstitutionByCode(codigoIes);
    if (!foundInstitution) return null;

    return {
      id: foundInstitution.id,
      codigoIes: foundInstitution.codigoIes,
      nome: foundInstitution.nome,
      sigla: foundInstitution.sigla,
      uf: foundInstitution.uf,
      municipio: foundInstitution.municipio,
      categoria: foundInstitution.categoria,
      organizacao: foundInstitution.organizacao,
      courses: foundInstitution.courses as CourseBasic[],
    };
  }

  async searchInstitutionsByName(
    searchQuery: string,
    limit: number = APP_CONFIG.DEFAULT_PAGE_SIZE,
  ): Promise<Institution[]> {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    const searchResult = await this.repository.search(normalizedQuery, limit);
    const institutions: Institution[] = searchResult;
    return institutions;
  }

  async findAllStateCodes(): Promise<string[]> {
    return this.repository.findAllDistinctUfs();
  }
}
