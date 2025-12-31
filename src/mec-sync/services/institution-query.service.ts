/**
 * Institution Query Service (Refactored)
 * Single Responsibility: Query operations for institutions
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import { InstitutionRepository } from '../repositories';
import {
  InstitutionDto,
  InstitutionWithCoursesDto,
  CourseBasicDto,
} from '../dto';
import {
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
} from '../interfaces/mec-data.interface';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

@Injectable()
export class InstitutionQueryService {
  constructor(
    private readonly repository: InstitutionRepository,
    private readonly cache: CacheService,
  ) {}

  async listAll(): Promise<InstitutionDto[]> {
    const cached = await this.cache.get<InstitutionDto[]>(
      MEC_CACHE_KEYS.INSTITUTIONS_LIST,
    );
    if (cached) return cached;

    const institutions = await this.repository.findAll();

    await this.cache.set(
      MEC_CACHE_KEYS.INSTITUTIONS_LIST,
      institutions,
      MEC_CACHE_TTL.INSTITUTIONS_LIST,
    );

    return institutions;
  }

  async listByState(uf: string): Promise<InstitutionDto[]> {
    const normalizedUf = uf.toUpperCase();
    const cacheKey = `${MEC_CACHE_KEYS.INSTITUTIONS_BY_UF}${normalizedUf}`;

    const cached = await this.cache.get<InstitutionDto[]>(cacheKey);
    if (cached) return cached;

    const institutions = await this.repository.findByUf(normalizedUf);

    await this.cache.set(
      cacheKey,
      institutions,
      MEC_CACHE_TTL.INSTITUTIONS_BY_UF,
    );

    return institutions;
  }

  async getByCode(
    codigoIes: number,
  ): Promise<InstitutionWithCoursesDto | null> {
    const institution = await this.repository.findByCode(codigoIes);
    if (!institution) return null;

    return {
      id: institution.id,
      codigoIes: institution.codigoIes,
      nome: institution.nome,
      sigla: institution.sigla,
      uf: institution.uf,
      municipio: institution.municipio,
      categoria: institution.categoria,
      organizacao: institution.organizacao,
      courses: institution.courses as CourseBasicDto[],
    };
  }

  async search(
    query: string,
    limit: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE,
  ): Promise<InstitutionDto[]> {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    return this.repository.search(normalizedQuery, limit);
  }

  async getStateList(): Promise<string[]> {
    return this.repository.getDistinctUfs();
  }
}
