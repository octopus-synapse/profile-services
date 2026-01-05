/**
 * Main Onboarding DTO
 * Complete DTO for onboarding submission
 */

import {
  IsObject,
  ValidateNested,
  IsOptional,
  IsArray,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { PersonalInfoDto } from './personal-info.dto';
import { ProfessionalProfileDto } from './professional-profile.dto';
import { ExperienceDto } from './experience.dto';
import { EducationDto } from './education.dto';
import { SkillDto } from './skills.dto';
import {
  LanguageDto,
  ProjectDto,
  CertificationDto,
  AwardDto,
  InterestDto,
} from './additional-profile.dto';
import { TemplateSelectionDto } from './template-selection.dto';
import { IsBoolean } from 'class-validator';

// Re-export all DTOs for backward compatibility
export { PersonalInfoDto } from './personal-info.dto';
export { ProfessionalProfileDto } from './professional-profile.dto';
export { ExperienceDto } from './experience.dto';
export { EducationDto } from './education.dto';
export { SkillDto } from './skills.dto';
export {
  LanguageDto,
  ProjectDto,
  CertificationDto,
  AwardDto,
  InterestDto,
} from './additional-profile.dto';
export { TemplateSelectionDto } from './template-selection.dto';
export { OnboardingProgressDto } from './onboarding-progress.dto';

/**
 * Onboarding DTO (HTTP Layer)
 *
 * Note: This DTO provides NestJS validation at the HTTP layer.
 * The service layer additionally validates with Zod schemas from profile-contracts.
 * TODO: Consider removing this duplication in favor of Zod-only validation.
 */
export class OnboardingDto {
  @ApiProperty({
    example: 'johndoe',
    description: 'Unique username for profile URL (lowercase only)',
  })
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

  // Note: Changed from skillsStep wrapper to direct array (matches profile-contracts)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills: SkillDto[];

  @IsBoolean()
  noSkills: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences: ExperienceDto[];

  @IsBoolean()
  noExperience: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education: EducationDto[];

  @IsBoolean()
  noEducation: boolean;

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
