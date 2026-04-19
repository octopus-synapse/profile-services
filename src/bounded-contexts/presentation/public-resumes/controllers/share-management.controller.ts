import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
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
  type AliasPayload,
  type SharePayload,
  toAliasPayload,
  toAliasPayloadList,
  toSharePayload,
  toSharePayloadList,
} from '../presenters/share-management.presenter';
import { QrCodeService } from '../services/qr-code.service';
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
  constructor(
    private readonly shareService: ResumeShareService,
    private readonly qrCodeService: QrCodeService,
    private readonly configService: ConfigService,
  ) {}

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

  @Post(':shareId/aliases')
  @RequirePermission(Permission.RESUME_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a slug alias to a share' })
  async addAlias(
    @CurrentUser() user: UserPayload,
    @Param('shareId') shareId: string,
    @Body() dto: { slug: string },
  ): Promise<DataResponse<{ alias: AliasPayload }>> {
    const alias = await this.shareService.addAlias(user.userId, shareId, dto.slug);
    return {
      success: true,
      data: { alias: toAliasPayload(alias) },
    };
  }

  @Get(':shareId/aliases')
  @RequirePermission(Permission.RESUME_READ)
  @ApiOperation({ summary: 'List slug aliases for a share' })
  async listAliases(
    @CurrentUser() user: UserPayload,
    @Param('shareId') shareId: string,
  ): Promise<DataResponse<{ aliases: AliasPayload[] }>> {
    const aliases = await this.shareService.listAliases(user.userId, shareId);
    return {
      success: true,
      data: { aliases: toAliasPayloadList(aliases) },
    };
  }

  @Get(':shareId/qr.png')
  @RequirePermission(Permission.RESUME_READ)
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: 'Render a QR code PNG pointing to the share public URL' })
  @ApiProduces('image/png')
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Pixel size (default 256)',
  })
  async getQrCodePng(
    @CurrentUser() user: UserPayload,
    @Param('shareId') shareId: string,
    @Query('size') sizeParam?: string,
  ): Promise<StreamableFile> {
    const share = await this.shareService.getShareWithOwner(shareId);
    if (!share) throw new NotFoundException('Share not found');
    if (share.resume.userId !== user.userId)
      throw new ForbiddenException('You do not have access to this share');

    const size = sizeParam
      ? Math.min(1024, Math.max(64, Number.parseInt(sizeParam, 10) || 256))
      : 256;
    const baseUrl = this.configService.get<string>('PUBLIC_APP_URL') ?? 'https://patchcareers.com';
    const targetUrl = `${baseUrl.replace(/\/$/, '')}/u/${share.slug}`;

    const buffer = await this.qrCodeService.generatePng(targetUrl, { size });
    return new StreamableFile(buffer);
  }

  @Delete('aliases/:aliasId')
  @RequirePermission(Permission.RESUME_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a slug alias' })
  async removeAlias(
    @CurrentUser() user: UserPayload,
    @Param('aliasId') aliasId: string,
  ): Promise<DataResponse<{ deleted: boolean }>> {
    await this.shareService.removeAlias(user.userId, aliasId);
    return {
      success: true,
      message: 'Alias deleted successfully',
      data: { deleted: true },
    };
  }
}
