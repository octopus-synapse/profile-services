/**
 * Enums Controller
 *
 * Exposes domain enums through API endpoints.
 * This ensures enums appear in OpenAPI/Swagger for frontend SDK generation.
 */

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  ExportFormatResponseDto,
  SECTION_TYPE_VALUES,
  SectionTypeResponseDto,
  UserRoleResponseDto,
} from '@/shared-kernel/dtos/enums.dto';

// Wrapper DTOs for array responses
export class ExportFormatsDataDto {
  @ApiProperty({ type: [ExportFormatResponseDto] })
  formats!: ExportFormatResponseDto[];
}

export class UserRolesDataDto {
  @ApiProperty({ type: [UserRoleResponseDto] })
  roles!: UserRoleResponseDto[];
}

export class SectionTypesDataDto {
  @ApiProperty({ type: [SectionTypeResponseDto] })
  types!: SectionTypeResponseDto[];
}

@SdkExport({ tag: 'enums', description: 'Domain Enums API' })
@ApiTags('enums')
@Controller('v1/enums')
export class EnumsController {
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
    const formats = [{ format: 'PDF' }, { format: 'DOCX' }, { format: 'JSON' }];
    return {
      success: true,
      data: { formats: formats as unknown as ExportFormatResponseDto[] },
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
    const roles = [{ role: 'USER' }, { role: 'ADMIN' }, { role: 'APPROVER' }];
    return {
      success: true,
      data: { roles: roles as unknown as UserRoleResponseDto[] },
    };
  }

  @Public()
  @Get('section-types')
  @ApiOperation({
    summary: 'Get available section types',
    description: 'Returns all available resume section types',
  })
  @ApiDataResponse(SectionTypesDataDto, {
    description: 'List of section types',
  })
  getSectionTypes(): DataResponse<SectionTypesDataDto> {
    const types = SECTION_TYPE_VALUES.map((type) => ({ type }));
    return {
      success: true,
      data: { types: types as unknown as SectionTypeResponseDto[] },
    };
  }
}
