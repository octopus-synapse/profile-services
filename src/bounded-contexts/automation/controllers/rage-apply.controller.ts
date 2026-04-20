import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { createZodPipe } from '@/bounded-contexts/platform/common/validation/zod-validation.pipe';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { RageApplyService } from '../services/rage-apply.service';

const RageApplyBodySchema = z.object({
  minFit: z.coerce.number().int().min(0).max(100).optional(),
  maxApplications: z.coerce.number().int().min(1).max(100).optional(),
  sinceDays: z.coerce.number().int().min(1).max(90).optional(),
});

class RageApplyFailureDto {
  @ApiProperty({ example: 'job_abc123' })
  jobId!: string;

  @ApiProperty({ example: 'Tailor service timeout' })
  reason!: string;
}

class RageApplyResultDto {
  @ApiProperty({ example: 18, description: 'How many jobs we tried to apply to' })
  attempted!: number;

  @ApiProperty({ example: 12, description: 'Successful submissions' })
  submitted!: number;

  @ApiProperty({ example: 4, description: 'Skipped because user already applied' })
  skippedExisting!: number;

  @ApiProperty({ type: [RageApplyFailureDto], description: 'Per-job failures with reason' })
  failed!: RageApplyFailureDto[];
}

@SdkExport({ tag: 'automation', description: 'Batch apply API' })
@ApiTags('automation')
@ApiBearerAuth('JWT-auth')
@Controller('v1/automation/rage-apply')
export class RageApplyController {
  constructor(private readonly service: RageApplyService) {}

  @Post()
  @RequirePermission(Permission.FEED_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Submit tailored applications to every open job that matches minFit. Bounded by maxApplications (default 20, cap 100).',
  })
  @ApiDataResponse(RageApplyResultDto, { description: 'Batch apply summary' })
  async run(
    @CurrentUser() user: UserPayload,
    @Body(createZodPipe(RageApplyBodySchema)) body: z.infer<typeof RageApplyBodySchema>,
  ): Promise<DataResponse<RageApplyResultDto>> {
    const since =
      typeof body.sinceDays === 'number'
        ? new Date(Date.now() - body.sinceDays * 24 * 60 * 60 * 1000)
        : undefined;

    const result = await this.service.execute({
      userId: user.userId,
      minFit: body.minFit,
      maxApplications: body.maxApplications,
      since,
    });

    return { success: true, data: result };
  }
}
