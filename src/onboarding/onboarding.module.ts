import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumeOnboardingService } from './services/resume-onboarding.service';
import { SkillsOnboardingService } from './services/skills-onboarding.service';
import { ExperienceOnboardingService } from './services/experience-onboarding.service';
import { EducationOnboardingService } from './services/education-onboarding.service';
import { LanguagesOnboardingService } from './services/languages-onboarding.service';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    ResumeOnboardingService,
    SkillsOnboardingService,
    ExperienceOnboardingService,
    EducationOnboardingService,
    LanguagesOnboardingService,
  ],
  exports: [OnboardingService],
})
export class OnboardingModule {}
