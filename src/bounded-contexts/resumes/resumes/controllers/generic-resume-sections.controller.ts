import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ParseCuidPipe } from '@/bounded-contexts/platform/common/pipes/parse-cuid.pipe';
import {
  ResumeSectionDeleteDataDto,
  ResumeSectionItemDataDto,
  ResumeSectionsDataDto,
  ResumeSectionTypesDataDto,
} from '../dto/generic-sections-response.dto';
import { GenericResumeSectionsService } from '../services/generic-resume-sections.service';

interface SectionItemPayload {
  content: Record<string, string | number | boolean | null>;
}

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/sections')
@UseGuards(JwtAuthGuard)
export class GenericResumeSectionsController {
  constructor(private readonly sectionsService: GenericResumeSectionsService) {}

  @Get('types')
  @ApiOperation({ summary: 'List active dynamic section types' })
  @ApiDataResponse(ResumeSectionTypesDataDto, {
    description: 'Section types list',
  })
  async listTypes(): Promise<DataResponse<ResumeSectionTypesDataDto>> {
    const sectionTypes = await this.sectionsService.listSectionTypes();

    return {
      success: true,
      data: {
        sectionTypes,
      },
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
    description: 'Section type key (e.g. work_experience_v1)',
  })
  @ApiDataResponse(ResumeSectionItemDataDto, {
    status: 201,
    description: 'Section item created',
  })
  async createItem(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('sectionTypeKey') sectionTypeKey: string,
    @CurrentUser() user: UserPayload,
    @Body() body: SectionItemPayload,
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
  @ApiDataResponse(ResumeSectionItemDataDto, {
    description: 'Section item updated',
  })
  async updateItem(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('sectionTypeKey') sectionTypeKey: string,
    @Param('itemId', ParseCuidPipe) itemId: string,
    @CurrentUser() user: UserPayload,
    @Body() body: SectionItemPayload,
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
