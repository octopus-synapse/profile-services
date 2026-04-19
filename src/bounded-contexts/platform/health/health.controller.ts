import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { type DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  DatabaseHealthIndicator,
  OpenAIHealthIndicator,
  RedisHealthIndicator,
  SmtpHealthIndicator,
  StorageHealthIndicator,
  TranslateHealthIndicator,
} from './indicators';

/** DTO wrapper for HealthCheckResult to satisfy Dto suffix rule */
export class HealthCheckResultDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error', 'shutting_down'] })
  status!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  info?: Record<string, { status: string }>;

  @ApiProperty({ type: 'object', additionalProperties: true })
  error?: Record<string, { status: string; message?: string }>;

  @ApiProperty({ type: 'object', additionalProperties: true })
  details?: Record<string, { status: string }>;
}

@SdkExport({
  tag: 'platform',
  description: 'Health Check API',
  requiresAuth: false,
})
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private redis: RedisHealthIndicator,
    private storage: StorageHealthIndicator,
    private translate: TranslateHealthIndicator,
    private smtp: SmtpHealthIndicator,
    private openai: OpenAIHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Run all health checks' })
  @ApiDataResponse(HealthCheckResultDto, {
    description: 'Aggregated health status',
  })
  async check(): Promise<DataResponse<HealthCheckResultDto>> {
    const result = await this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.storage.isHealthy('storage'),
      () => this.translate.isHealthy('translate'),
      () => this.smtp.isHealthy('smtp'),
      () => this.openai.isHealthy('openai'),
    ]);
    return { success: true, data: result as HealthCheckResultDto };
  }

  @Public()
  @Get('smtp')
  @HealthCheck()
  @ApiOperation({ summary: 'Run SMTP/email provider health check' })
  @ApiDataResponse(HealthCheckResultDto, { description: 'SMTP health status' })
  async checkSmtp(): Promise<DataResponse<HealthCheckResultDto>> {
    const result = await this.health.check([() => this.smtp.isHealthy('smtp')]);
    return { success: true, data: result as HealthCheckResultDto };
  }

  @Public()
  @Get('openai')
  @HealthCheck()
  @ApiOperation({ summary: 'Run OpenAI configuration health check' })
  @ApiDataResponse(HealthCheckResultDto, { description: 'OpenAI health status' })
  async checkOpenAI(): Promise<DataResponse<HealthCheckResultDto>> {
    const result = await this.health.check([() => this.openai.isHealthy('openai')]);
    return { success: true, data: result as HealthCheckResultDto };
  }

  @Public()
  @Get('db')
  @HealthCheck()
  @ApiOperation({ summary: 'Run database health check' })
  @ApiDataResponse(HealthCheckResultDto, {
    description: 'Database health status',
  })
  async checkDatabase(): Promise<DataResponse<HealthCheckResultDto>> {
    const result = await this.health.check([() => this.db.isHealthy('database')]);
    return { success: true, data: result as HealthCheckResultDto };
  }

  @Public()
  @Get('redis')
  @HealthCheck()
  @ApiOperation({ summary: 'Run redis health check' })
  @ApiDataResponse(HealthCheckResultDto, { description: 'Redis health status' })
  async checkRedis(): Promise<DataResponse<HealthCheckResultDto>> {
    const result = await this.health.check([() => this.redis.isHealthy('redis')]);
    return { success: true, data: result as HealthCheckResultDto };
  }

  @Public()
  @Get('storage')
  @HealthCheck()
  @ApiOperation({ summary: 'Run storage health check' })
  @ApiDataResponse(HealthCheckResultDto, {
    description: 'Storage health status',
  })
  async checkStorage(): Promise<DataResponse<HealthCheckResultDto>> {
    const result = await this.health.check([() => this.storage.isHealthy('storage')]);
    return { success: true, data: result as HealthCheckResultDto };
  }

  @Public()
  @Get('translate')
  @HealthCheck()
  @ApiOperation({ summary: 'Run translation service health check' })
  @ApiDataResponse(HealthCheckResultDto, {
    description: 'Translation service health status',
  })
  async checkTranslate(): Promise<DataResponse<HealthCheckResultDto>> {
    const result = await this.health.check([() => this.translate.isHealthy('translate')]);
    return { success: true, data: result as HealthCheckResultDto };
  }
}
