/**
 * GDPR Controller
 * Issues #69 and #70: Data Export and Right to be Forgotten
 *
 * Endpoints for GDPR compliance:
 * - GET /api/v1/users/me/data-export - Export all user data
 * - DELETE /api/v1/users/me/account - Delete user account (self-service)
 */

import { Controller, Delete, Get, Header, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { SkipTosCheck } from '../decorators/skip-tos-check.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GdprDeletionService } from '../services/gdpr-deletion.service';
import { GdprExportService } from '../services/gdpr-export.service';

interface RequestWithUser {
  user: { userId: string; email: string };
  ip?: string;
  headers: { [key: string]: string | string[] | undefined };
}

class GdprExportResponseDto {
  @ApiProperty({ format: 'date-time' })
  exportedAt!: string;

  @ApiProperty()
  dataRetentionPolicy!: string;

  @ApiProperty({ description: 'User data' })
  user!: Record<string, string | number | boolean | null>;

  @ApiProperty({ description: 'User consents' })
  consents!: Record<string, string | number | boolean>[];

  @ApiProperty({ description: 'User resumes' })
  resumes!: Record<string, string | number | boolean>[];

  @ApiProperty({ description: 'Audit logs' })
  auditLogs!: Record<string, string | number | boolean>[];
}

class DeletedEntitiesDto {
  @ApiProperty()
  user!: boolean;

  @ApiProperty()
  resumes!: number;

  @ApiProperty()
  resumeSections!: number;

  @ApiProperty()
  sectionItems!: number;

  @ApiProperty()
  consents!: number;

  @ApiProperty()
  auditLogs!: number;

  @ApiProperty()
  resumeVersions!: number;

  @ApiProperty()
  resumeShares!: number;
}

class GdprDeletionResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ type: DeletedEntitiesDto })
  deletedEntities!: DeletedEntitiesDto;

  @ApiProperty({ format: 'date-time' })
  deletedAt!: string;
}

@SdkExport({ tag: 'gdpr', description: 'Gdpr API' })
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
  @ApiDataResponse(GdprExportResponseDto, {
    description: 'User data exported successfully',
  })
  async exportUserData(@Req() req: RequestWithUser): Promise<DataResponse<GdprExportResponseDto>> {
    const userId = req.user.userId;
    const data = await this.exportService.exportUserData(
      userId,
      req as unknown as import('express').Request,
    );

    // Log the download
    await this.exportService.logExportDownload(userId, req as unknown as import('express').Request);

    return { success: true, data: data as unknown as GdprExportResponseDto };
  }

  @Delete('account')
  @SkipTosCheck() // Allow deletion even if ToS not accepted
  @ApiOperation({
    summary: 'Delete user account (GDPR Right to be Forgotten)',
    description:
      'Permanently deletes the user account and all associated data as required by GDPR Article 17. This action is irreversible.',
  })
  @ApiDataResponse(GdprDeletionResponseDto, {
    description: 'Account deleted successfully',
  })
  async deleteAccount(@Req() req: RequestWithUser): Promise<DataResponse<GdprDeletionResponseDto>> {
    const userId = req.user.userId;
    const result = await this.deletionService.requestSelfDeletion(
      userId,
      req as unknown as import('express').Request,
    );
    return { success: true, data: result };
  }
}
