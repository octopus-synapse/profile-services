/**
 * Theme Query DTOs
 */

import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ThemeStatus, ThemeCategory } from '@prisma/client';

export class QueryThemesDto {
  @ApiPropertyOptional({ enum: ThemeStatus })
  @IsOptional()
  @IsEnum(ThemeStatus)
  status?: ThemeStatus;

  @ApiPropertyOptional({ enum: ThemeCategory })
  @IsOptional()
  @IsEnum(ThemeCategory)
  category?: ThemeCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  systemOnly?: boolean;

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'usageCount', 'rating', 'name'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'usageCount' | 'rating' | 'name';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortDir?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
