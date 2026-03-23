import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
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
  DeleteResponseDto,
  ResumeFullResponseDto,
  ResumeListItemDto,
  ResumeResponseDto,
  ResumeSlotsResponseDto,
} from '@/shared-kernel/dtos/sdk-response.dto';
import {
  type ResumeResult,
  ResumesServicePort,
  type UserResumesPaginatedResult,
} from './ports/resumes-service.port';

// DTO for paginated resumes response data
class PaginatedResumesDataDto {
  data!: ResumeListItemDto[];
  meta!: { total: number; page: number; limit: number; totalPages: number };
}

class CreateResumeRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  title!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  summary?: string;

  @ApiPropertyOptional()
  template?: string;

  @ApiPropertyOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ maxLength: 100 })
  fullName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  jobTitle?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  phone?: string;

  @ApiPropertyOptional({ format: 'email' })
  emailContact?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  location?: string;

  @ApiPropertyOptional({ format: 'uri' })
  linkedin?: string;

  @ApiPropertyOptional({ format: 'uri' })
  github?: string;

  @ApiPropertyOptional({ format: 'uri' })
  website?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  sections?: Array<Record<string, unknown>>;
}

class UpdateResumeRequestDto extends PartialType(CreateResumeRequestDto) {}

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

    if (this.isPaginatedResult(result)) {
      return {
        success: true,
        data: {
          data: result.resumes.map((resume) => this.toResumeListItemDto(resume)),
          meta: {
            total: result.pagination.total,
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages,
          },
        },
      };
    }

    return {
      success: true,
      data: {
        data: result.map((resume) => this.toResumeListItemDto(resume)),
        meta: {
          total: result.length,
          page: page ?? 1,
          limit: limit ?? 50,
          totalPages: 1,
        },
      },
    };
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
    return { success: true, data: this.toResumeFullResponseDto(result) };
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
    return { success: true, data: this.toResumeFullResponseDto(result) };
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
    return { success: true, data: this.toResumeResponseDto(result) };
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
    return { success: true, data: this.toResumeResponseDto(result) };
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
    return { success: true, data: { success: true } };
  }

  private isPaginatedResult(
    result: ResumeResult[] | UserResumesPaginatedResult,
  ): result is UserResumesPaginatedResult {
    return 'resumes' in result && 'pagination' in result;
  }

  private toResumeResponseDto(resume: ResumeResult): ResumeResponseDto {
    return {
      id: resume.id,
      title: resume.title ?? '',
      language: resume.language ?? undefined,
      targetRole: resume.targetRole ?? undefined,
      isPublic: resume.isPublic ?? false,
      slug: resume.slug ?? undefined,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    };
  }

  private toResumeListItemDto(resume: ResumeResult): ResumeListItemDto {
    return this.toResumeResponseDto(resume);
  }

  private toResumeFullResponseDto(resume: ResumeResult): ResumeFullResponseDto {
    return {
      ...this.toResumeResponseDto(resume),
      resumeSections: (resume.resumeSections ?? []).map((section) => ({
        id: section.id,
        order: section.order,
        sectionType: {
          id: section.sectionType.id,
          key: section.sectionType.key,
          semanticKind: section.sectionType.semanticKind ?? undefined,
          title: section.sectionType.title ?? undefined,
          version: section.sectionType.version ?? undefined,
        },
        items: section.items.map((item) => ({
          id: item.id,
          order: item.order,
          content: item.content ?? undefined,
        })),
      })),
      fullName: resume.fullName ?? undefined,
      email: resume.email ?? undefined,
      phone: resume.phone ?? undefined,
      location: resume.location ?? undefined,
      summary: resume.summary ?? undefined,
    };
  }
}
