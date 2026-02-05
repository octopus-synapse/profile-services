import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResumeSkillResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { SkillService } from '../services/skill.service';
import type {
  CreateSkill,
  UpdateSkill,
  BulkCreateSkills,
} from '@/shared-kernel';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import type { Skill } from '@prisma/client';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { ParseCuidPipe } from '@/bounded-contexts/platform/common/pipes/parse-cuid.pipe';

@SdkExport({ tag: 'resumes', description: 'Resumes API' })
@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/skills')
@UseGuards(JwtAuthGuard)
export class SkillController extends BaseSubResourceController<
  Skill,
  CreateSkill,
  UpdateSkill,
  Skill
> {
  protected readonly config: SubResourceControllerConfig<
    Skill,
    CreateSkill,
    UpdateSkill,
    Skill
  > = {
    entityName: 'skill',
    entityPluralName: 'skills',
  };

  constructor(private readonly skillService: SkillService) {
    super(skillService);
  }

  // Custom findAll with category filter (not overriding base listAll)
  @Get()
  @ApiOperation({ summary: 'Get all skills for a resume' })
  @ApiResponse({ status: 200, type: [ResumeSkillResponseDto] })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of skills' })
  async findAllSkillsForResume(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('category') category?: string,
  ) {
    return this.skillService.findAllSkillsForResume(
      resumeId,
      user.userId,
      page,
      limit,
      category,
    );
  }

  // Additional method: bulk create skills
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create multiple skills at once' })
  @ApiResponse({ status: 201, type: [ResumeSkillResponseDto] })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, description: 'Skills created' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async createBulk(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() bulkDto: BulkCreateSkills,
  ) {
    return this.skillService.createMany(resumeId, user.userId, bulkDto);
  }
}
