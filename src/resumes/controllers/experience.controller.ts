import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../auth/interfaces/auth-request.interface';
import { ExperienceService } from '../services/experience.service';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
  ExperienceResponseDto,
} from '../dto/experience.dto';
import { ReorderDto } from '../dto/reorder.dto';
import { ParseCuidPipe } from '../../common/pipes/parse-cuid.pipe';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/experiences')
@UseGuards(JwtAuthGuard)
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all experiences for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of experiences' })
  async findAll(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.experienceService.findAll(resumeId, user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific experience' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, type: ExperienceResponseDto })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async findOne(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.experienceService.findOne(resumeId, id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new experience' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, type: ExperienceResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() createDto: CreateExperienceDto,
  ) {
    return this.experienceService.create(resumeId, user.userId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an experience' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, type: ExperienceResponseDto })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async update(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() updateDto: UpdateExperienceDto,
  ) {
    return this.experienceService.update(resumeId, id, user.userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an experience' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, description: 'Experience deleted' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async remove(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.experienceService.remove(resumeId, id, user.userId);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder experiences' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Experiences reordered' })
  async reorder(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() reorderDto: ReorderDto,
  ) {
    return this.experienceService.reorder(
      resumeId,
      user.userId,
      reorderDto.ids,
    );
  }
}
