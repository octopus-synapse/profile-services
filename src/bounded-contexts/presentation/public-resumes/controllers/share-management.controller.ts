import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ResumeShareAccessDeniedException,
  ShareNotFoundException,
} from '../../domain/exceptions/presentation.exceptions';
import { QrCodeService } from '../services/qr-code.service';
import { ResumeShareService } from '../services/resume-share.service';

const QrSizeSchema = z.object({ size: z.coerce.number().int().min(64).max(1024).default(256) });

/**
 * Legacy controller for the share QR-code PNG endpoint. Kept as a Nest
 * `@Controller` because the synthesizer does not yet model
 * `StreamableFile` responses or the `@Header()` decorators required to
 * set `Content-Type` / `Cache-Control` for binary assets.
 */
@ApiTags('shares')
@ApiBearerAuth('JWT-auth')
@Controller('v1/shares')
export class ShareManagementController {
  constructor(
    private readonly shareService: ResumeShareService,
    private readonly qrCodeService: QrCodeService,
    private readonly configService: ConfigService,
  ) {}

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
    if (!share) throw new ShareNotFoundException();
    if (share.resume.userId !== user.userId) throw new ResumeShareAccessDeniedException();

    const baseUrl = this.configService.get<string>('PUBLIC_APP_URL') ?? 'https://patchcareers.com';
    const targetUrl = `${baseUrl.replace(/\/$/, '')}/u/${share.slug}`;

    const buffer = await this.qrCodeService.generatePng(targetUrl, { size: q.size });
    return new StreamableFile(buffer);
  }
}
