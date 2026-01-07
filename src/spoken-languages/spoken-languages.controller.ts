/**
 * Spoken Languages Controller
 * Public API endpoints for spoken language catalog
 *
 * BUG-035 FIX: Added parseInt validation with NaN handling
 */

import {
  Controller,
  Get,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { SpokenLanguagesService } from './services/spoken-languages.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('v1/spoken-languages')
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
    // BUG-035 FIX: Validate parseInt result
    let parsedLimit = 10;
    if (limit) {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new BadRequestException(
          'Invalid limit parameter. Must be a positive number.',
        );
      }
    }
    return this.spokenLanguagesService.search(query || '', parsedLimit);
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
