/**
 * Theme Approval DTOs
 */

import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewThemeDto {
  @ApiProperty()
  @IsString()
  themeId: string;

  @ApiProperty()
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}

export class SubmitForApprovalDto {
  @ApiProperty()
  @IsString()
  themeId: string;
}
