/**
 * Enums Controller
 *
 * Exposes domain enums through API endpoints.
 * This ensures enums appear in OpenAPI/Swagger for frontend SDK generation.
 *
 * Section types come from the SectionType table (definition-driven),
 * not from hardcoded enums.
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  ExportFormatResponseDto,
  ExportFormatsDataDto,
  SectionTypeResponseDto,
  SectionTypesDataDto,
  UserRoleResponseDto,
  UserRolesDataDto,
} from '@/bounded-contexts/platform/common/dto/enums.dto';
import { SectionTypesService } from '@/bounded-contexts/platform/common/services/section-types.service';

@SdkExport({ tag: 'enums', description: 'Domain Enums API' })
@ApiTags('enums')
@Controller('v1/enums')
export class EnumsController {
  constructor(private readonly sectionTypesService: SectionTypesService) {}

  @Public()
  @Get('export-formats')
  @ApiOperation({
    summary: 'Get available export formats',
    description: 'Returns all available export formats for resume export',
  })
  @ApiDataResponse(ExportFormatsDataDto, {
    description: 'List of export formats',
  })
  getExportFormats(): DataResponse<ExportFormatsDataDto> {
    const formats: ExportFormatResponseDto[] = [
      { format: 'PDF' },
      { format: 'DOCX' },
      { format: 'JSON' },
    ];
    return {
      success: true,
      data: { formats },
    };
  }

  @Public()
  @Get('user-roles')
  @ApiOperation({
    summary: 'Get available user roles',
    description: 'Returns all available user roles in the system',
  })
  @ApiDataResponse(UserRolesDataDto, { description: 'List of user roles' })
  getUserRoles(): DataResponse<UserRolesDataDto> {
    const roles: UserRoleResponseDto[] = [{ role: 'USER' }, { role: 'ADMIN' }];
    return {
      success: true,
      data: { roles },
    };
  }

  @Public()
  @Get('section-types')
  @ApiOperation({
    summary: 'Get available section types',
    description: 'Returns all available resume section types from definitions',
  })
  @ApiDataResponse(SectionTypesDataDto, {
    description: 'List of section types',
  })
  getSectionTypes(): DataResponse<SectionTypesDataDto> {
    const types: SectionTypeResponseDto[] = this.sectionTypesService.getAllAsDto();
    return {
      success: true,
      data: { types },
    };
  }
}
