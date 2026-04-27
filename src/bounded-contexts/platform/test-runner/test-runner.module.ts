/**
 * Test Runner Module
 *
 * ADR-001: smoke-test suites are dispatched through POJO use cases
 * (`RunTestSuiteUseCase`, `ListTestSuitesUseCase`) that depend on
 * `TestSuiteRunnerPort`. The Prisma + social-services-backed
 * `TestRunnerService` extends the port and is the single adapter.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SocialModule } from '@/bounded-contexts/social/social.module';
import { ListTestSuitesUseCase } from './application/use-cases/list-test-suites/list-test-suites.use-case';
import { RunTestSuiteUseCase } from './application/use-cases/run-test-suite/run-test-suite.use-case';
import { TestSuiteRunnerPort } from './domain/ports/test-suite-runner.port';
import { TestRunnerController } from './infrastructure/controllers/test-runner.controller';
import { TestRunnerService } from './test-runner.service';

@Module({
  imports: [PrismaModule, LoggerModule, SocialModule],
  controllers: [TestRunnerController],
  providers: [
    TestRunnerService,
    { provide: TestSuiteRunnerPort, useExisting: TestRunnerService },
    {
      provide: RunTestSuiteUseCase,
      useFactory: (runner: TestSuiteRunnerPort) => new RunTestSuiteUseCase(runner),
      inject: [TestSuiteRunnerPort],
    },
    {
      provide: ListTestSuitesUseCase,
      useFactory: (runner: TestSuiteRunnerPort) => new ListTestSuitesUseCase(runner),
      inject: [TestSuiteRunnerPort],
    },
  ],
})
export class TestRunnerModule {}
