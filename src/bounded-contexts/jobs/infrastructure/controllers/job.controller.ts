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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { EnglishLevel, JobType } from '@prisma/client';
import { z } from 'zod';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import {
  RateLimit,
  RateLimitGuard,
} from '@/bounded-contexts/platform/common/rate-limit/rate-limit.guard';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ApplyToJobUseCase } from '../../application/use-cases/apply-to-job/apply-to-job.use-case';
import { BookmarkJobUseCase } from '../../application/use-cases/bookmark-job/bookmark-job.use-case';
import { CreateJobUseCase } from '../../application/use-cases/create-job/create-job.use-case';
import { DeleteJobUseCase } from '../../application/use-cases/delete-job/delete-job.use-case';
import { FindSimilarJobsUseCase } from '../../application/use-cases/find-similar-jobs/find-similar-jobs.use-case';
import { GetJobUseCase } from '../../application/use-cases/get-job/get-job.use-case';
import { GetJobFitUseCase } from '../../application/use-cases/get-job-fit/get-job-fit.use-case';
import { ImportJobFromUrlUseCase } from '../../application/use-cases/import-job-from-url/import-job-from-url.use-case';
import { ListBookmarkedJobsUseCase } from '../../application/use-cases/list-bookmarked-jobs/list-bookmarked-jobs.use-case';
import { ListJobApplicationsUseCase } from '../../application/use-cases/list-job-applications/list-job-applications.use-case';
import { ListJobsUseCase } from '../../application/use-cases/list-jobs/list-jobs.use-case';
import { ListJobsWithFitScoreUseCase } from '../../application/use-cases/list-jobs-with-fit-score/list-jobs-with-fit-score.use-case';
import { ListMyApplicationsUseCase } from '../../application/use-cases/list-my-applications/list-my-applications.use-case';
import { ListMyJobsUseCase } from '../../application/use-cases/list-my-jobs/list-my-jobs.use-case';
import { ListRecommendedJobsUseCase } from '../../application/use-cases/list-recommended-jobs/list-recommended-jobs.use-case';
import { UnbookmarkJobUseCase } from '../../application/use-cases/unbookmark-job/unbookmark-job.use-case';
import { UpdateJobUseCase } from '../../application/use-cases/update-job/update-job.use-case';
import { WithdrawApplicationUseCase } from '../../application/use-cases/withdraw-application/withdraw-application.use-case';
import {
  ApplyToJobDto,
  ApplyToJobSchema,
  CreateJobDto,
  CreateJobSchema,
  ImportJobFromUrlDto,
  ImportJobFromUrlSchema,
  JobApplicationsByJobDto,
  JobResponseDto,
  PaginatedJobsDto,
  UpdateJobDto,
  UpdateJobSchema,
} from '../../dto/job.dto';
import {
  parsePaymentCurrencies,
  parseRemotePolicies,
  parseSkillsCsv,
} from '../../presenters/job.presenter';

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
  constructor(
    private readonly listJobsUseCase: ListJobsUseCase,
    private readonly listJobsWithFitScoreUseCase: ListJobsWithFitScoreUseCase,
    private readonly listMyJobsUseCase: ListMyJobsUseCase,
    private readonly listBookmarkedJobsUseCase: ListBookmarkedJobsUseCase,
    private readonly listRecommendedJobsUseCase: ListRecommendedJobsUseCase,
    private readonly listMyApplicationsUseCase: ListMyApplicationsUseCase,
    private readonly listJobApplicationsUseCase: ListJobApplicationsUseCase,
    private readonly findSimilarJobsUseCase: FindSimilarJobsUseCase,
    private readonly getJobUseCase: GetJobUseCase,
    private readonly getJobFitUseCase: GetJobFitUseCase,
    private readonly bookmarkJobUseCase: BookmarkJobUseCase,
    private readonly unbookmarkJobUseCase: UnbookmarkJobUseCase,
    private readonly applyToJobUseCase: ApplyToJobUseCase,
    private readonly withdrawApplicationUseCase: WithdrawApplicationUseCase,
    private readonly importJobFromUrlUseCase: ImportJobFromUrlUseCase,
    private readonly createJobUseCase: CreateJobUseCase,
    private readonly updateJobUseCase: UpdateJobUseCase,
    private readonly deleteJobUseCase: DeleteJobUseCase,
  ) {}

  @Get()
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'jobType', required: false, type: String })
  @ApiQuery({ name: 'skills', required: false, description: 'CSV of skill names' })
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
    return this.listJobsUseCase.execute(
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
    return this.listJobsWithFitScoreUseCase.execute(
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
  @ApiOperation({ summary: 'List jobs the current user (recruiter) authored' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(PaginatedJobsDto, { description: 'Paginated jobs owned by the recruiter' })
  async getMyJobs(
    @Req() req: { user: { userId: string } },
    @Query(createZodPipe(PageOnlyQuerySchema)) q: z.infer<typeof PageOnlyQuerySchema>,
  ) {
    return this.listMyJobsUseCase.execute(req.user.userId, q.page, q.limit);
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
    return this.listBookmarkedJobsUseCase.execute(req.user.userId, q.page, q.limit);
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
    return this.listRecommendedJobsUseCase.execute(req.user.userId, q.page, q.limit);
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
    return this.listMyApplicationsUseCase.execute(req.user.userId, q.page, q.limit);
  }

  @Get(':id/applications')
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List applications received for a job (job owner only)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(JobApplicationsByJobDto, {
    description: 'Paginated applications received for the job',
  })
  async getApplicationsForJob(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Query(createZodPipe(PageOnlyQuerySchema)) q: z.infer<typeof PageOnlyQuerySchema>,
  ) {
    return this.listJobApplicationsUseCase.execute(id, req.user.userId, q.page, q.limit);
  }

  @Get(':id/similar')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Jobs similar to the given one (by skill overlap)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max 10, default 5' })
  async findSimilar(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Query(createZodPipe(z.object({ limit: z.coerce.number().int().min(1).max(10).default(5) })))
    q: { limit: number },
  ) {
    return this.findSimilarJobsUseCase.execute(id, req.user.userId, q.limit);
  }

  @Get(':id')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single job by id' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(JobResponseDto, { description: 'Job details' })
  async findById(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.getJobUseCase.execute(id, req.user.userId);
  }

  @Get(':id/fit')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Fit score breakdown for this job against the viewer's primary resume" })
  @ApiParam({ name: 'id', type: 'string' })
  async getFit(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.getJobFitUseCase.execute(id, req.user.userId);
  }

  @Post(':id/bookmark')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bookmark a job' })
  @ApiParam({ name: 'id', type: 'string' })
  async bookmark(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.bookmarkJobUseCase.execute(id, req.user.userId);
  }

  @Delete(':id/bookmark')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a job bookmark' })
  @ApiParam({ name: 'id', type: 'string' })
  async unbookmark(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.unbookmarkJobUseCase.execute(id, req.user.userId);
  }

  @Post(':id/apply')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a quick application to a job' })
  @ApiParam({ name: 'id', type: 'string' })
  async apply(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body(createZodPipe(ApplyToJobSchema)) body: ApplyToJobDto,
  ) {
    return this.applyToJobUseCase.execute(id, req.user.userId, body ?? {});
  }

  @Delete(':id/apply')
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw the current user application to a job' })
  @ApiParam({ name: 'id', type: 'string' })
  async withdrawApplication(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.withdrawApplicationUseCase.execute(id, req.user.userId);
  }

  @Post('import-from-url')
  @RequirePermission(Permission.JOB_CREATE)
  @UseGuards(RateLimitGuard)
  @RateLimit({ points: 5, duration: 600, keyStrategy: 'user' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch a careers page and return an LLM-extracted job preview (not persisted)',
  })
  async importFromUrl(@Body(createZodPipe(ImportJobFromUrlSchema)) body: ImportJobFromUrlDto) {
    return this.importJobFromUrlUseCase.execute(body.url);
  }

  @Post()
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job posting' })
  @ApiDataResponse(JobResponseDto, { description: 'Job created', status: HttpStatus.CREATED })
  async create(
    @Req() req: { user: { userId: string } },
    @Body(createZodPipe(CreateJobSchema)) body: CreateJobDto,
  ) {
    return this.createJobUseCase.execute(req.user.userId, body);
  }

  @Patch(':id')
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a job posting' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(JobResponseDto, { description: 'Job updated' })
  async update(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body(createZodPipe(UpdateJobSchema)) body: UpdateJobDto,
  ) {
    return this.updateJobUseCase.execute(id, req.user.userId, body);
  }

  @Delete(':id')
  @RequirePermission(Permission.JOB_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a job posting' })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.deleteJobUseCase.execute(id, req.user.userId);
  }
}
