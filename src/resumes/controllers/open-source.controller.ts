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
import { OpenSourceService } from '../services/open-source.service';
import {
  CreateOpenSourceDto,
  UpdateOpenSourceDto,
  OpenSourceResponseDto,
} from '../dto/open-source.dto';
import { ReorderDto } from '../dto/reorder.dto';
import { ParseCuidPipe } from '../../common/pipes/parse-cuid.pipe';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes/:resumeId/open-source')
@UseGuards(JwtAuthGuard)
export class OpenSourceController {
  constructor(private readonly openSourceService: OpenSourceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all open source contributions for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of open source contributions',
  })
  async findAll(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.openSourceService.findAll(resumeId, user.userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific open source contribution' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Open Source Contribution ID' })
  @ApiResponse({ status: 200, type: OpenSourceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Open source contribution not found',
  })
  async findOne(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.openSourceService.findOne(resumeId, id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new open source contribution' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, type: OpenSourceResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() createDto: CreateOpenSourceDto,
  ) {
    return this.openSourceService.create(resumeId, user.userId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an open source contribution' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Open Source Contribution ID' })
  @ApiResponse({ status: 200, type: OpenSourceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Open source contribution not found',
  })
  async update(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() updateDto: UpdateOpenSourceDto,
  ) {
    return this.openSourceService.update(resumeId, id, user.userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an open source contribution' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'id', description: 'Open Source Contribution ID' })
  @ApiResponse({ status: 200, description: 'Open source contribution deleted' })
  @ApiResponse({
    status: 404,
    description: 'Open source contribution not found',
  })
  async remove(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.openSourceService.remove(resumeId, id, user.userId);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder open source contributions' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({
    status: 200,
    description: 'Open source contributions reordered',
  })
  async reorder(
    @Param('resumeId', ParseCuidPipe) resumeId: string,
    @CurrentUser() user: UserPayload,
    @Body() reorderDto: ReorderDto,
  ) {
    return this.openSourceService.reorder(
      resumeId,
      user.userId,
      reorderDto.ids,
    );
  }
}
