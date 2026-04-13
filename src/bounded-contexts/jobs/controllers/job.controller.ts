import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JobType } from '@prisma/client';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { JobService } from '../services/job.service';

@SdkExport({ tag: 'jobs', description: 'Jobs API' })
@ApiTags('jobs')
@ApiBearerAuth()
@Controller('v1/jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('jobType') jobType?: JobType,
    @Query('skills') skills?: string,
  ) {
    const skillsArray = skills ? skills.split(',') : undefined;
    return this.jobService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      jobType,
      skills: skillsArray,
    });
  }

  @Get('mine')
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.OK)
  async getMyJobs(
    @Req() req: { user: { userId: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobService.getMyJobs(
      req.user.userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.jobService.findById(id);
  }

  @Post()
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
      title: string;
      company: string;
      location?: string;
      jobType: JobType;
      description: string;
      requirements?: string[];
      skills?: string[];
      salaryRange?: string;
      applyUrl?: string;
      expiresAt?: Date;
    },
  ) {
    return this.jobService.create(req.user.userId, body);
  }

  @Patch(':id')
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
      title?: string;
      company?: string;
      location?: string;
      jobType?: JobType;
      description?: string;
      requirements?: string[];
      skills?: string[];
      salaryRange?: string;
      applyUrl?: string;
      isActive?: boolean;
      expiresAt?: Date;
    },
  ) {
    return this.jobService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.jobService.delete(id, req.user.userId);
  }
}
