/**
 * Job Controller (legacy rate-limited shell)
 *
 * The bulk of /v1/jobs endpoints have moved to `jobs.routes.ts`. The
 * `import-from-url` action stays here because it relies on the Nest
 * `RateLimitGuard` decorator stack, which the Route synthesizer
 * does not yet model.
 */

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import {
  RateLimit,
  RateLimitGuard,
} from '@/bounded-contexts/platform/common/rate-limit/rate-limit.guard';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { JobsUseCases } from '../../application/ports/jobs.port';
import { ImportJobFromUrlDto, ImportJobFromUrlSchema } from '../../dto/job.dto';

@SdkExport({ tag: 'jobs', description: 'Jobs API' })
@ApiTags('jobs')
@ApiBearerAuth()
@Controller('v1/jobs')
export class JobController {
  constructor(private readonly bc: JobsUseCases) {}

  @Post('import-from-url')
  @RequirePermission(Permission.JOB_CREATE)
  @UseGuards(RateLimitGuard)
  @RateLimit({ points: 5, duration: 600, keyStrategy: 'user' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch a careers page and return an LLM-extracted job preview (not persisted)',
  })
  async importFromUrl(@Body(createZodPipe(ImportJobFromUrlSchema)) body: ImportJobFromUrlDto) {
    return this.bc.importJobFromUrl.execute(body.url);
  }
}
