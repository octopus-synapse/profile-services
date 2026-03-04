/**
 * Spoken Languages Controller
 * Public API endpoints for spoken language catalog
 *
 * BUG-035 FIX: Added parseInt validation with NaN handling
 */

import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { SpokenLanguagesService } from './services/spoken-languages.service';

class SpokenLanguagesListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  languages!: Array<{ code: string; name: string; nativeName?: string }>;
}

class SpokenLanguageDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  language!: { code: string; name: string; nativeName?: string };
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
  @Public()
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
        languages: languages as unknown as Array<{
          code: string;
          name: string;
          nativeName?: string;
        }>,
      },
    };
  }

  /**
   * Search spoken languages by name
   */
  @Public()
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
        languages: languages as unknown as Array<{
          code: string;
          name: string;
          nativeName?: string;
        }>,
      },
    };
  }

  /**
   * Get a single language by code
   */
  @Public()
  @Get(':code')
  @ApiOperation({ summary: 'Get spoken language by code' })
  @ApiDataResponse(SpokenLanguageDataDto, {
    description: 'Spoken language returned',
  })
  async findLanguageByCode(
    @Param('code') languageCode: string,
  ): Promise<DataResponse<SpokenLanguageDataDto>> {
    const language = await this.spokenLanguagesService.findLanguageByCode(languageCode);
    return {
      success: true,
      data: {
        language: language as unknown as {
          code: string;
          name: string;
          nativeName?: string;
        },
      },
    };
  }
}
