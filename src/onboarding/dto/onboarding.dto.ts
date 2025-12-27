import {
  IsObject,
  ValidateNested,
  IsOptional,
  IsArray,
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsUrl,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PersonalInfoDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'São Paulo, BR', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

class ProfessionalProfileDto {
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

class ExperienceDto {
  @ApiProperty({ example: 'Google' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  company: string;

  @ApiProperty({ example: 'Senior Engineer' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  position: string;

  @ApiProperty({ example: '2020-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2023-12-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCurrent: boolean;

  @ApiProperty({
    example: 'Developed scalable microservices...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'Mountain View, CA', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

class ExperiencesStepDto {
  @ApiProperty({ type: [ExperienceDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences?: ExperienceDto[];

  @ApiProperty({ example: false })
  @IsBoolean()
  noExperience: boolean;
}

class EducationDto {
  @ApiProperty({ example: 'MIT' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  institution: string;

  @ApiProperty({ example: "Bachelor's" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  degree: string;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  field: string;

  @ApiProperty({ example: '2015-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2019-05-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isCurrent: boolean;
}

class EducationStepDto {
  @ApiProperty({ type: [EducationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiProperty({ example: false })
  @IsBoolean()
  noEducation: boolean;
}

class SkillDto {
  @ApiProperty({ example: 'JavaScript' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'Programming Languages' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  category: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  level?: number;
}

class SkillsStepDto {
  @ApiProperty({ type: [SkillDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @ApiProperty({ example: false })
  @IsBoolean()
  noSkills: boolean;
}

class LanguageDto {
  @ApiProperty({ example: 'English' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'Fluent' })
  @IsString()
  level: string;
}

class ProjectDto {
  name: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  technologies?: string[];
}

class CertificationDto {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

class AwardDto {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

class InterestDto {
  name: string;
  description?: string;
}

class TemplateSelectionDto {
  @ApiProperty({
    example: 'professional',
    enum: ['professional', 'creative', 'minimal', 'modern'],
  })
  @IsString()
  template: string;

  @ApiProperty({
    example: 'ocean',
    enum: ['ocean', 'sunset', 'forest', 'lavender', 'rose', 'monochrome'],
  })
  @IsString()
  palette: string;
}

export class OnboardingDto {
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

// DTO for saving onboarding progress (partial data)
export class OnboardingProgressDto {
  @ApiProperty({
    example: 'personal-info',
    enum: [
      'welcome',
      'personal-info',
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  personalInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  professionalProfile?: {
    jobTitle?: string;
    summary?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  experiences?: Array<{
    id?: string;
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
    location?: string;
  }>;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  noExperience?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  education?: Array<{
    id?: string;
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }>;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  noEducation?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  skills?: Array<{
    id?: string;
    name?: string;
    category?: string;
    level?: number;
  }>;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  noSkills?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  languages?: Array<{
    id?: string;
    name?: string;
    level?: string;
  }>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  templateSelection?: {
    template?: string;
    palette?: string;
  };
}
