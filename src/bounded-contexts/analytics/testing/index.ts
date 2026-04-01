/**
 * Analytics Testing Module
 *
 * Unified testing utilities for all analytics bounded context tests.
 * Provides in-memory implementations replacing PrismaService mocks.
 *
 * Usage:
 *   import { createAnalyticsTestingModule } from '@/bounded-contexts/analytics/testing';
 *
 *   const { atsScoreRepo, benchmarkRepo, snapshotRepo, viewTrackingRepo, searchRepo } =
 *     createAnalyticsTestingModule();
 */

export * from '../resume-analytics/testing/in-memory-dashboard';
export * from '../search/testing/in-memory-search.service';
export * from '../share-analytics/testing/in-memory-share-analytics.repository';
export * from './in-memory-ats-score.repository';
export * from './in-memory-benchmark.repository';
export * from './in-memory-snapshot.repository';
export * from './in-memory-view-tracking.repository';

import {
  InMemorySnapshot,
  InMemoryViewTracking,
} from '../resume-analytics/testing/in-memory-dashboard';
import { InMemorySearchService } from '../search/testing/in-memory-search.service';
import { InMemoryShareAnalyticsRepository } from '../share-analytics/testing/in-memory-share-analytics.repository';
import { InMemoryATSScoreRepository } from './in-memory-ats-score.repository';
import { InMemoryBenchmarkRepository } from './in-memory-benchmark.repository';
import { InMemorySnapshotRepository } from './in-memory-snapshot.repository';
import { InMemoryViewTrackingRepository } from './in-memory-view-tracking.repository';

/**
 * Factory function to create all analytics testing repositories
 */
export function createAnalyticsTestingModule() {
  return {
    atsScoreRepo: new InMemoryATSScoreRepository(),
    benchmarkRepo: new InMemoryBenchmarkRepository(),
    snapshotRepo: new InMemorySnapshotRepository(),
    viewTrackingRepo: new InMemoryViewTrackingRepository(),
    searchRepo: new InMemorySearchService(),
    dashboardViewTracking: new InMemoryViewTracking(),
    dashboardSnapshot: new InMemorySnapshot(),
    shareAnalyticsRepo: new InMemoryShareAnalyticsRepository(),
  };
}

/**
 * Default test data for seeding
 */
export const defaultSectionTypes = [
  {
    key: 'work_experience_v1',
    semanticKind: 'WORK_EXPERIENCE',
    definition: {
      schemaVersion: 1,
      kind: 'WORK_EXPERIENCE',
      fields: [
        { key: 'company', type: 'string', semanticRole: 'ORGANIZATION' },
        { key: 'role', type: 'string', semanticRole: 'JOB_TITLE' },
        { key: 'startDate', type: 'date', semanticRole: 'START_DATE' },
        { key: 'description', type: 'string', semanticRole: 'DESCRIPTION' },
      ],
      ats: {
        isMandatory: true,
        recommendedPosition: 2,
        scoring: {
          baseScore: 30,
          fieldWeights: {
            ORGANIZATION: 20,
            JOB_TITLE: 20,
            START_DATE: 15,
            DESCRIPTION: 5,
          },
        },
      },
    },
  },
  {
    key: 'skill_set_v1',
    semanticKind: 'SKILL_SET',
    definition: {
      schemaVersion: 1,
      kind: 'SKILL_SET',
      fields: [
        { key: 'name', type: 'string', semanticRole: 'SKILL_NAME' },
        { key: 'category', type: 'string', semanticRole: 'CATEGORY' },
      ],
      ats: {
        isMandatory: true,
        recommendedPosition: 4,
        scoring: {
          baseScore: 40,
          fieldWeights: { SKILL_NAME: 50, CATEGORY: 10 },
        },
      },
    },
  },
  {
    key: 'education_v1',
    semanticKind: 'EDUCATION',
    definition: {
      schemaVersion: 1,
      kind: 'EDUCATION',
      fields: [
        { key: 'institution', type: 'string', semanticRole: 'ORGANIZATION' },
        { key: 'degree', type: 'string', semanticRole: 'DEGREE' },
      ],
      ats: {
        isMandatory: true,
        recommendedPosition: 3,
        scoring: {
          baseScore: 35,
          fieldWeights: { ORGANIZATION: 20, DEGREE: 25 },
        },
      },
    },
  },
];

export const defaultResumeAnalytics = [
  { atsScore: 60 },
  { atsScore: 70 },
  { atsScore: 75 },
  { atsScore: 80 },
  { atsScore: 90 },
];
