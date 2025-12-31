/**
 * Onboarding Progress DTO
 * DTO for saving partial onboarding progress
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type {
  PartialPersonalInfo,
  PartialProfessionalProfile,
  PartialExperience,
  PartialEducation,
  PartialSkill,
  PartialLanguage,
  PartialTemplateSelection,
} from './progress-data.types';

export class OnboardingProgressDto {
  @ApiProperty({
    example: 'personal-info',
    enum: [
      'welcome',
      'personal-info',
      'username',
      'professional-profile',
      'experience',
      'education',
      'skills',
      'languages',
      'template',
      'review',
      'complete',
    ],
  })
  @IsString()
  currentStep: string;

  @ApiProperty({ example: ['welcome', 'personal-info'] })
  @IsArray()
  @IsString({ each: true })
  completedSteps: string[];

  @ApiProperty({ example: 'johndoe', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsObject()
  personalInfo?: PartialPersonalInfo;

  @IsOptional()
  @IsObject()
  professionalProfile?: PartialProfessionalProfile;

  @IsOptional()
  @IsArray()
  experiences?: PartialExperience[];

  @IsOptional()
  @IsBoolean()
  noExperience?: boolean;

  @IsOptional()
  @IsArray()
  education?: PartialEducation[];

  @IsOptional()
  @IsBoolean()
  noEducation?: boolean;

  @IsOptional()
  @IsArray()
  skills?: PartialSkill[];

  @IsOptional()
  @IsBoolean()
  noSkills?: boolean;

  @IsOptional()
  @IsArray()
  languages?: PartialLanguage[];

  @IsOptional()
  @IsObject()
  templateSelection?: PartialTemplateSelection;
}
