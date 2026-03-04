/**
 * Section Config Controller
 * Handles section/item visibility and ordering
 */

import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ResumeConfigOperationDataDto } from '../dto/controller-response.dto';
import { SectionOrderingService, SectionVisibilityService } from '../services';

class SectionToggle {
  visible: boolean;
}
class SectionReorder {
  order: number;
}
class SectionItem {
  itemId: string;
  visible?: boolean;
  order?: number;
}
class SectionBatch {
  sections: Array<{ id: string; visible?: boolean; order?: number }>;
}

@SdkExport({ tag: 'resume-config', description: 'Resume Config API' })
@ApiTags('resume-config')
@Controller('v1/resumes/:resumeId/config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SectionConfigController {
  constructor(
    private visibility: SectionVisibilityService,
    private ordering: SectionOrderingService,
  ) {}

  @Post('sections/:sectionId/visibility')
  @ApiOperation({ summary: 'Toggle section visibility' })
  @ApiDataResponse(ResumeConfigOperationDataDto, {
    description: 'Section visibility updated',
  })
  async toggleSection(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SectionToggle,
  ): Promise<DataResponse<ResumeConfigOperationDataDto>> {
    await this.visibility.toggleSection(userId, resumeId, sectionId, dto.visible);
    return { success: true, data: { success: true } };
  }

  @Post('sections/:sectionId/order')
  @ApiOperation({ summary: 'Reorder section' })
  @ApiDataResponse(ResumeConfigOperationDataDto, {
    description: 'Section order updated',
  })
  async reorderSection(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SectionReorder,
  ): Promise<DataResponse<ResumeConfigOperationDataDto>> {
    await this.ordering.reorderSection(userId, resumeId, sectionId, dto.order);
    return { success: true, data: { success: true } };
  }

  @Post('sections/:sectionId/items/visibility')
  @ApiOperation({ summary: 'Toggle item visibility' })
  @ApiDataResponse(ResumeConfigOperationDataDto, {
    description: 'Section item visibility updated',
  })
  async toggleItem(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SectionItem,
  ): Promise<DataResponse<ResumeConfigOperationDataDto>> {
    await this.visibility.toggleItem(userId, resumeId, sectionId, dto.itemId, dto.visible ?? true);
    return { success: true, data: { success: true } };
  }

  @Post('sections/:sectionId/items/order')
  @ApiOperation({ summary: 'Reorder item' })
  @ApiDataResponse(ResumeConfigOperationDataDto, {
    description: 'Section item order updated',
  })
  async reorderItem(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SectionItem,
  ): Promise<DataResponse<ResumeConfigOperationDataDto>> {
    await this.ordering.reorderItem(userId, resumeId, sectionId, dto.itemId, dto.order ?? 0);
    return { success: true, data: { success: true } };
  }

  @Post('sections/batch')
  @ApiOperation({ summary: 'Batch update sections' })
  @ApiDataResponse(ResumeConfigOperationDataDto, {
    description: 'Batch section update applied',
  })
  async batchUpdate(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Body() dto: SectionBatch,
  ): Promise<DataResponse<ResumeConfigOperationDataDto>> {
    await this.ordering.batchUpdate(userId, resumeId, dto.sections);
    return { success: true, data: { success: true } };
  }
}
