/**
 * Tech Skills Query Service (Facade)
 * Provides unified interface for tech skills queries
 * Delegates to specialized services for each domain
 */

import { Injectable } from '@nestjs/common';
import type { TechAreaType, SkillType } from '../interfaces';
import {
  type TechArea,
  type TechNiche,
  type TechSkill,
  type ProgrammingLanguage,
} from '../dtos';
import { TechAreaQueryService } from './area-query.service';
import { TechNicheQueryService } from './niche-query.service';
import { LanguageQueryService } from './language-query.service';
import { SkillQueryService } from './skill-query.service';
import { SkillSearchService } from './skill-search.service';

// Re-export DTOs for backward compatibility
export type {
  TechArea,
  TechNiche,
  TechSkill,
  ProgrammingLanguage,
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
  async getAllAreas(): Promise<TechArea[]> {
    return this.areaQuery.getAllAreas();
  }

  /** Get all niches */
  async getAllNiches(): Promise<TechNiche[]> {
    return this.nicheQuery.getAllNiches();
  }

  /** Get niches by area */
  async getNichesByArea(areaType: TechAreaType): Promise<TechNiche[]> {
    return this.nicheQuery.getNichesByArea(areaType);
  }

  /** Get all programming languages */
  async getAllLanguages(): Promise<ProgrammingLanguage[]> {
    return this.languageQuery.getAllLanguages();
  }

  /** Search programming languages */
  async searchLanguages(
    query: string,
    limit = 20,
  ): Promise<ProgrammingLanguage[]> {
    return this.languageQuery.searchLanguages(query, limit);
  }

  /** Get all skills */
  async getAllSkills(): Promise<TechSkill[]> {
    return this.skillQuery.getAllSkills();
  }

  /** Get skills by niche */
  async getSkillsByNiche(nicheSlug: string): Promise<TechSkill[]> {
    return this.skillQuery.getSkillsByNiche(nicheSlug);
  }

  /** Get skills by type */
  async getSkillsByType(type: SkillType, limit = 50): Promise<TechSkill[]> {
    return this.skillQuery.getSkillsByType(type, limit);
  }

  /** Search skills */
  async searchSkills(query: string, limit = 20): Promise<TechSkill[]> {
    return this.skillSearch.searchSkills(query, limit);
  }

  /** Combined search for languages and skills */
  async searchAll(
    query: string,
    limit = 20,
  ): Promise<{
    languages: ProgrammingLanguage[];
    skills: TechSkill[];
  }> {
    const [languages, skills] = await Promise.all([
      this.searchLanguages(query, Math.floor(limit / 2)),
      this.searchSkills(query, Math.floor(limit / 2)),
    ]);

    return { languages, skills };
  }
}
