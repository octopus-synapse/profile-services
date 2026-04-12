import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { SearchModule } from '@/bounded-contexts/analytics/search/search.module';
// Analytics Context
import { ShareAnalyticsModule } from '@/bounded-contexts/analytics/share-analytics/share-analytics.module';
// ATS Context
import { ATSModule } from '@/bounded-contexts/ats-validation/ats/ats.module';
// Collaboration Context
import { CollaborationModule } from '@/bounded-contexts/collaboration/collaboration.module';
// DSL Context
import { DslModule } from '@/bounded-contexts/dsl';
// Export Context
import { ExportModule } from '@/bounded-contexts/export/export.module';
// Identity Context
import { IdentityModule } from '@/bounded-contexts/identity';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization/authorization.module';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { UsersModule } from '@/bounded-contexts/identity/users/users.module';
// Import Context
import { ImportModule } from '@/bounded-contexts/import';
// Integration Context
import { IntegrationModule } from '@/bounded-contexts/integration';
// Onboarding Context
import { OnboardingModule } from '@/bounded-contexts/onboarding';
import { AuditLogModule } from '@/bounded-contexts/platform/common/audit/audit-log.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { validate } from '@/bounded-contexts/platform/common/config/env.validation';
// Core & Platform
import { CustomThrottlerGuard } from '@/bounded-contexts/platform/common/guards/custom-throttler.guard';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PlatformModule } from '@/bounded-contexts/platform/common/platform.module';
import { GraphqlModule } from '@/bounded-contexts/platform/graphql/graphql.module';
import { HealthModule } from '@/bounded-contexts/platform/health/health.module';
import { MetricsModule } from '@/bounded-contexts/platform/metrics/metrics.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PublicResumesModule } from '@/bounded-contexts/presentation/public-resumes/public-resumes.module';
// Presentation Context
import { ThemesModule } from '@/bounded-contexts/presentation/themes/themes.module';
// Resumes Context
import { ResumesModule } from '@/bounded-contexts/resumes';
// Skills Catalog Context
import { SkillsModule } from '@/bounded-contexts/skills-catalog/skills/skills.module';
import { SpokenLanguagesModule } from '@/bounded-contexts/skills-catalog/spoken-languages/spoken-languages.module';
import { TechSkillsModule } from '@/bounded-contexts/skills-catalog/tech-skills/tech-skills.module';
// Social Context (Activity Feed)
import { SocialModule } from '@/bounded-contexts/social/social.module';
// Translation Context
import { TranslationModule } from '@/bounded-contexts/translation';
import { RATE_LIMIT_CONFIG } from '@/shared-kernel';
// Shared Kernel
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT_CONFIG.TTL_MS,
        limit: RATE_LIMIT_CONFIG.MAX_REQUESTS,
      },
    ]),

    // Infrastructure & Core
    EventBusModule,
    LoggerModule,
    CacheModule,
    AuditLogModule,
    PrismaModule,
    PlatformModule,
    HealthModule,
    MetricsModule,
    GraphqlModule,

    // Domain Modules
    AuthorizationModule,
    IdentityModule,
    UsersModule,
    ResumesModule,
    DslModule,
    OnboardingModule,
    ExportModule,
    ImportModule,
    IntegrationModule,
    ThemesModule,
    TechSkillsModule,
    SkillsModule,
    SpokenLanguagesModule,
    TranslationModule,
    ATSModule,
    PublicResumesModule,
    ShareAnalyticsModule,
    ResumeAnalyticsModule,
    SearchModule,
    CollaborationModule,
    SocialModule,
  ],
  controllers: [AppController],
  providers: [
    // Global Guards (order matters: Throttler → JWT Auth)
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
