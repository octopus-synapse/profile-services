import {
  Controller,
  UseGuards,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SkillService } from '../services/skill.service';
import {
  CreateSkillDto,
  UpdateSkillDto,
  SkillResponseDto,
  BulkCreateSkillsDto,
} from '../dto/skill.dto';
import {
  BaseSubResourceController,
  SubResourceControllerConfig,
} from './base/base-sub-resource.controller';
import { Skill } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../auth/interfaces/auth-request.interface';
import { ParseCuidPipe } from '../../common/pipes/parse-cuid.pipe';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes/:resumeId/skills')
@UseGuards(JwtAuthGuard)
export class SkillController extends BaseSubResourceController<
  Skill,
  CreateSkillDto,
  UpdateSkillDto,
  SkillResponseDto
> {
  protected readonly config: SubResourceControllerConfig<
    Skill,
    CreateSkillDto,
    UpdateSkillDto,
    SkillResponseDto
  > = {
    entityName: 'skill',
    entityPluralName: 'skills',
    responseDtoClass: SkillResponseDto,
    createDtoClass: CreateSkillDto,
    updateDtoClass: UpdateSkillDto,
  };

  constructor(private readonly skillService: SkillService) {
    super(skillService);
  }

  // Custom findAll with category filter (not overriding base listAll)
  @Get()
  @ApiOperation({ summary: 'Get all skills for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of skills' })
  async findAll(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('category') category?: string,
  ) {
    return this.skillService.findAll(
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
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, description: 'Skills created' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async createBulk(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() bulkDto: BulkCreateSkillsDto,
  ) {
    return this.skillService.createMany(resumeId, user.userId, bulkDto);
  }
}
