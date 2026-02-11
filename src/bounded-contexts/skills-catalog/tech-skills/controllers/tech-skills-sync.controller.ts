/**
 * Tech Skills Sync Controller
 * API endpoints for tech skills synchronization (Admin/Internal only)
 */

import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { InternalAuthGuard } from '@/bounded-contexts/integration/mec-sync/guards/internal-auth.guard';
import { TechSkillsSyncService } from '../services/tech-skills-sync.service';

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
  async triggerSync() {
    const result = await this.syncService.runSync();
    return {
      message: 'Tech skills sync completed',
      result,
    };
  }
}
