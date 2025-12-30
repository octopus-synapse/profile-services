import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumeOnboardingService } from './services/resume-onboarding.service';
import { SkillsOnboardingService } from './services/skills-onboarding.service';
import { ExperienceOnboardingService } from './services/experience-onboarding.service';
import { EducationOnboardingService } from './services/education-onboarding.service';
import { LanguagesOnboardingService } from './services/languages-onboarding.service';
import { OnboardingProgressService } from './services/onboarding-progress.service';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController],
  providers: [
    ResumeOnboardingService,
    SkillsOnboardingService,
    ExperienceOnboardingService,
    EducationOnboardingService,
    LanguagesOnboardingService,
    OnboardingProgressService,
    OnboardingService,
  ],
  exports: [OnboardingService],
})
export class OnboardingModule {}
