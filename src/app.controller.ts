import { Controller, Get, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('version')
  getVersion(): {
    service: string;
    version: string;
    contracts_version: string;
    environment: string;
    deployed_at: string;
    git_tag: string;
    is_rollback: boolean;
  } {
    // Read package.json for fallback version
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
    ) as PackageJson;

    // Try to read deployment manifest
    let manifest: DeploymentManifest | null = null;
    try {
      const manifestPath = '/opt/deployment-manifest.json';
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(
          fs.readFileSync(manifestPath, 'utf-8'),
        ) as DeploymentManifest;
      }
    } catch {
      // Manifest not available, use package.json only
    }

    return {
      service: 'profile-services',
      version: manifest?.versions.services ?? `v${packageJson.version}`,
      contracts_version:
        manifest?.versions.contracts ??
        packageJson.dependencies['@/shared-kernel'],
      environment: manifest?.environment ?? 'development',
      deployed_at: manifest?.timestamp ?? 'unknown',
      git_tag: manifest?.git_tags.services ?? `v${packageJson.version}`,
      is_rollback: manifest?.rollback ?? false,
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
  @ApiResponse({
    status: 200,
    description: 'OpenAPI specification in JSON format',
  })
  getOpenApiSpec(@Res() res: Response): void {
    const swaggerPath = path.join(__dirname, '../swagger.json');

    if (!fs.existsSync(swaggerPath)) {
      res.status(404).json({
        error: 'OpenAPI specification not found',
        message: 'Run `bun run swagger:generate` to generate the specification',
      });
      return;
    }

    const swagger = fs.readFileSync(swaggerPath, 'utf-8');
    res.send(swagger);
  }
}
