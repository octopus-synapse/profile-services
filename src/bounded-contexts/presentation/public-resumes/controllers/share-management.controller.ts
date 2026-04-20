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
import { z } from 'zod';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ShareCreateDataDto,
  ShareDeleteDataDto,
  ShareListDataDto,
} from '../dto/share-management-response.dto';
import {
  type AliasPayload,
  toAliasPayload,
  toAliasPayloadList,
  toSharePayload,
  toSharePayloadList,
} from '../presenters/share-management.presenter';
import { QrCodeService } from '../services/qr-code.service';
import { ResumeShareService } from '../services/resume-share.service';

const CreateShareSchema = z.object({
  resumeId: z.string().min(1),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/, 'Slug must be alphanumeric with hyphens')
    .optional(),
  password: z.string().min(4).max(200).optional(),
  expiresAt: z.coerce.date().optional(),
});

const AddAliasSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
});

const QrSizeSchema = z.object({
  size: z.coerce.number().int().min(64).max(1024).default(256),
});

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
    @Body(createZodPipe(CreateShareSchema)) dto: z.infer<typeof CreateShareSchema>,
  ): Promise<DataResponse<ShareCreateDataDto>> {
    const share = await this.shareService.createShare(user.userId, dto);
    return {
      success: true,
      data: { share: toSharePayload(share) },
    };
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
    return {
      success: true,
      data: { shares: toSharePayloadList(shares) },
    };
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
    @Body(createZodPipe(AddAliasSchema)) dto: z.infer<typeof AddAliasSchema>,
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
    @Query(createZodPipe(QrSizeSchema)) q: z.infer<typeof QrSizeSchema>,
  ): Promise<StreamableFile> {
    const share = await this.shareService.getShareWithOwner(shareId);
    if (!share) throw new NotFoundException('Share not found');
    if (share.resume.userId !== user.userId)
      throw new ForbiddenException('You do not have access to this share');

    const baseUrl = this.configService.get<string>('PUBLIC_APP_URL') ?? 'https://patchcareers.com';
    const targetUrl = `${baseUrl.replace(/\/$/, '')}/u/${share.slug}`;

    const buffer = await this.qrCodeService.generatePng(targetUrl, { size: q.size });
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
