/**
 * DSL Migrator v1.0.0 → v2.0.0
 * Example migrator showing how to handle breaking changes
 */

import type { ResumeDsl } from '@/bounded-contexts/dsl/domain/schemas/dsl';
import { LoggerPort } from '@/shared-kernel/logger';
import type { DslMigrator } from './base.migrator';

export class DslV1ToV2Migrator implements DslMigrator {
  readonly fromVersion = '1.0.0';
  readonly toVersion = '2.0.0';

  constructor(private readonly logger: LoggerPort) {}

  migrate(dsl: ResumeDsl): ResumeDsl {
    this.logger.log('Migrating DSL from v1.0.0 to v2.0.0', 'DslV1ToV2Migrator');

    // Example migration: Just update version
    // In real scenarios, this would handle actual schema changes
    const migratedDsl: ResumeDsl = { ...dsl, version: this.toVersion };

    this.logger.log('Migration v1→v2 completed', 'DslV1ToV2Migrator');
    return migratedDsl;
  }
}
