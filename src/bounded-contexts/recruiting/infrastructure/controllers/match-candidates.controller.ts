import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { RateLimit, RateLimitGuard } from '@/bounded-contexts/platform/common/rate-limit';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  MATCH_CANDIDATES_FOR_JOB_PORT,
  type MatchCandidatesForJobOutput,
  type MatchCandidatesForJobPort,
} from '../../application';
import { MatchCandidatesDataDto, MatchCandidatesRequestDto } from './match-candidates.dto';

/**
 * Thin HTTP boundary for the `MatchCandidatesForJob` use-case. All work
 * delegated — per ADR-001 the controller must not contain loops, filters,
 * or business decisions.
 */

@SdkExport({ tag: 'recruiting', description: 'Reverse candidate match API' })
@ApiTags('recruiting')
@ApiBearerAuth('JWT-auth')
@Controller('v1/recruiting')
@UseGuards(JwtAuthGuard)
export class MatchCandidatesController {
  constructor(
    @Inject(MATCH_CANDIDATES_FOR_JOB_PORT)
    private readonly useCase: MatchCandidatesForJobPort,
  ) {}

  @Post('match-candidates')
  @RequirePermission(Permission.JOB_CREATE)
  @UseGuards(RateLimitGuard)
  @RateLimit({ points: 20, duration: 3600, keyStrategy: 'user' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Rank up-to-N opt-in candidates for a job description using the same structured fit-score model used on the candidate side (reverse match).',
  })
  @ApiBody({ type: MatchCandidatesRequestDto })
  @ApiDataResponse(MatchCandidatesDataDto, {
    description: 'Top candidates with their per-dimension fit breakdown.',
  })
  async matchCandidates(
    @Body() body: MatchCandidatesRequestDto,
    @Req() req: { user: { userId: string } },
  ): Promise<DataResponse<MatchCandidatesForJobOutput>> {
    const data = await this.useCase.execute({
      requesterId: req.user.userId,
      jobSkills: body.skills ?? [],
      jobMinEnglish: body.minEnglishLevel ?? null,
      jobRemotePolicy: body.remotePolicy ?? null,
      limit: body.limit,
    });
    return { success: true, data };
  }
}
