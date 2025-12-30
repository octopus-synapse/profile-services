/**
 * Professional Profile DTOs
 * DTOs for professional profile step
 */

import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfessionalProfileDto {
  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  jobTitle: string;

  @ApiProperty({ example: 'Experienced full-stack developer with 5+ years...' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  summary: string;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe', required: false })
  @IsOptional()
  @IsUrl()
  linkedin?: string;

  @ApiProperty({ example: 'https://github.com/johndoe', required: false })
  @IsOptional()
  @IsUrl()
  github?: string;

  @ApiProperty({ example: 'https://johndoe.dev', required: false })
  @IsOptional()
  @IsUrl()
  website?: string;
}
