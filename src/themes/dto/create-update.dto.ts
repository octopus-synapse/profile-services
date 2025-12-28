/**
 * Theme Create/Update DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ThemeCategory } from '@prisma/client';

export class CreateThemeDto {
  @ApiProperty({ example: 'My Theme' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ThemeCategory })
  @IsEnum(ThemeCategory)
  category: ThemeCategory;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty()
  @IsObject()
  styleConfig: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentThemeId?: string;
}

export class UpdateThemeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ThemeCategory })
  @IsOptional()
  @IsEnum(ThemeCategory)
  category?: ThemeCategory;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  styleConfig?: Record<string, unknown>;
}
