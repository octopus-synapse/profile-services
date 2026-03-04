import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  ShareCreateDataDto,
  ShareDeleteDataDto,
  ShareListDataDto,
} from '../dto/share-management-response.dto';
import { ResumeShareService } from '../services/resume-share.service';

interface CreateShare {
  resumeId: string;
  slug?: string;
  password?: string;
  expiresAt?: string;
}

@SdkExport({ tag: 'resumes', description: 'Share Management API' })
@ApiTags('shares')
@Controller('v1/shares')
@UseGuards(JwtAuthGuard)
export class ShareManagementController {
  constructor(private readonly shareService: ResumeShareService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create share link for a resume' })
  @ApiDataResponse(ShareCreateDataDto, {
    status: 201,
    description: 'Share created successfully',
  })
  async createShare(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateShare,
  ): Promise<DataResponse<ShareCreateDataDto>> {
    // Verify user owns the resume
    const share = await this.shareService.createShare(user.userId, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    return {
      success: true,
      data: {
        share: {
          id: share.id,
          slug: share.slug,
          resumeId: share.resumeId,
          isActive: share.isActive,
          hasPassword: !!share.password,
          expiresAt: share.expiresAt,
          createdAt: share.createdAt,
          publicUrl: `/api/v1/public/resumes/${share.slug}`,
        },
      },
    };
  }

  @Get('resume/:resumeId')
  @ApiOperation({ summary: 'List share links for a resume' })
  @ApiDataResponse(ShareListDataDto, { description: 'Resume shares returned' })
  async listResumeShares(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<ShareListDataDto>> {
    const shares = await this.shareService.listUserShares(user.userId, resumeId);

    return {
      success: true,
      data: {
        shares: shares.map((share) => ({
          id: share.id,
          slug: share.slug,
          resumeId: share.resumeId,
          isActive: share.isActive,
          hasPassword: !!share.password,
          expiresAt: share.expiresAt,
          createdAt: share.createdAt,
          publicUrl: `/api/v1/public/resumes/${share.slug}`,
        })),
      },
    };
  }

  @Delete(':shareId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a share link' })
  @ApiDataResponse(ShareDeleteDataDto, {
    description: 'Share deleted successfully',
  })
  async deleteShare(
    @Param('shareId') shareId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<ShareDeleteDataDto>> {
    await this.shareService.deleteShare(user.userId, shareId);

    return {
      success: true,
      message: 'Share deleted successfully',
      data: { deleted: true },
    };
  }
}
