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
