import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ParseCuidPipe } from '@/bounded-contexts/platform/common/pipes/parse-cuid.pipe';
import { ParseJsonBodyPipe } from '@/bounded-contexts/platform/common/pipes/parse-json-body.pipe';
import type { CreateResume, UpdateResume } from '@/shared-kernel';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  CreateResumeRequestDto,
  DeleteResponseDto,
  PaginatedResumesDataDto,
  ResumeFullResponseDto,
  ResumeResponseDto,
  ResumeSlotsResponseDto,
  UpdateResumeRequestDto,
} from './dto/resumes.dto';
import { ResumesServicePort } from './ports/resumes-service.port';
import {
  toPaginatedResumesData,
  toResumeFullResponseDto,
  toResumeResponseDto,
} from './presenters/resumes.presenter';

@SdkExport({ tag: 'resumes', description: 'Resume CRUD operations' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesServicePort) {}

  @Get()
  @RequirePermission(Permission.RESUME_READ)
  @ApiOperation({ summary: 'Get all resumes for current user' })
  @ApiDataResponse(PaginatedResumesDataDto, { description: 'List of resumes' })
  async getAllUserResumes(
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<DataResponse<PaginatedResumesDataDto>> {
    const result = await this.resumesService.findAllUserResumes(user.userId, page, limit);
    const data = toPaginatedResumesData(result, { page: page ?? 1, limit: limit ?? 50 });
    return { success: true, data };
  }

  @Get('slots')
  @RequirePermission(Permission.RESUME_READ)
  @ApiOperation({ summary: 'Get remaining resume slots for current user' })
  @ApiDataResponse(ResumeSlotsResponseDto, { description: 'Resume slots info' })
  async getRemainingSlots(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<ResumeSlotsResponseDto>> {
    const result = await this.resumesService.getRemainingSlots(user.userId);
    return { success: true, data: result };
  }

  @Get(':id/full')
  @RequirePermission(Permission.RESUME_READ)
  @ApiOperation({ summary: 'Get a resume with all sections' })
  @ApiDataResponse(ResumeFullResponseDto, {
    description: 'Resume with all sections',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getResumeByIdWithAllSections(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<ResumeFullResponseDto>> {
    const result = await this.resumesService.findResumeByIdForUser(id, user.userId);
    return { success: true, data: toResumeFullResponseDto(result) };
  }

  @Get(':id')
  @RequirePermission(Permission.RESUME_READ)
  @ApiOperation({ summary: 'Get a specific resume' })
  @ApiDataResponse(ResumeFullResponseDto, { description: 'Resume found' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getResumeByIdForUser(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<ResumeFullResponseDto>> {
    const result = await this.resumesService.findResumeByIdForUser(id, user.userId);
    return { success: true, data: toResumeFullResponseDto(result) };
  }

  @Get(':id/thumbnail.svg')
  @RequirePermission(Permission.RESUME_READ)
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({
    summary: 'Lightweight SVG thumbnail of the resume (name + title + summary preview)',
  })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async getResumeThumbnail(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<string> {
    const result = await this.resumesService.findResumeByIdForUser(id, user.userId);
    const resume = (result as { resume?: Record<string, unknown> }).resume ?? result;
    const fullName =
      (resume as { fullName?: string | null; title?: string | null }).fullName ??
      (resume as { title?: string | null }).title ??
      'Currículo';
    const jobTitle = (resume as { jobTitle?: string | null }).jobTitle ?? '';
    const summary = (resume as { summary?: string | null }).summary ?? '';
    return renderResumeThumbnailSvg(String(fullName), String(jobTitle), String(summary));
  }

  @Post()
  @RequirePermission(Permission.RESUME_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiBody({ type: CreateResumeRequestDto })
  @ApiDataResponse(ResumeResponseDto, {
    status: 201,
    description: 'Resume created',
  })
  async createResumeForUser(
    @CurrentUser() user: UserPayload,
    @Body(ParseJsonBodyPipe) createResume: CreateResume,
  ): Promise<DataResponse<ResumeResponseDto>> {
    const result = await this.resumesService.createResumeForUser(user.userId, createResume);
    return { success: true, data: toResumeResponseDto(result) };
  }

  @Patch(':id')
  @RequirePermission(Permission.RESUME_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a resume' })
  @ApiBody({ type: UpdateResumeRequestDto })
  @ApiDataResponse(ResumeResponseDto, { description: 'Resume updated' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async updateResumeForUser(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() updateResume: UpdateResume,
  ): Promise<DataResponse<ResumeResponseDto>> {
    const result = await this.resumesService.updateResumeForUser(id, user.userId, updateResume);
    return { success: true, data: toResumeResponseDto(result) };
  }

  @Delete(':id')
  @RequirePermission(Permission.RESUME_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiDataResponse(DeleteResponseDto, { description: 'Resume deleted' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  async deleteResumeForUser(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<DeleteResponseDto>> {
    await this.resumesService.deleteResumeForUser(id, user.userId);
    return { success: true, data: { deleted: true, id } };
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function renderResumeThumbnailSvg(fullName: string, jobTitle: string, summary: string): string {
  const name = escapeXml(truncate(fullName, 40));
  const title = escapeXml(truncate(jobTitle, 50));
  const s = escapeXml(truncate(summary, 160));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420">
  <rect width="320" height="420" rx="12" fill="#ffffff" stroke="#e5e7eb"/>
  <rect x="0" y="0" width="320" height="90" fill="#0f172a"/>
  <circle cx="50" cy="45" r="22" fill="#06b6d4" opacity="0.25"/>
  <text x="80" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#f8fafc">${name}</text>
  <text x="80" y="62" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#cbd5e1">${title}</text>
  <rect x="20" y="110" width="280" height="8" rx="2" fill="#e5e7eb"/>
  <rect x="20" y="128" width="240" height="8" rx="2" fill="#e5e7eb"/>
  <rect x="20" y="146" width="260" height="8" rx="2" fill="#e5e7eb"/>
  <foreignObject x="20" y="170" width="280" height="140">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 10px; color: #475569; line-height: 1.5;">${s}</div>
  </foreignObject>
  <rect x="20" y="330" width="80" height="10" rx="5" fill="#ecfeff"/>
  <rect x="108" y="330" width="70" height="10" rx="5" fill="#ecfeff"/>
  <rect x="186" y="330" width="90" height="10" rx="5" fill="#ecfeff"/>
  <rect x="20" y="350" width="60" height="10" rx="5" fill="#ecfeff"/>
  <text x="160" y="400" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="600" fill="#67e8f9" text-anchor="middle" letter-spacing="1">patch.careers</text>
</svg>`;
}
