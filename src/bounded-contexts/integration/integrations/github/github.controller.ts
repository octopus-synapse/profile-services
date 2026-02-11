import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { MecSyncStatusResponseDto } from '@/shared-kernel';
import { GitHubService } from './github.service';

@SdkExport({ tag: 'github', description: 'Github API' })
@ApiTags('github')
@Controller('v1/integrations/github')
export class GitHubController {
  constructor(private readonly githubService: GitHubService) {}

  @Public()
  @Get('summary/:username')
  @ApiOperation({ summary: 'Get GitHub profile summary for a username' })
  @ApiParam({ name: 'username', description: 'GitHub username' })
  @ApiResponse({
    status: 200,
    description: 'GitHub summary with repositories, contributions, and stats',
    schema: {
      example: {
        username: 'octocat',
        name: 'The Octocat',
        bio: 'A developer',
        publicRepos: 42,
        followers: 1000,
        following: 50,
        topLanguages: ['JavaScript', 'TypeScript', 'Python'],
        pinnedRepos: [],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'GitHub user not found' })
  async getGitHubSummary(@Param('username') username: string) {
    return this.githubService.getGitHubSummary(username);
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
  @ApiResponse({ status: 200, description: 'GitHub data synced successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async syncGitHub(
    @CurrentUser() user: UserPayload,
    @Body() body: { githubUsername: string; resumeId: string },
  ) {
    return this.githubService.syncUserGitHub(user.userId, body.githubUsername, body.resumeId);
  }

  @Post('sync/:resumeId/auto')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Auto-sync GitHub from resume GitHub link' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID to sync' })
  @ApiResponse({
    status: 200,
    description: 'GitHub data auto-synced successfully',
  })
  @ApiResponse({ status: 400, description: 'No GitHub link found in resume' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async autoSyncGitHub(@CurrentUser() user: UserPayload, @Param('resumeId') resumeId: string) {
    return this.githubService.autoSyncGitHubFromResume(user.userId, resumeId);
  }

  @Get('sync-status/:resumeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get GitHub sync status for a resume' })
  @ApiResponse({ status: 200, type: MecSyncStatusResponseDto })
  @ApiParam({ name: 'resumeId', description: 'Resume ID to check' })
  @ApiResponse({
    status: 200,
    description: 'Sync status',
    schema: {
      example: {
        isSynced: true,
        lastSyncedAt: '2024-01-15T10:30:00Z',
        githubUsername: 'octocat',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getSyncStatus(@CurrentUser() user: UserPayload, @Param('resumeId') resumeId: string) {
    return this.githubService.getSyncStatus(user.userId, resumeId);
  }
}
