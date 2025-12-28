/**
 * Theme Application DTOs
 */

import {
  IsString,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyThemeToResumeDto {
  @ApiProperty()
  @IsString()
  themeId: string;

  @ApiProperty()
  @IsString()
  resumeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customizations?: Record<string, unknown>;
}

export class ForkThemeDto {
  @ApiProperty()
  @IsString()
  themeId: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;
}

export class RateThemeDto {
  @ApiProperty()
  @IsString()
  themeId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  rating: number;
}
