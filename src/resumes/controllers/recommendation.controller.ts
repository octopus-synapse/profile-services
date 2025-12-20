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
import { RecommendationService } from '../services/recommendation.service';
import {
  CreateRecommendationDto,
  UpdateRecommendationDto,
  RecommendationResponseDto,
} from '../dto/recommendation.dto';
import { ReorderDto } from '../dto/reorder.dto';
import { ParseCuidPipe } from '../../common/pipes/parse-cuid.pipe';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all recommendations for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of recommendations' })
  async findAll(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.recommendationService.findAll(
      resumeId,
      user.userId,
      page,
      limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific recommendation' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({ status: 200, type: RecommendationResponseDto })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  async findOne(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.recommendationService.findOne(resumeId, id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new recommendation' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, type: RecommendationResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() createDto: CreateRecommendationDto,
  ) {
    return this.recommendationService.create(resumeId, user.userId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recommendation' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({ status: 200, type: RecommendationResponseDto })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  async update(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() updateDto: UpdateRecommendationDto,
  ) {
    return this.recommendationService.update(
      resumeId,
      id,
      user.userId,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a recommendation' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({ status: 200, description: 'Recommendation deleted' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  async remove(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.recommendationService.remove(resumeId, id, user.userId);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder recommendations' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Recommendations reordered' })
  async reorder(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() reorderDto: ReorderDto,
  ) {
    return this.recommendationService.reorder(
      resumeId,
      user.userId,
      reorderDto.ids,
    );
  }
}
