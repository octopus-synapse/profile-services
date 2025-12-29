import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPayload } from '../auth/interfaces/auth-request.interface';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('resumes')
@ApiBearerAuth('JWT-auth')
@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all resumes for current user' })
  @ApiResponse({ status: 200, description: 'List of resumes' })
  async findAll(@CurrentUser() user: UserPayload) {
    return this.resumesService.findAll(user.userId);
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume found' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async findOne(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.resumesService.findOne(id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created' })
  async create(
    @CurrentUser() user: UserPayload,
    @Body() createResumeDto: CreateResumeDto,
  ) {
    return this.resumesService.create(user.userId, createResumeDto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume updated' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() updateResumeDto: UpdateResumeDto,
  ) {
    return this.resumesService.update(id, user.userId, updateResumeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiParam({ name: 'id', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume deleted' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async remove(
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.resumesService.remove(id, user.userId);
  }
}
