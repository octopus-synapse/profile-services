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
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { ResumeShareService } from '../services/resume-share.service';

interface CreateShare {
  resumeId: string;
  slug?: string;
  password?: string;
  expiresAt?: string;
}

@Controller('v1/shares')
@UseGuards(JwtAuthGuard)
export class ShareManagementController {
  constructor(private readonly shareService: ResumeShareService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createShare(@Body() dto: CreateShare) {
    // Verify user owns the resume
    const share = await this.shareService.createShare({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    return {
      id: share.id,
      slug: share.slug,
      resumeId: share.resumeId,
      isActive: share.isActive,
      hasPassword: !!share.password,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
      publicUrl: `/api/v1/public/resumes/${share.slug}`,
    };
  }

  @Get('resume/:resumeId')
  async listResumeShares(@Param('resumeId') resumeId: string) {
    const shares = await this.shareService.listUserShares(resumeId);

    return shares.map((share) => ({
      id: share.id,
      slug: share.slug,
      resumeId: share.resumeId,
      isActive: share.isActive,
      hasPassword: !!share.password,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
      publicUrl: `/api/v1/public/resumes/${share.slug}`,
    }));
  }

  @Delete(':shareId')
  @HttpCode(HttpStatus.OK)
  async deleteShare(@Param('shareId') shareId: string) {
    await this.shareService.deleteShare(shareId);
    return { message: 'Share deleted successfully' };
  }
}
