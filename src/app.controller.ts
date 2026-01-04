import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';

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
    );

    // Try to read deployment manifest
    let manifest: DeploymentManifest | null = null;
    try {
      const manifestPath = '/opt/deployment-manifest.json';
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      }
    } catch (error) {
      // Manifest not available, use package.json only
    }

    return {
      service: 'profile-services',
      version: manifest?.versions.services || `v${packageJson.version}`,
      contracts_version:
        manifest?.versions.contracts ||
        packageJson.dependencies['@octopus-synapse/profile-contracts'],
      environment: manifest?.environment || 'development',
      deployed_at: manifest?.timestamp || 'unknown',
      git_tag: manifest?.git_tags.services || `v${packageJson.version}`,
      is_rollback: manifest?.rollback || false,
    };
  }
}
