/**
 * Test Runner Module
 *
 * Thin Nest shell over `buildTestRunnerUseCases`. The stateful
 * `TestRunnerService` (which extends `TestSuiteRunnerPort` and depends
 * on Prisma + social services) stays as a Nest provider; the
 * composition takes the runner port as a parameter.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SocialModule } from '@/bounded-contexts/social/social.module';
import { TestRunnerUseCases } from './application/ports/test-runner.port';
import { TestSuiteRunnerPort } from './domain/ports/test-suite-runner.port';
import { TestRunnerController } from './infrastructure/controllers/test-runner.controller';
import { buildTestRunnerUseCases } from './test-runner.composition';
import { TestRunnerService } from './test-runner.service';

@Module({
  imports: [PrismaModule, LoggerModule, SocialModule],
  controllers: [TestRunnerController],
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
