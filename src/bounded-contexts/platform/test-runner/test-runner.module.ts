/**
 * Test Runner Module
 *
 * Thin Nest shell over `buildTestRunnerUseCases`. The stateful
 * `TestRunnerService` (which extends `TestSuiteRunnerPort` and depends
 * on Prisma + social services) stays as a Nest provider; the
 * composition takes the runner port as a parameter. HTTP surface is
 * described as `Route` descriptors in `test-runner.routes.ts`.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SocialModule } from '@/bounded-contexts/social/social.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { TestRunnerUseCases } from './application/ports/test-runner.port';
import { TestSuiteRunnerPort } from './domain/ports/test-suite-runner.port';
import { buildTestRunnerUseCases } from './test-runner.composition';
import { testRunnerRoutes } from './test-runner.routes';
import { TestRunnerService } from './test-runner.service';

@Module({
  imports: [PrismaModule, LoggerModule, SocialModule],
  controllers: synthesizeRouteControllers(TestRunnerUseCases, testRunnerRoutes),
  providers: [
    TestRunnerService,
    { provide: TestSuiteRunnerPort, useExisting: TestRunnerService },
    {
      provide: TestRunnerUseCases,
      useFactory: (runner: TestSuiteRunnerPort) => buildTestRunnerUseCases(runner),
      inject: [TestSuiteRunnerPort],
    },
  ],
  exports: [TestRunnerUseCases],
})
export class TestRunnerModule {}
