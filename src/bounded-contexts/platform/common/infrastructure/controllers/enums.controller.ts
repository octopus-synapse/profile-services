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
import { ListExportFormatsUseCase } from '../../application/use-cases/list-export-formats/list-export-formats.use-case';
import { ListSectionTypesUseCase } from '../../application/use-cases/list-section-types/list-section-types.use-case';
import { ListUserRolesUseCase } from '../../application/use-cases/list-user-roles/list-user-roles.use-case';

@SdkExport({ tag: 'enums', description: 'Domain Enums API' })
@ApiTags('enums')
@Controller('v1/enums')
export class EnumsController {
  constructor(
    private readonly listExportFormats: ListExportFormatsUseCase,
    private readonly listUserRoles: ListUserRolesUseCase,
    private readonly listSectionTypes: ListSectionTypesUseCase,
  ) {}

  @Public()
  @Get('export-formats')
  @ApiOperation({
    summary: 'Get available export formats',
    description: 'Returns all available export formats for resume export',
  })
  @ApiDataResponse(ExportFormatsDataDto, { description: 'List of export formats' })
  async getExportFormats(): Promise<DataResponse<ExportFormatsDataDto>> {
    const formats: ExportFormatResponseDto[] = (await this.listExportFormats.execute()).map(
      (format) => ({ format }),
    );
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
  async getUserRoles(): Promise<DataResponse<UserRolesDataDto>> {
    const roles: UserRoleResponseDto[] = (await this.listUserRoles.execute()).map((role) => ({
      role,
    }));
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
  @ApiDataResponse(SectionTypesDataDto, { description: 'List of section types' })
  async getSectionTypes(): Promise<DataResponse<SectionTypesDataDto>> {
    const types: SectionTypeResponseDto[] = await this.listSectionTypes.execute();
    return {
      success: true,
      data: { types },
    };
  }
}
