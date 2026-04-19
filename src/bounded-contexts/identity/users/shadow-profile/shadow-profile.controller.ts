import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ShadowProfileService } from './shadow-profile.service';

interface UpsertGithubBody {
  token: string;
  username: string;
}

@SdkExport({ tag: 'shadow-profile', description: 'Shadow Profile API' })
@ApiTags('shadow-profile')
@ApiBearerAuth('JWT-auth')
@Controller('v1/shadow-profiles')
export class ShadowProfileController {
  constructor(private readonly service: ShadowProfileService) {}

  @Post('github')
  @RequirePermission(Permission.USER_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin: build or refresh a GitHub-based shadow profile. Call once per login; idempotent.',
  })
  async upsertGithub(@Body() body: UpsertGithubBody): Promise<{ success: true; data: unknown }> {
    const snapshot = await this.service.upsertGithub({
      token: body.token,
      username: body.username,
    });
    return { success: true, data: snapshot };
  }

  @Get('candidates')
  @RequirePermission(Permission.USER_PROFILE_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Find unclaimed shadow profiles matching an email and/or github login. Used by the signup flow.',
  })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'githubLogin', required: false })
  async findCandidates(
    @Query('email') email?: string,
    @Query('githubLogin') githubLogin?: string,
  ): Promise<{ success: true; data: unknown }> {
    const rows = await this.service.findCandidatesFor({ email, githubLogin });
    return { success: true, data: { candidates: rows } };
  }

  @Post(':id/claim')
  @RequirePermission(Permission.USER_PROFILE_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Claim a shadow profile as the authenticated user. One-shot — cannot be undone.',
  })
  async claim(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ): Promise<{ success: true; data: unknown }> {
    const claimed = await this.service.claimForUser(id, user.userId);
    return { success: true, data: claimed };
  }
}
