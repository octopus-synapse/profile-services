/**
 * MEC Query Service
 * Provides cached queries for institutions and courses
 * Optimized for frontend consumption (/onboarding, /protected/settings)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import {
  MEC_CACHE_KEYS,
  MEC_CACHE_TTL,
} from '../interfaces/mec-data.interface';
import { MecInstitution, MecCourse } from '@prisma/client';
import * as crypto from 'crypto';

// Simplified DTOs for frontend consumption
export interface InstitutionDto {
  id: string;
  codigoIes: number;
  nome: string;
  sigla: string | null;
  uf: string;
  municipio: string | null;
  categoria: string | null;
  organizacao: string | null;
}

export interface CourseDto {
  id: string;
  codigoCurso: number;
  nome: string;
  grau: string | null;
  modalidade: string | null;
  areaConhecimento: string | null;
  institution: {
    nome: string;
    sigla: string | null;
    uf: string;
  };
}

export interface InstitutionWithCoursesDto extends InstitutionDto {
  courses: Omit<CourseDto, 'institution'>[];
}

@Injectable()
export class MecQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Get all institutions (cached)
   * Used for institution dropdown in onboarding/settings
   */
  async getAllInstitutions(): Promise<InstitutionDto[]> {
    const cacheKey = MEC_CACHE_KEYS.INSTITUTIONS_LIST;

    // Try cache first
    const cached = await this.cache.get<InstitutionDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const institutions = await this.prisma.mecInstitution.findMany({
      where: { isActive: true },
      orderBy: [{ uf: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        codigoIes: true,
        nome: true,
        sigla: true,
        uf: true,
        municipio: true,
        categoria: true,
        organizacao: true,
      },
    });

    // Cache result
    await this.cache.set(
      cacheKey,
      institutions,
      MEC_CACHE_TTL.INSTITUTIONS_LIST,
    );

    return institutions;
  }

  /**
   * Get institutions by state (cached)
   */
  async getInstitutionsByUf(uf: string): Promise<InstitutionDto[]> {
    const normalizedUf = uf.toUpperCase();
    const cacheKey = `${MEC_CACHE_KEYS.INSTITUTIONS_BY_UF}${normalizedUf}`;

    // Try cache first
    const cached = await this.cache.get<InstitutionDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const institutions = await this.prisma.mecInstitution.findMany({
      where: {
        uf: normalizedUf,
        isActive: true,
      },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        codigoIes: true,
        nome: true,
        sigla: true,
        uf: true,
        municipio: true,
        categoria: true,
        organizacao: true,
      },
    });

    // Cache result
    await this.cache.set(
      cacheKey,
      institutions,
      MEC_CACHE_TTL.INSTITUTIONS_BY_UF,
    );

    return institutions;
  }

  /**
   * Get courses by institution (cached)
   */
  async getCoursesByInstitution(codigoIes: number): Promise<CourseDto[]> {
    const cacheKey = `${MEC_CACHE_KEYS.COURSES_BY_IES}${codigoIes}`;

    // Try cache first
    const cached = await this.cache.get<CourseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const courses = await this.prisma.mecCourse.findMany({
      where: {
        codigoIes,
        isActive: true,
      },
      orderBy: { nome: 'asc' },
      include: {
        institution: {
          select: {
            nome: true,
            sigla: true,
            uf: true,
          },
        },
      },
    });

    const result: CourseDto[] = courses.map((c) => ({
      id: c.id,
      codigoCurso: c.codigoCurso,
      nome: c.nome,
      grau: c.grau,
      modalidade: c.modalidade,
      areaConhecimento: c.areaConhecimento,
      institution: c.institution,
    }));

    // Cache result
    await this.cache.set(cacheKey, result, MEC_CACHE_TTL.COURSES_BY_IES);

    return result;
  }

  /**
   * Search courses by name (accent-insensitive, cached with short TTL)
   * Used for course autocomplete in onboarding/settings
   */
  async searchCourses(query: string, limit = 20): Promise<CourseDto[]> {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    // Generate cache key from query hash
    const queryHash = crypto
      .createHash('md5')
      .update(normalizedQuery)
      .digest('hex')
      .slice(0, 8);
    const cacheKey = `${MEC_CACHE_KEYS.COURSES_SEARCH}${queryHash}`;

    // Try cache first
    const cached = await this.cache.get<CourseDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database with accent-insensitive search using unaccent
    const courses = await this.prisma.$queryRaw<
      Array<{
        id: string;
        codigoCurso: number;
        nome: string;
        grau: string | null;
        modalidade: string | null;
        areaConhecimento: string | null;
        institution_nome: string;
        institution_sigla: string | null;
        institution_uf: string;
      }>
    >`
      SELECT 
        c.id,
        c."codigoCurso",
        c.nome,
        c.grau,
        c.modalidade,
        c."areaConhecimento",
        i.nome as institution_nome,
        i.sigla as institution_sigla,
        i.uf as institution_uf
      FROM "MecCourse" c
      JOIN "MecInstitution" i ON c."codigoIes" = i."codigoIes"
      WHERE c."isActive" = true
        AND immutable_unaccent(lower(c.nome)) LIKE '%' || immutable_unaccent(lower(${normalizedQuery})) || '%'
      ORDER BY c.nome ASC
      LIMIT ${limit}
    `;

    const result: CourseDto[] = courses.map((c) => ({
      id: c.id,
      codigoCurso: c.codigoCurso,
      nome: c.nome,
      grau: c.grau,
      modalidade: c.modalidade,
      areaConhecimento: c.areaConhecimento,
      institution: {
        nome: c.institution_nome,
        sigla: c.institution_sigla,
        uf: c.institution_uf,
      },
    }));

    // Cache with short TTL
    await this.cache.set(cacheKey, result, MEC_CACHE_TTL.COURSES_SEARCH);

    return result;
  }

  /**
   * Search institutions by name or sigla (accent-insensitive)
   * Uses PostgreSQL unaccent extension for proper Brazilian Portuguese search
   */
  async searchInstitutions(
    query: string,
    limit = 20,
  ): Promise<InstitutionDto[]> {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    // Use raw SQL with unaccent for accent-insensitive search
    const institutions = await this.prisma.$queryRaw<InstitutionDto[]>`
      SELECT 
        id,
        "codigoIes",
        nome,
        sigla,
        uf,
        municipio,
        categoria,
        organizacao
      FROM "MecInstitution"
      WHERE "isActive" = true
        AND (
          immutable_unaccent(lower(nome)) LIKE '%' || immutable_unaccent(lower(${normalizedQuery})) || '%'
          OR (sigla IS NOT NULL AND immutable_unaccent(lower(sigla)) LIKE '%' || immutable_unaccent(lower(${normalizedQuery})) || '%')
        )
      ORDER BY uf ASC, nome ASC
      LIMIT ${limit}
    `;

    return institutions;
  }

  /**
   * Get institution by MEC code
   */
  async getInstitutionByCode(
    codigoIes: number,
  ): Promise<InstitutionWithCoursesDto | null> {
    const institution = await this.prisma.mecInstitution.findUnique({
      where: { codigoIes },
      include: {
        courses: {
          where: { isActive: true },
          orderBy: { nome: 'asc' },
          select: {
            id: true,
            codigoCurso: true,
            nome: true,
            grau: true,
            modalidade: true,
            areaConhecimento: true,
          },
        },
      },
    });

    if (!institution) {
      return null;
    }

    return {
      id: institution.id,
      codigoIes: institution.codigoIes,
      nome: institution.nome,
      sigla: institution.sigla,
      uf: institution.uf,
      municipio: institution.municipio,
      categoria: institution.categoria,
      organizacao: institution.organizacao,
      courses: institution.courses,
    };
  }

  /**
   * Get course by MEC code
   */
  async getCourseByCode(codigoCurso: number): Promise<CourseDto | null> {
    const course = await this.prisma.mecCourse.findUnique({
      where: { codigoCurso },
      include: {
        institution: {
          select: {
            nome: true,
            sigla: true,
            uf: true,
          },
        },
      },
    });

    if (!course) {
      return null;
    }

    return {
      id: course.id,
      codigoCurso: course.codigoCurso,
      nome: course.nome,
      grau: course.grau,
      modalidade: course.modalidade,
      areaConhecimento: course.areaConhecimento,
      institution: course.institution,
    };
  }

  /**
   * Get statistics for dashboard
   */
  async getStats() {
    const [institutionsCount, coursesCount, coursesByGrau, institutionsByUf] =
      await Promise.all([
        this.prisma.mecInstitution.count({ where: { isActive: true } }),
        this.prisma.mecCourse.count({ where: { isActive: true } }),
        this.prisma.mecCourse.groupBy({
          by: ['grau'],
          where: { isActive: true },
          _count: true,
        }),
        this.prisma.mecInstitution.groupBy({
          by: ['uf'],
          where: { isActive: true },
          _count: true,
          orderBy: { uf: 'asc' },
        }),
      ]);

    return {
      totalInstitutions: institutionsCount,
      totalCourses: coursesCount,
      coursesByGrau: coursesByGrau.map((g) => ({
        grau: g.grau || 'Não informado',
        count: g._count,
      })),
      institutionsByUf: institutionsByUf.map((u) => ({
        uf: u.uf,
        count: u._count,
      })),
    };
  }

  /**
   * Get list of unique states (UFs)
   */
  async getUfList(): Promise<string[]> {
    const ufs = await this.prisma.mecInstitution.findMany({
      where: { isActive: true },
      select: { uf: true },
      distinct: ['uf'],
      orderBy: { uf: 'asc' },
    });

    return ufs.map((u) => u.uf);
  }

  /**
   * Get list of unique areas of knowledge
   */
  async getAreasConhecimento(): Promise<string[]> {
    const areas = await this.prisma.mecCourse.findMany({
      where: {
        isActive: true,
        areaConhecimento: { not: null },
      },
      select: { areaConhecimento: true },
      distinct: ['areaConhecimento'],
      orderBy: { areaConhecimento: 'asc' },
    });

    return areas
      .map((a) => a.areaConhecimento)
      .filter((a): a is string => a !== null);
  }
}
