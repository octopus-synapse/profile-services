/**
 * DSL Migration Service
 * Handles version migrations for ResumeDSL schemas
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import type { ResumeDsl } from '@octopus-synapse/profile-contracts';
import type { DslMigrator } from './base.migrator';

@Injectable()
export class DslMigrationService {
  private readonly logger = new Logger(DslMigrationService.name);
  private readonly migrators = new Map<string, DslMigrator>();

  /**
   * Register migrators during module initialization
   */
  registerMigrators(migrators: DslMigrator[]): void {
    for (const migrator of migrators) {
      this.logger.log(
        `Registering migrator: ${migrator.fromVersion} → ${migrator.toVersion}`,
      );
      this.migrators.set(migrator.fromVersion, migrator);
    }
  }

  /**
   * Migrate DSL to target version
   * Applies migration chain if needed (e.g., 1.0.0 → 1.1.0 → 2.0.0)
   */
  migrate(dsl: ResumeDsl, targetVersion: string): ResumeDsl {
    this.logger.log(`Migrating DSL from ${dsl.version} to ${targetVersion}`);

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
        throw new BadRequestException(
          `Circular migration detected at version ${currentVersion}`,
        );
      }
      visitedVersions.add(currentVersion);

      // Get migrator for current version
      const migrator = this.migrators.get(currentVersion);
      if (!migrator) {
        throw new BadRequestException(
          `No migrator found for version ${currentVersion}. Cannot migrate to ${targetVersion}`,
        );
      }

      // Apply migration
      this.logger.log(
        `Applying migrator: ${migrator.fromVersion} → ${migrator.toVersion}`,
      );
      currentDsl = migrator.migrate(currentDsl);
      currentVersion = migrator.toVersion;

      // Validate migration result
      if (currentDsl.version !== currentVersion) {
        throw new BadRequestException(
          `Migration failed: expected version ${currentVersion}, got ${currentDsl.version}`,
        );
      }
    }

    this.logger.log(`Migration completed: ${dsl.version} → ${targetVersion}`);
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
        throw new BadRequestException(`Circular migration path detected`);
      }
      visitedVersions.add(currentVersion);

      const migrator = this.migrators.get(currentVersion);
      if (!migrator) {
        throw new BadRequestException(
          `No migration path from ${fromVersion} to ${toVersion}`,
        );
      }

      currentVersion = migrator.toVersion;
      path.push(currentVersion);
    }

    return path;
  }
}
