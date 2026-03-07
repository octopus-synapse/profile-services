/**
 * Theme Approval Controller
 *
 * Endpoints for theme approval workflow.
 * Protected by permission system - any role with 'theme:approve' can access.
 *
 * Single Responsibility: HTTP interface for theme approval operations.
 */

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { ThemeApproval } from '@/shared-kernel';
import { SubmitThemeRequestDto } from '@/shared-kernel/dtos/sdk-request.dto';
import { ThemeEntityDataDto, ThemeListDataDto } from '../dto/controller-response.dto';
import { ThemeApprovalService, ThemeCrudService } from '../services';

@SdkExport({ tag: 'themes', description: 'Themes API' })
@ApiTags('themes')
@Controller('v1/themes/approval')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class ThemeApprovalController {
  constructor(
    private approvalService: ThemeApprovalService,
    private crudService: ThemeCrudService,
  ) {}

  @Get('pending')
  @RequirePermission('theme', 'approve')
  @ApiOperation({ summary: 'Get pending themes for approval' })
  @ApiDataResponse(ThemeListDataDto, {
    description: 'Pending approval themes returned',
  })
  async getPending(@CurrentUser('userId') userId: string): Promise<DataResponse<ThemeListDataDto>> {
    const pending = await this.approvalService.getPendingApprovals(userId);

    return {
      success: true,
      data: {
        themes: pending,
      },
    };
  }

  @Post('review')
  @RequirePermission('theme', 'approve')
  @ApiOperation({ summary: 'Review and approve/reject a theme' })
  @ApiDataResponse(ThemeEntityDataDto, { description: 'Theme review applied' })
  async review(
    @CurrentUser('userId') userId: string,
    @Body() dto: ThemeApproval,
  ): Promise<DataResponse<ThemeEntityDataDto>> {
    const reviewed = await this.approvalService.review(userId, dto);

    return {
      success: true,
      data: {
        theme: reviewed,
      },
    };
  }

  @Post(':id/submit')
  @RequirePermission('theme', 'update')
  @ApiOperation({ summary: 'Submit a theme for approval' })
  @ApiBody({ type: SubmitThemeRequestDto })
  @ApiDataResponse(ThemeEntityDataDto, {
    description: 'Theme submitted for approval',
  })
  async submit(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<DataResponse<ThemeEntityDataDto>> {
    const submitted = await this.approvalService.submitForApproval(userId, id);

    return {
      success: true,
      data: {
        theme: submitted,
      },
    };
  }
}
