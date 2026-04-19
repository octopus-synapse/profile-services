import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ParseCuidPipe } from '@/bounded-contexts/platform/common/pipes/parse-cuid.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver';
import {
  ResumeSectionDeleteDataDto,
  ResumeSectionItemDataDto,
  ResumeSectionsDataDto,
  ResumeSectionTypesDataDto,
} from '../dto/generic-sections-response.dto';
import { toResumeSectionTypesData } from '../presenters/generic-resume-sections.presenter';
import { GenericResumeSectionsService } from '../services/generic-resume-sections.service';

/**
 * DTO for creating/updating section items.
 * This is a proper class (not interface) so Swagger can generate the OpenAPI schema.
 */
class SectionItemPayloadDto {
  @ApiProperty({
    description: 'Content fields for the section item',
    type: 'object',
    additionalProperties: true,
    example: { title: 'My Achievement', date: '2024-01-15', description: 'Description text' },
  })
  content!: Record<string, unknown>;
}

@SdkExport({ tag: 'resumes', description: 'Generic Resume Sections API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/sections')
export class GenericResumeSectionsController {
  constructor(private readonly sectionsService: GenericResumeSectionsService) {}

  @Get('types')
  @RequirePermission(Permission.SECTION_TYPE_READ)
  @ApiOperation({ summary: 'List active dynamic section types with resolved translations' })
  @ApiParam({
    name: 'resumeId',
    description: 'Resume ID (ignored, types are global)',
  })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for translations (en, pt-BR, es). Defaults to en.',
    example: 'pt-BR',
  })
  @ApiDataResponse(ResumeSectionTypesDataDto, {
    description: 'Section types list with resolved translations',
  })
  async listTypes(
    @Param('resumeId') _resumeId: string,
    @Query('locale') localeParam?: string,
  ): Promise<DataResponse<ResumeSectionTypesDataDto>> {
    const locale = parseLocale(localeParam);
    const rawSectionTypes = await this.sectionsService.listSectionTypes();
    return {
      success: true,
      data: toResumeSectionTypesData(
        rawSectionTypes as Parameters<typeof toResumeSectionTypesData>[0],
        locale,
      ),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List sections and items for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiDataResponse(ResumeSectionsDataDto, {
    description: 'Sections for resume',
  })
  async listResumeSections(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<ResumeSectionsDataDto>> {
    const sections = await this.sectionsService.listResumeSections(resumeId, user.userId);

    return {
      success: true,
      data: {
        sections,
      },
    };
  }

  @Post(':sectionTypeKey/items')
  @ApiOperation({ summary: 'Create section item in a dynamic section type' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({
    name: 'sectionTypeKey',
    description: 'Section type key',
  })
  @ApiBody({ type: SectionItemPayloadDto })
  @ApiDataResponse(ResumeSectionItemDataDto, {
    status: 201,
    description: 'Section item created',
  })
  async createItem(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('sectionTypeKey') sectionTypeKey: string,
    @CurrentUser() user: UserPayload,
    @Body() body: SectionItemPayloadDto,
  ): Promise<DataResponse<ResumeSectionItemDataDto>> {
    const item = await this.sectionsService.createItem(
      resumeId,
      sectionTypeKey,
      user.userId,
      body.content ?? {},
    );

    return {
      success: true,
      data: {
        item,
      },
    };
  }

  @Patch(':sectionTypeKey/items/:itemId')
  @ApiOperation({ summary: 'Update section item in a dynamic section type' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'sectionTypeKey', description: 'Section type key' })
  @ApiParam({ name: 'itemId', description: 'Section item ID' })
  @ApiBody({ type: SectionItemPayloadDto })
  @ApiDataResponse(ResumeSectionItemDataDto, {
    description: 'Section item updated',
  })
  async updateItem(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('sectionTypeKey') sectionTypeKey: string,
    @Param('itemId', ParseCuidPipe) itemId: string,
    @CurrentUser() user: UserPayload,
    @Body() body: SectionItemPayloadDto,
  ): Promise<DataResponse<ResumeSectionItemDataDto>> {
    const item = await this.sectionsService.updateItem(
      resumeId,
      sectionTypeKey,
      itemId,
      user.userId,
      body.content ?? {},
    );

    return {
      success: true,
      data: {
        item,
      },
    };
  }

  @Delete(':sectionTypeKey/items/:itemId')
  @ApiOperation({ summary: 'Delete section item from a dynamic section type' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'sectionTypeKey', description: 'Section type key' })
  @ApiParam({ name: 'itemId', description: 'Section item ID' })
  @ApiDataResponse(ResumeSectionDeleteDataDto, {
    description: 'Section item deleted',
  })
  async deleteItem(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('sectionTypeKey') sectionTypeKey: string,
    @Param('itemId', ParseCuidPipe) itemId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<ResumeSectionDeleteDataDto>> {
    await this.sectionsService.deleteItem(resumeId, sectionTypeKey, itemId, user.userId);

    return {
      success: true,
      data: {
        deleted: true,
      },
      message: 'Section item deleted',
    };
  }
}
