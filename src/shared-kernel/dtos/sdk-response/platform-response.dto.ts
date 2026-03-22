/**
 * ATS & Platform SDK Response DTOs
 *
 * Response types for ATS validation and platform statistics.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AtsValidationResponseDto {
  @ApiProperty({ example: 85 })
  score!: number;

  @ApiProperty({ example: 'GOOD', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] })
  rating!: string;

  @ApiProperty({
    type: [String],
    example: ['Add more keywords for Software Engineer role'],
  })
  suggestions!: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Missing contact information'],
  })
  issues?: string[];

  @ApiPropertyOptional({ example: {} })
  breakdown?: Record<string, unknown>;
}

export class PlatformStatsResponseDto {
  @ApiProperty({ example: 15000 })
  totalUsers!: number;

  @ApiProperty({ example: 45000 })
  totalResumes!: number;

  @ApiProperty({ example: 1500000 })
  totalViews!: number;

  @ApiProperty({ example: 250 })
  activeUsersToday!: number;

  @ApiProperty({ example: 1500 })
  activeUsersWeek!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}
