/**
 * Spoken Languages Controller
 * Public API endpoints for spoken language catalog
 *
 * BUG-035 FIX: Added parseInt validation with NaN handling
 */

import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { type SpokenLanguage, SpokenLanguagesService } from './services/spoken-languages.service';

class SpokenLanguagesListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  languages!: SpokenLanguage[];
}

class SpokenLanguageDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  language!: SpokenLanguage;
}

@SdkExport({ tag: 'skills', description: 'Spoken Languages API' })
@ApiTags('spoken-languages')
@Controller('v1/spoken-languages')
export class SpokenLanguagesController {
  constructor(private readonly spokenLanguagesService: SpokenLanguagesService) {}

  /**
   * Get all spoken languages
   * Returns list of languages with translations in en, pt-BR, and es
   */
  @RequirePermission(Permission.SKILL_READ)
  @Get()
  @ApiOperation({ summary: 'Get all active spoken languages' })
  @ApiDataResponse(SpokenLanguagesListDataDto, {
    description: 'Active spoken languages returned',
  })
  async findAllActiveLanguages(): Promise<DataResponse<SpokenLanguagesListDataDto>> {
    const languages = await this.spokenLanguagesService.findAllActiveLanguages();
    return {
      success: true,
      data: {
        languages,
      },
    };
  }

  /**
   * Search spoken languages by name
   */
  @RequirePermission(Permission.SKILL_READ)
  @Get('search')
  @ApiOperation({ summary: 'Search spoken languages by name' })
  @ApiDataResponse(SpokenLanguagesListDataDto, {
    description: 'Filtered spoken languages returned',
  })
  async searchLanguagesByName(
    @Query('q') searchQuery: string,
    @Query('limit') limit?: string,
  ): Promise<DataResponse<SpokenLanguagesListDataDto>> {
    // BUG-035 FIX: Validate parseInt result
    let parsedLimit = 10;
    if (limit) {
      parsedLimit = parseInt(limit, 10);
      if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new BadRequestException('Invalid limit parameter. Must be a positive number.');
      }
    }
    const languages = await this.spokenLanguagesService.searchLanguagesByName(
      searchQuery || '',
      parsedLimit,
    );
    return {
      success: true,
      data: {
        languages,
      },
    };
  }

  /**
   * Get a single language by code
   */
  @RequirePermission(Permission.SKILL_READ)
  @Get(':code')
  @ApiOperation({ summary: 'Get spoken language by code' })
  @ApiParam({ name: 'code', description: 'Language code', type: String })
  @ApiDataResponse(SpokenLanguageDataDto, {
    description: 'Spoken language returned',
  })
  async findLanguageByCode(
    @Param('code') languageCode: string,
  ): Promise<DataResponse<SpokenLanguageDataDto>> {
    const language = await this.spokenLanguagesService.findLanguageByCode(languageCode);
    if (!language) {
      throw new NotFoundException(`Language with code '${languageCode}' not found`);
    }
    return {
      success: true,
      data: {
        language,
      },
    };
  }
}
