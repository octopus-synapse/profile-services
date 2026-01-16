/**
 * Theme Approval Controller
 *
 * Endpoints for theme approval workflow.
 * Protected by permission system - any role with 'theme:approve' can access.
 *
 * Single Responsibility: HTTP interface for theme approval operations.
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard, RequirePermission } from '../../authorization';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ThemeApprovalService, ThemeCrudService } from '../services';
import type { ReviewTheme } from '@octopus-synapse/profile-contracts';

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
