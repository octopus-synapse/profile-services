import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { EducationOnboardingService } from './services/education-onboarding.service';
import { ExperienceOnboardingService } from './services/experience-onboarding.service';
import { LanguagesOnboardingService } from './services/languages-onboarding.service';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { ResumeOnboardingService } from './services/resume-onboarding.service';
import { SkillsOnboardingService } from './services/skills-onboarding.service';

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
