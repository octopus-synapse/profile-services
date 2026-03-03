import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { EducationOnboardingService } from './services/education-onboarding.service';
import { ExperienceOnboardingService } from './services/experience-onboarding.service';
import { LanguagesOnboardingService } from './services/languages-onboarding.service';
import {
  buildOnboardingProgressUseCases,
  ONBOARDING_PROGRESS_USE_CASES,
} from './services/onboarding-progress/onboarding-progress.composition';
import { OnboardingProgressService } from './services/onboarding-progress.service';
import { ResumeOnboardingService } from './services/resume-onboarding.service';
import { ResumeSectionOnboardingService } from './services/resume-section-onboarding.service';
import { SkillsOnboardingService } from './services/skills-onboarding.service';

@Module({
  imports: [PrismaModule],
  controllers: [OnboardingController],
  providers: [
    ResumeOnboardingService,
    ResumeSectionOnboardingService,
    SkillsOnboardingService,
    ExperienceOnboardingService,
    EducationOnboardingService,
    LanguagesOnboardingService,
    {
      provide: ONBOARDING_PROGRESS_USE_CASES,
      useFactory: (prisma: PrismaService) => buildOnboardingProgressUseCases(prisma),
      inject: [PrismaService],
    },
    OnboardingProgressService,
    OnboardingService,
  ],
  exports: [OnboardingService],
})
export class OnboardingModule {}
