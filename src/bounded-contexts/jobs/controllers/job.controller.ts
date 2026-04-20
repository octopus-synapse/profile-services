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
import { z } from 'zod';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  parsePaymentCurrencies,
  parseRemotePolicies,
  parseSkillsCsv,
} from '../presenters/job.presenter';
import { JobService } from '../services/job.service';

const JobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(500).optional(),
  jobType: z.string().optional(),
  skills: z.string().max(500).optional(),
  paymentCurrency: z.string().max(100).optional(),
  remotePolicy: z.string().max(100).optional(),
  minEnglishLevel: z.string().optional(),
});

const PageOnlyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

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
    @Query(createZodPipe(JobListQuerySchema)) q: z.infer<typeof JobListQuerySchema>,
  ) {
    return this.jobService.findAll(
      {
        page: q.page,
        limit: q.limit,
        search: q.search,
        jobType: q.jobType as JobType | undefined,
        skills: parseSkillsCsv(q.skills),
        paymentCurrency: parsePaymentCurrencies(q.paymentCurrency),
        remotePolicy: parseRemotePolicies(q.remotePolicy),
        minEnglishLevel: q.minEnglishLevel as EnglishLevel | undefined,
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
    @Query(createZodPipe(JobListQuerySchema)) q: z.infer<typeof JobListQuerySchema>,
  ) {
    return this.jobService.findAllWithFitScore(
      {
        page: q.page,
        limit: q.limit,
        search: q.search,
        jobType: q.jobType as JobType | undefined,
        skills: parseSkillsCsv(q.skills),
        paymentCurrency: parsePaymentCurrencies(q.paymentCurrency),
        remotePolicy: parseRemotePolicies(q.remotePolicy),
        minEnglishLevel: q.minEnglishLevel as EnglishLevel | undefined,
      },
      req.user.userId,
    );
  }

  @Get('mine')
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.OK)
  async getMyJobs(
    @Req() req: { user: { userId: string } },
    @Query(createZodPipe(PageOnlyQuerySchema)) q: z.infer<typeof PageOnlyQuerySchema>,
  ) {
    return this.jobService.getMyJobs(req.user.userId, q.page, q.limit);
  }

  @Get('bookmarks')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List jobs bookmarked by the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getBookmarkedJobs(
    @Req() req: { user: { userId: string } },
    @Query(createZodPipe(PageOnlyQuerySchema)) q: z.infer<typeof PageOnlyQuerySchema>,
  ) {
    return this.jobService.getBookmarkedJobs(req.user.userId, q.page, q.limit);
  }

  @Get('recommended')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List jobs recommended for the current user based on resume skills' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecommendedJobs(
    @Req() req: { user: { userId: string } },
    @Query(createZodPipe(PageOnlyQuerySchema)) q: z.infer<typeof PageOnlyQuerySchema>,
  ) {
    return this.jobService.getRecommendedJobs(req.user.userId, q.page, q.limit);
  }

  @Get('applications')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active applications submitted by the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyApplications(
    @Req() req: { user: { userId: string } },
    @Query(createZodPipe(PageOnlyQuerySchema)) q: z.infer<typeof PageOnlyQuerySchema>,
  ) {
    return this.jobService.getMyApplications(req.user.userId, q.page, q.limit);
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
