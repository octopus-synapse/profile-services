/**
 * Admin/Approver Theme Routes
 * Requires APPROVER or ADMIN role
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ThemeApprovalService, ThemeCrudService } from '../services';
import { ReviewThemeDto } from '../dto';

@ApiTags('themes-admin')
@Controller('v1/themes/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.APPROVER, UserRole.ADMIN)
@ApiBearerAuth()
export class AdminThemeController {
  constructor(
    private approvalService: ThemeApprovalService,
    private crudService: ThemeCrudService,
  ) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get pending themes' })
  getPending(@CurrentUser('userId') userId: string) {
    return this.approvalService.getPendingApprovals(userId);
  }

  @Post('review')
  @ApiOperation({ summary: 'Review theme' })
  review(@CurrentUser('userId') userId: string, @Body() dto: ReviewThemeDto) {
    return this.approvalService.review(userId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit theme for approval' })
  @Roles(UserRole.USER, UserRole.APPROVER, UserRole.ADMIN) // Any authenticated user
  submit(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.approvalService.submitForApproval(userId, id);
  }
}
