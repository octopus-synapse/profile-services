/**
 * DSL Migrator v1.0.0 → v2.0.0
 * Example migrator showing how to handle breaking changes
 */

import { Injectable, Logger } from '@nestjs/common';
import type { ResumeDsl } from '@/shared-kernel';
import type { DslMigrator } from './base.migrator';

@Injectable()
export class DslV1ToV2Migrator implements DslMigrator {
  private readonly logger = new Logger(DslV1ToV2Migrator.name);

  readonly fromVersion = '1.0.0';
  readonly toVersion = '2.0.0';

  migrate(dsl: ResumeDsl): ResumeDsl {
    this.logger.log('Migrating DSL from v1.0.0 to v2.0.0');

    // Example migration: Just update version
    // In real scenarios, this would handle actual schema changes
    const migratedDsl: ResumeDsl = {
      ...dsl,
      version: this.toVersion,
    };

    this.logger.log('Migration v1→v2 completed');
    return migratedDsl;
  }
}
