import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ShareCreateDataDto,
  ShareDeleteDataDto,
  ShareListDataDto,
} from '../dto/share-management-response.dto';
import {
  type SharePayload,
  toSharePayload,
  toSharePayloadList,
} from '../presenters/share-management.presenter';
import { ResumeShareService } from '../services/resume-share.service';

interface CreateShare {
  resumeId: string;
  slug?: string;
  password?: string;
  expiresAt?: string;
}

@SdkExport({ tag: 'resumes', description: 'Share Management API' })
@ApiTags('shares')
@ApiBearerAuth('JWT-auth')
@Controller('v1/shares')
export class ShareManagementController {
  constructor(private readonly shareService: ResumeShareService) {}

  @Post()
  @RequirePermission(Permission.RESUME_UPDATE)
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
    const share = await this.shareService.createShare(user.userId, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
    const sharePayload = toSharePayload(share);

    return {
      success: true,
      data: { share: sharePayload },
      ...sharePayload,
    } as DataResponse<ShareCreateDataDto> & SharePayload;
  }

  @Get('resume/:resumeId')
  @RequirePermission(Permission.RESUME_READ)
  @ApiOperation({ summary: 'List share links for a resume' })
  @ApiDataResponse(ShareListDataDto, { description: 'Resume shares returned' })
  async listResumeShares(
    @Param('resumeId') resumeId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<ShareListDataDto>> {
    const shares = await this.shareService.listUserShares(user.userId, resumeId);
    const sharePayloads = toSharePayloadList(shares);

    return {
      success: true,
      data: { shares: sharePayloads },
      shares: sharePayloads,
    } as DataResponse<ShareListDataDto> & { shares: SharePayload[] };
  }

  @Delete(':shareId')
  @RequirePermission(Permission.RESUME_UPDATE)
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
