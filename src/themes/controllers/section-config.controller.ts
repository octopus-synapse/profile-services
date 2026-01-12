/**
 * Section Config Controller
 * Handles section/item visibility and ordering
 */

import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SectionVisibilityService, SectionOrderingService } from '../services';

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
  toggleSection(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SectionToggle,
  ) {
    return this.visibility.toggleSection(
      userId,
      resumeId,
      sectionId,
      dto.visible,
    );
  }

  @Post('sections/:sectionId/order')
  @ApiOperation({ summary: 'Reorder section' })
  reorderSection(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SectionReorder,
  ) {
    return this.ordering.reorderSection(userId, resumeId, sectionId, dto.order);
  }

  @Post('sections/:sectionId/items/visibility')
  @ApiOperation({ summary: 'Toggle item visibility' })
  toggleItem(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SectionItem,
  ) {
    return this.visibility.toggleItem(
      userId,
      resumeId,
      sectionId,
      dto.itemId,
      dto.visible ?? true,
    );
  }

  @Post('sections/:sectionId/items/order')
  @ApiOperation({ summary: 'Reorder item' })
  reorderItem(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: SectionItem,
  ) {
    return this.ordering.reorderItem(
      userId,
      resumeId,
      sectionId,
      dto.itemId,
      dto.order ?? 0,
    );
  }

  @Post('sections/batch')
  @ApiOperation({ summary: 'Batch update sections' })
  batchUpdate(
    @CurrentUser('userId') userId: string,
    @Param('resumeId') resumeId: string,
    @Body() dto: SectionBatch,
  ) {
    return this.ordering.batchUpdate(userId, resumeId, dto.sections);
  }
}
