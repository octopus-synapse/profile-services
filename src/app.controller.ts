import * as fs from 'node:fs';
import * as path from 'node:path';
import { Controller, Get, Header, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { AppService } from './app.service';
import {
  HealthDataDto,
  HelloDataDto,
  OpenApiSpecDataDto,
  VersionDataDto,
} from './dto/app-response.dto';

interface PackageJson {
  version: string;
  dependencies: Record<string, string>;
}

interface DeploymentManifest {
  timestamp: string;
  environment: string;
  deployed_by: string;
  versions: {
    services: string;
    contracts: string;
    frontend: string;
  };
  git_tags: {
    services: string;
    contracts: string;
    frontend: string;
  };
  rollback?: boolean;
  rollback_from_timestamp?: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Default application hello endpoint' })
  @ApiDataResponse(HelloDataDto, { description: 'Application hello response' })
  getHello(): DataResponse<HelloDataDto> {
    return {
      success: true,
      data: { message: this.appService.getHello() },
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Basic application health endpoint' })
  @ApiDataResponse(HealthDataDto, { description: 'Basic health status' })
  getHealth(): DataResponse<HealthDataDto> {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
    return {
      success: true,
      data: health,
      ...health,
    } as DataResponse<HealthDataDto> & HealthDataDto;
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Get service version and deployment metadata' })
  @ApiDataResponse(VersionDataDto, { description: 'Service version payload' })
  getVersion(): DataResponse<VersionDataDto> {
    // Read package.json for fallback version
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
    ) as PackageJson;

    // Try to read deployment manifest
    let manifest: DeploymentManifest | null = null;
    try {
      const manifestPath = '/opt/deployment-manifest.json';
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as DeploymentManifest;
      }
    } catch {
      // Manifest not available, use package.json only
    }

    return {
      success: true,
      data: {
        service: 'profile-services',
        version: manifest?.versions.services ?? `v${packageJson.version}`,
        contracts_version:
          manifest?.versions.contracts ?? packageJson.dependencies['@/shared-kernel'],
        environment: manifest?.environment ?? 'development',
        deployed_at: manifest?.timestamp ?? 'unknown',
        git_tag: manifest?.git_tags.services ?? `v${packageJson.version}`,
        is_rollback: manifest?.rollback ?? false,
      },
    };
  }

  /**
   * Exposes the generated OpenAPI/Swagger specification.
   * This is the SINGLE SOURCE OF TRUTH for all API contracts.
   * Frontend SDK generation should consume this endpoint.
   */
  @Public()
  @Get('openapi.json')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=60')
  @Header('Access-Control-Allow-Origin', '*')
  @ApiTags('platform')
  @ApiOperation({
    summary: 'Get OpenAPI specification',
    description:
      'Returns the complete OpenAPI 3.0 specification for SDK generation. This is the single source of truth for all API contracts.',
  })
  @ApiDataResponse(OpenApiSpecDataDto, {
    description: 'OpenAPI specification in JSON format',
  })
  getOpenApiSpec(): DataResponse<OpenApiSpecDataDto> {
    const swaggerPath = path.join(__dirname, '../swagger.json');

    if (!fs.existsSync(swaggerPath)) {
      throw new NotFoundException(
        'OpenAPI specification not found. Run `bun run swagger:generate` to generate it.',
      );
    }

    const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf-8')) as Record<string, object>;
    return {
      success: true,
      data: { spec: swagger },
    };
  }
}
