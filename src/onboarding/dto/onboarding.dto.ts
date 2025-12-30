/**
 * Main Onboarding DTO
 * Complete DTO for onboarding submission
 */

import { IsObject, ValidateNested, IsOptional, IsArray, IsString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { PersonalInfoDto } from './personal-info.dto';
import { ProfessionalProfileDto } from './professional-profile.dto';
import { ExperiencesStepDto } from './experience.dto';
import { EducationStepDto } from './education.dto';
import { SkillsStepDto } from './skills.dto';
import {
  LanguageDto,
  ProjectDto,
  CertificationDto,
  AwardDto,
  InterestDto,
} from './additional-profile.dto';
import { TemplateSelectionDto } from './template-selection.dto';

// Re-export all DTOs for backward compatibility
export { PersonalInfoDto } from './personal-info.dto';
export { ProfessionalProfileDto } from './professional-profile.dto';
export { ExperienceDto, ExperiencesStepDto } from './experience.dto';
export { EducationDto, EducationStepDto } from './education.dto';
export { SkillDto, SkillsStepDto } from './skills.dto';
export {
  LanguageDto,
  ProjectDto,
  CertificationDto,
  AwardDto,
  InterestDto,
} from './additional-profile.dto';
export { TemplateSelectionDto } from './template-selection.dto';
export { OnboardingProgressDto } from './onboarding-progress.dto';

export class OnboardingDto {
  @ApiProperty({ example: 'johndoe', description: 'Unique username for profile URL' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo: PersonalInfoDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ProfessionalProfileDto)
  professionalProfile: ProfessionalProfileDto;

  @IsObject()
  @ValidateNested()
  @Type(() => SkillsStepDto)
  skillsStep: SkillsStepDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ExperiencesStepDto)
  experiencesStep?: ExperiencesStepDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EducationStepDto)
  educationStep?: EducationStepDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AwardDto)
  awards?: AwardDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterestDto)
  interests?: InterestDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => TemplateSelectionDto)
  templateSelection: TemplateSelectionDto;
}
