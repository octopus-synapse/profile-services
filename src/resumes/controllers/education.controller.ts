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
import { EducationService } from '../services/education.service';
import {
  CreateEducationDto,
  UpdateEducationDto,
  EducationResponseDto,
} from '../dto/education.dto';
import { ReorderDto } from '../dto/reorder.dto';
import { ParseCuidPipe } from '../../common/pipes/parse-cuid.pipe';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/education')
@UseGuards(JwtAuthGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all education entries for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of education entries' })
  async findAll(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.educationService.findAll(resumeId, user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific education entry' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, type: EducationResponseDto })
  @ApiResponse({ status: 404, description: 'Education not found' })
  async findOne(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.educationService.findOne(resumeId, id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new education entry' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, type: EducationResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() createDto: CreateEducationDto,
  ) {
    return this.educationService.create(resumeId, user.userId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an education entry' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, type: EducationResponseDto })
  @ApiResponse({ status: 404, description: 'Education not found' })
  async update(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() updateDto: UpdateEducationDto,
  ) {
    return this.educationService.update(resumeId, id, user.userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an education entry' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, description: 'Education deleted' })
  @ApiResponse({ status: 404, description: 'Education not found' })
  async remove(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.educationService.remove(resumeId, id, user.userId);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder education entries' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Education entries reordered' })
  async reorder(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() reorderDto: ReorderDto,
  ) {
    return this.educationService.reorder(resumeId, user.userId, reorderDto.ids);
  }
}
