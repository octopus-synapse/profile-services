/**
 * Tech Skills Query Service (Facade)
 * Provides unified interface for tech skills queries
 * Delegates to specialized services for each domain
 */

import { Injectable } from '@nestjs/common';
import type { TechAreaType, SkillType } from '../interfaces';
import {
  type TechAreaDto,
  type TechNicheDto,
  type TechSkillDto,
  type ProgrammingLanguageDto,
} from '../dtos';
import { TechAreaQueryService } from './area-query.service';
import { TechNicheQueryService } from './niche-query.service';
import { LanguageQueryService } from './language-query.service';
import { SkillQueryService } from './skill-query.service';
import { SkillSearchService } from './skill-search.service';

// Re-export DTOs for backward compatibility
export type {
  TechAreaDto,
  TechNicheDto,
  TechSkillDto,
  ProgrammingLanguageDto,
} from '../dtos';

@Injectable()
export class TechSkillsQueryService {
  constructor(
    private readonly areaQuery: TechAreaQueryService,
    private readonly nicheQuery: TechNicheQueryService,
    private readonly languageQuery: LanguageQueryService,
    private readonly skillQuery: SkillQueryService,
    private readonly skillSearch: SkillSearchService,
  ) {}

  /** Get all tech areas */
  async getAllAreas(): Promise<TechAreaDto[]> {
    return this.areaQuery.getAllAreas();
  }

  /** Get all niches */
  async getAllNiches(): Promise<TechNicheDto[]> {
    return this.nicheQuery.getAllNiches();
  }

  /** Get niches by area */
  async getNichesByArea(areaType: TechAreaType): Promise<TechNicheDto[]> {
    return this.nicheQuery.getNichesByArea(areaType);
  }

  /** Get all programming languages */
  async getAllLanguages(): Promise<ProgrammingLanguageDto[]> {
    return this.languageQuery.getAllLanguages();
  }

  /** Search programming languages */
  async searchLanguages(
    query: string,
    limit = 20,
  ): Promise<ProgrammingLanguageDto[]> {
    return this.languageQuery.searchLanguages(query, limit);
  }

  /** Get all skills */
  async getAllSkills(): Promise<TechSkillDto[]> {
    return this.skillQuery.getAllSkills();
  }

  /** Get skills by niche */
  async getSkillsByNiche(nicheSlug: string): Promise<TechSkillDto[]> {
    return this.skillQuery.getSkillsByNiche(nicheSlug);
  }

  /** Get skills by type */
  async getSkillsByType(type: SkillType, limit = 50): Promise<TechSkillDto[]> {
    return this.skillQuery.getSkillsByType(type, limit);
  }

  /** Search skills */
  async searchSkills(query: string, limit = 20): Promise<TechSkillDto[]> {
    return this.skillSearch.searchSkills(query, limit);
  }

  /** Combined search for languages and skills */
  async searchAll(
    query: string,
    limit = 20,
  ): Promise<{
    languages: ProgrammingLanguageDto[];
    skills: TechSkillDto[];
  }> {
    const [languages, skills] = await Promise.all([
      this.searchLanguages(query, Math.floor(limit / 2)),
      this.searchSkills(query, Math.floor(limit / 2)),
    ]);

    return { languages, skills };
  }
}
