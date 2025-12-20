import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsUrl,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const ACHIEVEMENT_TYPES = [
  'github_stars',
  'kaggle_medal',
  'ctf_win',
  'bug_bounty',
  'certification',
  'custom',
] as const;

export class CreateAchievementDto {
  @ApiProperty({
    example: 'github_stars',
    enum: ACHIEVEMENT_TYPES,
    description: 'Type of achievement',
  })
  @IsString()
  @IsIn(ACHIEVEMENT_TYPES)
  type: string;

  @ApiProperty({ example: '10k GitHub Stars', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'Reached 10,000 stars on my open source project',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/badge.png' })
  @IsOptional()
  @IsUrl()
  badgeUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/repo' })
  @IsOptional()
  @IsUrl()
  verificationUrl?: string;

  @ApiProperty({ example: '2023-06-15' })
  @IsDateString()
  achievedAt: string;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Numeric value (e.g., stars, bounty amount)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ example: 'Top 1%', description: 'Rank or medal type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rank?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateAchievementDto extends PartialType(CreateAchievementDto) {}

export class AchievementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  badgeUrl?: string;

  @ApiPropertyOptional()
  verificationUrl?: string;

  @ApiProperty()
  achievedAt: Date;

  @ApiPropertyOptional()
  value?: number;

  @ApiPropertyOptional()
  rank?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
