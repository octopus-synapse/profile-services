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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { EnglishLevel, JobType, PaymentCurrency, RemotePolicy } from '@prisma/client';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  parsePaymentCurrencies,
  parseRemotePolicies,
  parseSkillsCsv,
} from '../presenters/job.presenter';
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
  @ApiQuery({ name: 'paymentCurrency', required: false, description: 'CSV of BRL|USD|EUR|GBP' })
  @ApiQuery({ name: 'remotePolicy', required: false, description: 'CSV of REMOTE|HYBRID|ONSITE' })
  @ApiQuery({
    name: 'minEnglishLevel',
    required: false,
    description:
      'Max level the viewer accepts. Returns jobs whose required level is ≤ this (or null).',
  })
  async findAll(
    @Req() req: { user: { userId: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('jobType') jobType?: JobType,
    @Query('skills') skills?: string,
    @Query('paymentCurrency') paymentCurrency?: string,
    @Query('remotePolicy') remotePolicy?: string,
    @Query('minEnglishLevel') minEnglishLevel?: EnglishLevel,
  ) {
    const skillsArray = parseSkillsCsv(skills);
    const currencyArray = parsePaymentCurrencies(paymentCurrency);
    const remoteArray = parseRemotePolicies(remotePolicy);
    return this.jobService.findAll(
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search,
        jobType,
        skills: skillsArray,
        paymentCurrency: currencyArray,
        remotePolicy: remoteArray,
        minEnglishLevel,
      },
      req.user.userId,
    );
  }

  @Get('with-fit-score')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Same as GET /jobs but each item is enriched with a 0-100 structured fit score for the current user.',
  })
  async findAllWithFitScore(
    @Req() req: { user: { userId: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('jobType') jobType?: JobType,
    @Query('skills') skills?: string,
    @Query('paymentCurrency') paymentCurrency?: string,
    @Query('remotePolicy') remotePolicy?: string,
    @Query('minEnglishLevel') minEnglishLevel?: EnglishLevel,
  ) {
    const skillsArray = parseSkillsCsv(skills);
    const currencyArray = parsePaymentCurrencies(paymentCurrency);
    const remoteArray = parseRemotePolicies(remotePolicy);
    return this.jobService.findAllWithFitScore(
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search,
        jobType,
        skills: skillsArray,
        paymentCurrency: currencyArray,
        remotePolicy: remoteArray,
        minEnglishLevel,
      },
      req.user.userId,
    );
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

  @Get('bookmarks')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List jobs bookmarked by the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getBookmarkedJobs(
    @Req() req: { user: { userId: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobService.getBookmarkedJobs(
      req.user.userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('recommended')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List jobs recommended for the current user based on resume skills' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecommendedJobs(
    @Req() req: { user: { userId: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobService.getRecommendedJobs(
      req.user.userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('applications')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active applications submitted by the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyApplications(
    @Req() req: { user: { userId: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobService.getMyApplications(
      req.user.userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.jobService.findById(id, req.user.userId);
  }

  @Get(':id/fit')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Fit score breakdown for this job against the viewer's primary resume",
  })
  @ApiParam({ name: 'id', type: 'string' })
  async getFit(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.jobService.getFit(id, req.user.userId);
  }

  @Post(':id/bookmark')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bookmark a job' })
  @ApiParam({ name: 'id', type: 'string' })
  async bookmark(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.jobService.bookmark(id, req.user.userId);
  }

  @Delete(':id/bookmark')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a job bookmark' })
  @ApiParam({ name: 'id', type: 'string' })
  async unbookmark(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.jobService.unbookmark(id, req.user.userId);
  }

  @Post(':id/apply')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a quick application to a job' })
  @ApiParam({ name: 'id', type: 'string' })
  async apply(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { coverLetter?: string; resumeId?: string },
  ) {
    return this.jobService.apply(id, req.user.userId, body ?? {});
  }

  @Delete(':id/apply')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw the current user application to a job' })
  @ApiParam({ name: 'id', type: 'string' })
  async withdrawApplication(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.jobService.withdrawApplication(id, req.user.userId);
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
      paymentCurrency?: PaymentCurrency;
      remotePolicy?: RemotePolicy;
      minEnglishLevel?: EnglishLevel;
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
      paymentCurrency?: PaymentCurrency | null;
      remotePolicy?: RemotePolicy | null;
      minEnglishLevel?: EnglishLevel | null;
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
