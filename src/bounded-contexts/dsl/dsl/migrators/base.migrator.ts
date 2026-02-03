/**
 * Base DSL Migrator Interface
 * Defines contract for DSL version migrations
 */

import type { ResumeDsl } from '@octopus-synapse/profile-contracts';

export interface DslMigrator {
  /**
   * Source version this migrator handles
   */
  readonly fromVersion: string;

  /**
   * Target version after migration
   */
  readonly toVersion: string;

  /**
   * Migrate DSL from fromVersion to toVersion
   * @throws Error if migration fails
   */
  migrate(dsl: ResumeDsl): ResumeDsl;
}
