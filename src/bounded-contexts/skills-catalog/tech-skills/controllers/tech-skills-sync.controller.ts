/**
 * Tech Skills Sync Controller
 * API endpoints for tech skills synchronization (Admin/Internal only)
 */

import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { InternalAuthGuard } from '@/bounded-contexts/integration/mec-sync/guards/internal-auth.guard';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { TechSkillsSyncResult } from '../interfaces';
import { TechSkillsSyncService } from '../services/tech-skills-sync.service';

class TechSkillsSyncDataDto {
  @ApiProperty({ example: 'Tech skills sync completed' })
  message!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  result!: TechSkillsSyncResult;
}

@ApiTags('tech-skills-sync')
@Controller('v1/tech-skills')
export class TechSkillsSyncController {
  constructor(private readonly syncService: TechSkillsSyncService) {}

  /**
   * Trigger manual sync of tech skills from external sources
   * Requires internal API token (bypasses JWT auth)
   */
  @Post('sync')
  @Public() // Bypass global JWT guard
  @UseGuards(InternalAuthGuard) // Use internal token instead
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger tech skills synchronization' })
  @ApiDataResponse(TechSkillsSyncDataDto, {
    description: 'Tech skills sync execution result',
  })
  async triggerSync(): Promise<DataResponse<TechSkillsSyncDataDto>> {
    const result = await this.syncService.runSync();
    return {
      success: true,
      data: {
        message: 'Tech skills sync completed',
        result,
      },
    };
  }
}
