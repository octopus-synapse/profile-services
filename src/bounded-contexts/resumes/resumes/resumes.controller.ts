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
import { ResumesService } from './resumes.service';
import type {
  CreateResume,
  UpdateResume,
} from '@octopus-synapse/profile-contracts';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { ParseCuidPipe } from '@/bounded-contexts/platform/common/pipes/parse-cuid.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('v1/resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all resumes for current user' })
  @ApiResponse({ status: 200, description: 'List of resumes' })
  async getAllUserResumes(
    @CurrentUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.resumesService.findAllUserResumes(user.userId, page, limit);
  }

  @Get('slots')
  @ApiOperation({ summary: 'Get remaining resume slots for current user' })
  @ApiResponse({
    status: 200,
    description: 'Resume slots info',
    schema: {
      type: 'object',
      properties: {
        used: { type: 'number', example: 2 },
        limit: { type: 'number', example: 4 },
        remaining: { type: 'number', example: 2 },
      },
    },
  })
  async getRemainingSlots(@CurrentUser() user: UserPayload) {
    return this.resumesService.getRemainingSlots(user.userId);
  }

  @Get(':id/full')
  @ApiOperation({ summary: 'Get a resume with all sections' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume with all sections' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResumeByIdWithAllSections(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.resumesService.findResumeByIdForUser(id, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume found' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  @ApiResponse({ status: 400, description: 'Invalid resume ID format' })
  async getResumeByIdForUser(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.resumesService.findResumeByIdForUser(id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created' })
  async createResumeForUser(
    @CurrentUser() user: UserPayload,
    @Body() createResume: CreateResume,
  ) {
    return this.resumesService.createResumeForUser(user.userId, createResume);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume updated' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async updateResumeForUser(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() updateResume: UpdateResume,
  ) {
    return this.resumesService.updateResumeForUser(
      id,
      user.userId,
      updateResume,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume deleted' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async deleteResumeForUser(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.resumesService.deleteResumeForUser(id, user.userId);
  }
}
