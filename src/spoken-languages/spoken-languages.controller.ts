/**
 * Spoken Languages Controller
 * Public API endpoints for spoken language catalog
 */

import { Controller, Get, Query, Param } from '@nestjs/common';
import { SpokenLanguagesService } from './services/spoken-languages.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('spoken-languages')
export class SpokenLanguagesController {
  constructor(
    private readonly spokenLanguagesService: SpokenLanguagesService,
  ) {}

  /**
   * Get all spoken languages
   * Returns list of languages with translations in en, pt-BR, and es
   */
  @Public()
  @Get()
  async getAll() {
    return this.spokenLanguagesService.getAll();
  }

  /**
   * Search spoken languages by name
   */
  @Public()
  @Get('search')
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    return this.spokenLanguagesService.search(
      query || '',
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get a single language by code
   */
  @Public()
  @Get(':code')
  async getByCode(@Param('code') code: string) {
    return this.spokenLanguagesService.getByCode(code);
  }
}
