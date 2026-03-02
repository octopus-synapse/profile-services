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
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { MecSyncStatusResponseDto } from '@/shared-kernel';
import { GitHubService } from './github.service';

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
    return { success: true, data: result as unknown as GitHubSummaryDto };
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
    return { success: true, data: result as unknown as GitHubSyncResponseDto };
  }

  @Post('sync/:resumeId/auto')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Auto-sync GitHub from resume GitHub link' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID to sync' })
  @ApiDataResponse(GitHubSyncResponseDto, {
    description: 'GitHub data auto-synced successfully',
  })
  async autoSyncGitHub(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
  ): Promise<DataResponse<GitHubSyncResponseDto>> {
    const result = await this.githubService.autoSyncGitHubFromResume(user.userId, resumeId);
    return { success: true, data: result as unknown as GitHubSyncResponseDto };
  }

  @Get('sync-status/:resumeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get GitHub sync status for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID to check' })
  @ApiDataResponse(MecSyncStatusResponseDto, { description: 'Sync status' })
  async getSyncStatus(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
  ): Promise<DataResponse<MecSyncStatusResponseDto>> {
    const result = await this.githubService.getSyncStatus(user.userId, resumeId);
    return {
      success: true,
      data: result as unknown as MecSyncStatusResponseDto,
    };
  }
}
