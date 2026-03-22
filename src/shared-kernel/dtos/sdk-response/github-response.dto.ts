/**
 * GitHub Integration SDK Response DTOs
 *
 * Response types for GitHub OAuth, import, and connection status.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GitHubAuthUrlResponseDto {
  @ApiProperty({ example: 'https://github.com/login/oauth/authorize?...' })
  authUrl!: string;
}

export class GitHubCallbackResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: 'octocat' })
  username?: string;

  @ApiPropertyOptional({ example: 'https://github.com/octocat' })
  profileUrl?: string;
}

export class GitHubImportResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: 25 })
  repositoriesImported?: number;

  @ApiPropertyOptional({ example: 5 })
  contributionsImported?: number;
}

export class GitHubConnectionStatusDto {
  @ApiProperty({ example: true })
  connected!: boolean;

  @ApiPropertyOptional({ example: 'octocat' })
  username?: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  connectedAt?: string;
}
