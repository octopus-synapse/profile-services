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
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { SectionTypesService } from '@/bounded-contexts/platform/common/services/section-types.service';
import { ExportFormatResponseDto, UserRoleResponseDto } from '@/shared-kernel/dtos/enums.dto';

/** Dynamic section type response */
export class SectionTypeResponseDto {
  @ApiProperty({
    example: 'work_experience_v1',
    description: 'Section type key',
  })
  key!: string;

  @ApiProperty({ example: 'EDUCATION', description: 'Semantic kind' })
  semanticKind!: string;

  @ApiProperty({ example: 'Work Experience', description: 'Display title' })
  title!: string;
}

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
    const roles: UserRoleResponseDto[] = [
      { role: 'USER' },
      { role: 'ADMIN' },
      { role: 'APPROVER' },
    ];
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
    const allTypes = this.sectionTypesService.getAll();
    const types: SectionTypeResponseDto[] = allTypes.map((st) => ({
      key: st.key,
      semanticKind: st.semanticKind,
      title: st.title,
    }));
    return {
      success: true,
      data: { types },
    };
  }
}
