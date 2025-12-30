/**
 * Additional Profile DTOs
 * DTOs for languages, projects, certifications, awards, and interests
 */

import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LanguageDto {
  @ApiProperty({ example: 'English' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'Fluent' })
  @IsString()
  level: string;
}

export class ProjectDto {
  name: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  technologies?: string[];
}

export class CertificationDto {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export class AwardDto {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export class InterestDto {
  name: string;
  description?: string;
}
