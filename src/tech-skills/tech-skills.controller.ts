/**
 * Tech Skills Controller
 * API endpoints for tech skills, languages, areas, and niches
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TechSkillsSyncService } from './services/tech-skills-sync.service';
import { TechSkillsQueryService } from './services/tech-skills-query.service';
import { InternalAuthGuard } from '../mec-sync/guards/internal-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import type { TechAreaType, SkillType } from './interfaces';

@Controller('tech-skills')
export class TechSkillsController {
  constructor(
    private readonly syncService: TechSkillsSyncService,
    private readonly queryService: TechSkillsQueryService,
  ) {}

  // =========================================
  // Sync Endpoints (Internal/Admin only)
  // =========================================

  /**
   * Trigger manual sync of tech skills from external sources
   * Requires internal API token (bypasses JWT auth)
   */
  @Post('sync')
  @Public() // Bypass global JWT guard
  @UseGuards(InternalAuthGuard) // Use internal token instead
  @HttpCode(HttpStatus.OK)
  async triggerSync() {
    const result = await this.syncService.runSync();
    return {
      message: 'Tech skills sync completed',
      result,
    };
  }

  // =========================================
  // Public Query Endpoints
  // =========================================

  /**
   * Get all tech areas
   */
  @Get('areas')
  @Public()
  async getAreas() {
    return this.queryService.getAllAreas();
  }

  /**
   * Get all tech niches
   */
  @Get('niches')
  @Public()
  async getNiches() {
    return this.queryService.getAllNiches();
  }

  /**
   * Get niches by area type
   */
  @Get('areas/:areaType/niches')
  @Public()
  async getNichesByArea(@Param('areaType') areaType: TechAreaType) {
    return this.queryService.getNichesByArea(areaType);
  }

  /**
   * Get all programming languages
   */
  @Get('languages')
  @Public()
  async getLanguages() {
    return this.queryService.getAllLanguages();
  }

  /**
   * Search programming languages
   */
  @Get('languages/search')
  @Public()
  async searchLanguages(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.searchLanguages(
      query,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Get all skills
   */
  @Get('skills')
  @Public()
  async getSkills() {
    return this.queryService.getAllSkills();
  }

  /**
   * Search skills
   */
  @Get('skills/search')
  @Public()
  async searchSkills(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.searchSkills(
      query,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Get skills by niche
   */
  @Get('niches/:nicheSlug/skills')
  @Public()
  async getSkillsByNiche(@Param('nicheSlug') nicheSlug: string) {
    return this.queryService.getSkillsByNiche(nicheSlug);
  }

  /**
   * Get skills by type
   */
  @Get('skills/type/:type')
  @Public()
  async getSkillsByType(
    @Param('type') type: SkillType,
    @Query('limit') limit?: string,
  ) {
    return this.queryService.getSkillsByType(
      type,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Combined search (languages + skills)
   */
  @Get('search')
  @Public()
  async searchAll(@Query('q') query: string, @Query('limit') limit?: string) {
    return this.queryService.searchAll(query, limit ? parseInt(limit, 10) : 20);
  }
}
