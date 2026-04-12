import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard, Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { GitHubService } from './github.service';
import type { GitHubSyncResult } from './services/github-sync.service';

/** DTO for GitHub profile summary */
export class GitHubSummaryDto {
  @ApiProperty({ example: 'octocat' })
  username!: string;

  @ApiPropertyOptional({ example: 'The Octocat' })
  name?: string;

  @ApiPropertyOptional({ example: 'A developer' })
  bio?: string;

  @ApiProperty({ example: 42 })
  publicRepos!: number;

  @ApiProperty({ example: 1000 })
  followers!: number;

  @ApiProperty({ example: 50 })
  following!: number;

  @ApiProperty({ example: ['JavaScript', 'TypeScript', 'Python'] })
  topLanguages!: string[];

  @ApiProperty({ example: [] })
  pinnedRepos!: { name: string; description?: string; url: string }[];
}

/** DTO for sync response */
export class GitHubSyncResponseDto {
  @ApiProperty({ example: true })
  synced!: boolean;

  @ApiPropertyOptional({ example: 'GitHub data synced successfully' })
  message?: string;
}

/** DTO for auto sync request (body is optional, resumeId comes from path) */
export class AutoSyncGitHubRequestDto {}

/** DTO for sync status response */
export class GitHubSyncStatusResponseDto {
  @ApiProperty({ example: 'COMPLETED', enum: ['IDLE', 'RUNNING', 'COMPLETED', 'FAILED'] })
  status!: string;

  @ApiProperty({ example: 100 })
  progress!: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  startedAt?: string;

  @ApiPropertyOptional({ example: 'Syncing repositories' })
  currentTask?: string;
}

@SdkExport({ tag: 'github', description: 'Github API' })
@ApiTags('github')
@Controller('v1/integrations/github')
export class GitHubController {
  constructor(private readonly githubService: GitHubService) {}

  @Public()
  @Get('summary/:username')
  @ApiOperation({ summary: 'Get GitHub profile summary for a username' })
  @ApiParam({ name: 'username', description: 'GitHub username' })
  @ApiDataResponse(GitHubSummaryDto, {
    description: 'GitHub summary with repositories, contributions, and stats',
  })
  async getGitHubSummary(
    @Param('username') username: string,
  ): Promise<DataResponse<GitHubSummaryDto>> {
    const result = await this.githubService.getGitHubSummary(username);
    return { success: true, data: this.toGitHubSummaryDto(result) };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Sync GitHub data to user resume' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['githubUsername', 'resumeId'],
      properties: {
        githubUsername: {
          type: 'string',
          description: 'GitHub username to sync',
          example: 'octocat',
        },
        resumeId: {
          type: 'string',
          description: 'Target resume ID',
          example: 'clxyz123',
        },
      },
    },
  })
  @ApiDataResponse(GitHubSyncResponseDto, {
    description: 'GitHub data synced successfully',
  })
  async syncGitHub(
    @CurrentUser() user: UserPayload,
    @Body() body: { githubUsername: string; resumeId: string },
  ): Promise<DataResponse<GitHubSyncResponseDto>> {
    const result = await this.githubService.syncUserGitHub(
      user.userId,
      body.githubUsername,
      body.resumeId,
    );
    return { success: true, data: this.toGitHubSyncResponseDto(result) };
  }

  @Post('sync/:resumeId/auto')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Auto-sync GitHub from resume GitHub link' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID to sync' })
  @ApiBody({ type: AutoSyncGitHubRequestDto })
  @ApiDataResponse(GitHubSyncResponseDto, {
    description: 'GitHub data auto-synced successfully',
  })
  async autoSyncGitHub(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
  ): Promise<DataResponse<GitHubSyncResponseDto>> {
    const result = await this.githubService.autoSyncGitHubFromResume(user.userId, resumeId);
    return { success: true, data: this.toGitHubSyncResponseDto(result) };
  }

  @Get('sync-status/:resumeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get GitHub sync status for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID to check' })
  @ApiDataResponse(GitHubSyncStatusResponseDto, { description: 'Sync status' })
  async getSyncStatus(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
  ): Promise<DataResponse<GitHubSyncStatusResponseDto>> {
    const result = await this.githubService.getSyncStatus(user.userId, resumeId);
    return {
      success: true,
      data: {
        status: result.hasSynced ? 'COMPLETED' : 'IDLE',
        progress: result.hasSynced ? 100 : 0,
        startedAt: result.lastSyncedAt ? this.toIsoString(result.lastSyncedAt) : undefined,
        currentTask: undefined,
      },
    };
  }

  private toGitHubSummaryDto(result: {
    username: string;
    name?: string | null;
    bio?: string | null;
    publicRepos: number;
    topRepos?: Array<{
      name: string;
      description?: string | null;
      url: string;
    }>;
  }): GitHubSummaryDto {
    return {
      username: result.username,
      name: result.name ?? undefined,
      bio: result.bio ?? undefined,
      publicRepos: result.publicRepos,
      followers: 0,
      following: 0,
      topLanguages: [],
      pinnedRepos: (result.topRepos ?? []).map((repo) => ({
        name: repo.name,
        description: repo.description ?? undefined,
        url: repo.url,
      })),
    };
  }

  private toGitHubSyncResponseDto(result: GitHubSyncResult): GitHubSyncResponseDto {
    return {
      synced: true,
      message: `Synced GitHub profile for ${result.profile.username}`,
    };
  }

  private toIsoString(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
