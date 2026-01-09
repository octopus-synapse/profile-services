/**
 * GDPR Controller
 * Issues #69 and #70: Data Export and Right to be Forgotten
 *
 * Endpoints for GDPR compliance:
 * - GET /api/v1/users/me/data-export - Export all user data
 * - DELETE /api/v1/users/me/account - Delete user account (self-service)
 */

import {
  Controller,
  Get,
  Delete,
  Req,
  HttpStatus,
  UseGuards,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SkipTosCheck } from '../decorators/skip-tos-check.decorator';
import { GdprExportService } from '../services/gdpr-export.service';
import { GdprDeletionService } from '../services/gdpr-deletion.service';

interface RequestWithUser {
  user: { id: string };
  ip?: string;
  headers: { [key: string]: string | string[] | undefined };
}

@ApiTags('GDPR')
@Controller('users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GdprController {
  constructor(
    private readonly exportService: GdprExportService,
    private readonly deletionService: GdprDeletionService,
  ) {}

  @Get('data-export')
  @SkipTosCheck() // Allow export even if ToS not accepted
  @Header('Content-Type', 'application/json')
  @ApiOperation({
    summary: 'Export all user data (GDPR Right to Access)',
    description:
      'Downloads all user data in machine-readable JSON format as required by GDPR Article 20.',
  })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            exportedAt: { type: 'string', format: 'date-time' },
            dataRetentionPolicy: { type: 'string' },
            user: { type: 'object' },
            consents: { type: 'array' },
            resumes: { type: 'array' },
            auditLogs: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportUserData(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const data = await this.exportService.exportUserData(
      userId,
      req as unknown as import('express').Request,
    );

    // Log the download
    await this.exportService.logExportDownload(
      userId,
      req as unknown as import('express').Request,
    );

    return data;
  }

  @Delete('account')
  @SkipTosCheck() // Allow deletion even if ToS not accepted
  @ApiOperation({
    summary: 'Delete user account (GDPR Right to be Forgotten)',
    description:
      'Permanently deletes the user account and all associated data as required by GDPR Article 17. This action is irreversible.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        deletedEntities: {
          type: 'object',
          properties: {
            user: { type: 'boolean' },
            resumes: { type: 'number' },
            experiences: { type: 'number' },
            educations: { type: 'number' },
            skills: { type: 'number' },
            projects: { type: 'number' },
            certifications: { type: 'number' },
            languages: { type: 'number' },
            githubContributions: { type: 'number' },
            consents: { type: 'number' },
            auditLogs: { type: 'number' },
          },
        },
        deletedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot delete last admin account' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.deletionService.requestSelfDeletion(
      userId,
      req as unknown as import('express').Request,
    );
  }
}
