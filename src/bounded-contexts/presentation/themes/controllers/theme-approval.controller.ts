/**
 * Theme Approval Controller
 *
 * Endpoints for theme approval workflow.
 * Protected by permission system - any role with 'theme:approve' can access.
 *
 * Single Responsibility: HTTP interface for theme approval operations.
 */

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '@/bounded-contexts/identity/authorization';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { ReviewTheme } from '@/shared-kernel';
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
  getPending(@CurrentUser('userId') userId: string) {
    return this.approvalService.getPendingApprovals(userId);
  }

  @Post('review')
  @RequirePermission('theme', 'approve')
  @ApiOperation({ summary: 'Review and approve/reject a theme' })
  review(@CurrentUser('userId') userId: string, @Body() dto: ReviewTheme) {
    return this.approvalService.review(userId, dto);
  }

  @Post(':id/submit')
  @RequirePermission('theme', 'update')
  @ApiOperation({ summary: 'Submit a theme for approval' })
  submit(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.approvalService.submitForApproval(userId, id);
  }
}
