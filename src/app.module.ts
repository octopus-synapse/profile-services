import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminAnalyticsModule } from '@/bounded-contexts/analytics/admin/admin-analytics.module';
import { PlatformEventsModule } from '@/bounded-contexts/analytics/platform-events/platform-events.module';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { SearchModule } from '@/bounded-contexts/analytics/search/search.module';
// Analytics Context
import { ShareAnalyticsModule } from '@/bounded-contexts/analytics/share-analytics/share-analytics.module';
// ATS Context
import { ATSModule } from '@/bounded-contexts/ats-validation/ats/ats.module';
// Automation Context (Weekly Curated + Auto-Apply)
import { AutomationModule } from '@/bounded-contexts/automation/automation.module';
// Badges
import { BadgesModule } from '@/bounded-contexts/badges/badges.module';
// Collaboration Context
import { AdminCollaborationModule } from '@/bounded-contexts/collaboration/admin/admin-collaboration.module';
import { CollaborationModule } from '@/bounded-contexts/collaboration/collaboration.module';
// DSL Context
import { DslModule } from '@/bounded-contexts/dsl';
// Export Context
import { ExportModule } from '@/bounded-contexts/export/export.module';
// Feed Context
import { FeedModule } from '@/bounded-contexts/feed/feed.module';
// Identity Context
import { IdentityModule } from '@/bounded-contexts/identity';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization/authorization.module';
import { EmailVerifiedGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/email-verified.guard';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure/guards/jwt-auth.guard';
import { UsersModule } from '@/bounded-contexts/identity/users/users.module';
// Import Context
import { ImportModule } from '@/bounded-contexts/import';
// Integration Context
import { IntegrationModule } from '@/bounded-contexts/integration';
// Jobs Context
import { JobsModule } from '@/bounded-contexts/jobs/jobs.module';
// Notifications Context
import { NotificationsModule } from '@/bounded-contexts/notifications/notifications.module';
// Onboarding Context
import { OnboardingModule } from '@/bounded-contexts/onboarding';
import { AuditLogModule } from '@/bounded-contexts/platform/common/audit/audit-log.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { validate } from '@/bounded-contexts/platform/common/config/env.validation';
// Core & Platform
import { CustomThrottlerGuard } from '@/bounded-contexts/platform/common/guards/custom-throttler.guard';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PlatformModule } from '@/bounded-contexts/platform/common/platform.module';
import { HealthModule } from '@/bounded-contexts/platform/health/health.module';
import { MetricsModule } from '@/bounded-contexts/platform/metrics/metrics.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
// Test Runner
import { TestRunnerModule } from '@/bounded-contexts/platform/test-runner/test-runner.module';
import { UiMetadataModule } from '@/bounded-contexts/platform/ui-metadata/ui-metadata.module';
import { WebhookModule } from '@/bounded-contexts/platform/webhooks/webhook.module';
import { PublicResumesModule } from '@/bounded-contexts/presentation/public-resumes/public-resumes.module';
// Presentation Context
import { ThemesModule } from '@/bounded-contexts/presentation/themes/themes.module';
// Resumes Context
import { ResumesModule } from '@/bounded-contexts/resumes';
// Skills Catalog Context
import { AdminCatalogModule } from '@/bounded-contexts/skills-catalog/admin/admin-catalog.module';
import { SkillsModule } from '@/bounded-contexts/skills-catalog/skills/skills.module';
import { SpokenLanguagesModule } from '@/bounded-contexts/skills-catalog/spoken-languages/spoken-languages.module';
import { TechSkillsModule } from '@/bounded-contexts/skills-catalog/tech-skills/tech-skills.module';
// Social Context (Activity Feed)
import { SocialModule } from '@/bounded-contexts/social/social.module';
// Success Stories
import { SuccessStoriesModule } from '@/bounded-contexts/success-stories/success-stories.module';
// Translation Context
import { TranslationModule } from '@/bounded-contexts/translation';
import { RATE_LIMIT_CONFIG } from '@/shared-kernel';
// Shared Kernel
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { DomainExceptionFilter } from '@/shared-kernel/filters/domain-exception.filter';
import { ApiResponseInterceptor } from '@/shared-kernel/interceptors/api-response.interceptor';
import { HumanRelativeInterceptor } from '@/shared-kernel/interceptors/human-relative.interceptor';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT_CONFIG.TTL_MS,
        limit: RATE_LIMIT_CONFIG.MAX_REQUESTS,
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
          },
          // Keep failed jobs for 30d and cap count so Redis doesn't grow
          // unbounded. Operators can inspect/retry from the BullMQ board.
          removeOnFail: {
            age: 30 * 24 * 3600,
            count: 5000,
          },
        },
      }),
    }),
    BullModule.registerQueue({ name: 'dead-letter' }),

    // Infrastructure & Core
    EventBusModule,
    LoggerModule,
    CacheModule,
    AuditLogModule,
    PrismaModule,
    PlatformModule,
    HealthModule,
    MetricsModule,
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
    AdminCatalogModule,
    TranslationModule,
    ATSModule,
    PublicResumesModule,
    ShareAnalyticsModule,
    ResumeAnalyticsModule,
    SearchModule,
    AdminAnalyticsModule,
    PlatformEventsModule,
    CollaborationModule,
    AdminCollaborationModule,
    SocialModule,
    FeedModule,
    JobsModule,
    AutomationModule,
    BadgesModule,
    SuccessStoriesModule,
    NotificationsModule,
    TestRunnerModule,
    WebhookModule,
    UiMetadataModule,
  ],
  controllers: [AppController],
  providers: [
    // Domain → HTTP exception mapping
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    // Global Interceptor (wraps responses with { success, data })
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    // Adds `<key>AtRelative` siblings to every ISO date in the response so
    // the UI never needs a date-formatting library.
    {
      provide: APP_INTERCEPTOR,
      useClass: HumanRelativeInterceptor,
    },
    // Global Guards (order matters: Throttler → JWT Auth)
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Runs after JwtAuthGuard — denies access unless @AllowUnverifiedEmail()
    // decorates the handler (or route is @Public). Can be disabled in E2E via
    // SKIP_EMAIL_VERIFICATION=true.
    {
      provide: APP_GUARD,
      useClass: EmailVerifiedGuard,
    },
  ],
})
export class AppModule {}
