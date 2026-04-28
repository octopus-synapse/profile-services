/**
 * DSL Migration Service
 * Handles version migrations for ResumeDSL schemas
 */

import { Injectable } from '@nestjs/common';
import type { ResumeDsl } from '@/bounded-contexts/dsl/domain/schemas/dsl';
import { LoggerPort } from '@/shared-kernel';
import {
  DslMigrationLoopException,
  DslMigrationPathNotFoundException,
  DslMigrationResultVersionMismatchException,
} from '../../domain/exceptions/dsl.exceptions';
import type { DslMigrator } from './base.migrator';

@Injectable()
export class DslMigrationService {
  private readonly migrators = new Map<string, DslMigrator>();

  constructor(private readonly logger: LoggerPort) {}

  /**
   * Register migrators during module initialization
   */
  registerMigrators(migrators: DslMigrator[]): void {
    for (const migrator of migrators) {
      this.logger.log(
        `Registering migrator: ${migrator.fromVersion} → ${migrator.toVersion}`,
        'DslMigrationService',
      );
      this.migrators.set(migrator.fromVersion, migrator);
    }
  }

  /**
   * Migrate DSL to target version
   * Applies migration chain if needed (e.g., 1.0.0 → 1.1.0 → 2.0.0)
   */
  migrate(dsl: ResumeDsl, targetVersion: string): ResumeDsl {
    this.logger.log(`Migrating DSL from ${dsl.version} to ${targetVersion}`, 'DslMigrationService');

    let currentDsl = dsl;
    let currentVersion = dsl.version;

    // Already at target version
    if (currentVersion === targetVersion) {
      return currentDsl;
    }

    // Apply migration chain
    const visitedVersions = new Set<string>();
    while (currentVersion !== targetVersion) {
      // Detect circular migration
      if (visitedVersions.has(currentVersion)) {
        throw new DslMigrationLoopException(currentVersion);
      }
      visitedVersions.add(currentVersion);

      const migrator = this.migrators.get(currentVersion);
      if (!migrator) {
        throw new DslMigrationPathNotFoundException(currentVersion, targetVersion);
      }

      // Apply migration
      this.logger.log(
        `Applying migrator: ${migrator.fromVersion} → ${migrator.toVersion}`,
        'DslMigrationService',
      );
      currentDsl = migrator.migrate(currentDsl);
      currentVersion = migrator.toVersion;

      // Validate migration result
      if (currentDsl.version !== currentVersion) {
        throw new DslMigrationResultVersionMismatchException(currentVersion, currentDsl.version);
      }
    }

    this.logger.log(
      `Migration completed: ${dsl.version} → ${targetVersion}`,
      'DslMigrationService',
    );
    return currentDsl;
  }

  /**
   * Check if migration is available from source to target
   */
  canMigrate(fromVersion: string, toVersion: string): boolean {
    if (fromVersion === toVersion) return true;

    let currentVersion = fromVersion;
    const visitedVersions = new Set<string>();

    while (currentVersion !== toVersion) {
      if (visitedVersions.has(currentVersion)) return false;
      visitedVersions.add(currentVersion);

      const migrator = this.migrators.get(currentVersion);
      if (!migrator) return false;

      currentVersion = migrator.toVersion;
    }

    return true;
  }

  /**
   * Get migration path from source to target
   */
  getMigrationPath(fromVersion: string, toVersion: string): string[] {
    if (fromVersion === toVersion) return [fromVersion];

    const path: string[] = [fromVersion];
    let currentVersion = fromVersion;
    const visitedVersions = new Set<string>();

    while (currentVersion !== toVersion) {
      if (visitedVersions.has(currentVersion)) {
        throw new DslMigrationLoopException();
      }
      visitedVersions.add(currentVersion);

      const migrator = this.migrators.get(currentVersion);
      if (!migrator) {
        throw new DslMigrationPathNotFoundException(fromVersion, toVersion);
      }

      currentVersion = migrator.toVersion;
      path.push(currentVersion);
    }

    return path;
  }
}
