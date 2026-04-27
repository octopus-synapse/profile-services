import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ListTestSuitesUseCase } from '../../application/use-cases/list-test-suites/list-test-suites.use-case';
import { RunTestSuiteUseCase } from '../../application/use-cases/run-test-suite/run-test-suite.use-case';

@ApiTags('Admin - Test Runner')
@Controller('v1/admin/test')
export class TestRunnerController {
  constructor(
    private readonly runTestSuite: RunTestSuiteUseCase,
    private readonly listTestSuites: ListTestSuitesUseCase,
  ) {}

  @Post('run')
  @RequirePermission(Permission.ADMIN_FULL_ACCESS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run a test suite' })
  async runTests(@Body() body: { suite: string }): Promise<DataResponse<Record<string, unknown>>> {
    const results = await this.runTestSuite.execute(body.suite);
    return { success: true, data: results as unknown as Record<string, unknown> };
  }

  @Get('suites')
  @RequirePermission(Permission.ADMIN_FULL_ACCESS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List available test suites' })
  async getSuites(): Promise<DataResponse<{ suites: string[] }>> {
    return {
      success: true,
      data: { suites: this.listTestSuites.execute() },
    };
  }
}
