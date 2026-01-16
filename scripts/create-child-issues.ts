#!/usr/bin/env node
/**
 * Create child issues for roadmap epics
 * Run after epics are created (#63-#68)
 */

import { execSync } from 'child_process';

const REPOSITORY = 'octopus-synapse/profile-services';

interface EpicMapping {
  readonly SHARING: number;
  readonly EXPORT: number;
  readonly ANALYTICS: number;
  readonly AI: number;
  readonly GRAPHQL: number;
  readonly OBSERVABILITY: number;
  readonly GDPR: number;
  readonly MARKETPLACE: number;
}

const EPIC_MAPPING: EpicMapping = {
  SHARING: 63,
  EXPORT: 64,
  ANALYTICS: 65,
  AI: 66,
  GRAPHQL: 67,
  OBSERVABILITY: 68,
  GDPR: 69, // Will create manually if needed
  MARKETPLACE: 70, // Will create manually if needed
};

function executeCommand(command: string): string | null {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    return result;
  } catch (error) {
    console.error(
      `❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

function createGitHubIssue(
  title: string,
  labels: string,
  milestone: string,
  body: string,
  epicNumber: number,
): string | null {
  const bodyWithEpic = `Part of #${epicNumber}\n\n${body}`;
  const command = `gh issue create --repo ${REPOSITORY} --title "${title}" --label "${labels}" --milestone "${milestone}" --body "${bodyWithEpic}"`;

  const result = executeCommand(command);
  if (result) {
    const match = result.match(/issues\/(\d+)/);
    if (match) {
      console.log(`✅ #${match[1]}: ${title}`);
      return match[1];
    }
  }
  return null;
}

function createGdprComplianceIssues(): void {
  console.log('🚀 Creating GDPR Compliance issues (CRITICAL)...\n');

  const gdprEpicNumber = 61; // Using old GDPR epic number

  createGitHubIssue(
    'Implement GDPR data export (Right to Access)',
    'compliance,security,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Allow users to export all their data in machine-readable format (GDPR Article 15).

## Tasks
- [ ] Create GDPRService
- [ ] Export user data (profile, resumes, themes, shares, analytics)
- [ ] Generate ZIP with JSON + attachments
- [ ] Add POST /api/v1/users/me/export-data endpoint
- [ ] Email download link
- [ ] Auto-delete after 48h
- [ ] Log export requests

## Acceptance Criteria
- User can request data export
- Receives email with download link
- ZIP contains all personal data
- Export logged in audit trail

## Estimated Time
4 days`,
    gdprEpicNumber,
  );

  createGitHubIssue(
    'Implement cascading user deletion (Right to be Forgotten)',
    'compliance,security,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Complete user account deletion with cascading effects (GDPR Article 17).

## Tasks
- [ ] Create DeleteUserService
- [ ] Implement cascading deletion (resumes, themes, shares, analytics)
- [ ] Add soft-delete with 30-day grace period
- [ ] Add DELETE /api/v1/users/me endpoint
- [ ] Anonymize analytics data (keep stats, remove PII)
- [ ] Delete S3 files
- [ ] Revoke all tokens
- [ ] Send confirmation email

## Acceptance Criteria
- User can delete account
- All personal data removed after 30 days
- Analytics anonymized (no PII)
- Deletion logged

## Estimated Time
6 days`,
    gdprEpicNumber,
  );

  createGitHubIssue(
    'Implement comprehensive audit logging',
    'compliance,security,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Track who did what and when for security and compliance.

## Tasks
- [ ] Create AuditLog model (userId, action, resource, timestamp, metadata)
- [ ] Create AuditLogInterceptor
- [ ] Log all mutations (create, update, delete)
- [ ] Log authentication events
- [ ] Log data exports/deletions
- [ ] Add GET /api/v1/admin/audit-logs endpoint
- [ ] Implement filtering and search
- [ ] Add 2-year retention policy

## Events to Log
- Login/logout
- Password changes
- Resume CRUD
- Data exports
- Account deletions
- Role changes

## Estimated Time
5 days`,
    gdprEpicNumber,
  );

  createGitHubIssue(
    'Track ToS acceptance with versioning',
    'compliance,legal,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Track when users accepted which version of ToS/Privacy Policy.

## Tasks
- [ ] Create UserConsent model (userId, documentType, version, acceptedAt)
- [ ] Add ToS version to config
- [ ] Check ToS acceptance on login
- [ ] Add POST /api/v1/users/me/accept-terms endpoint
- [ ] Block API access if ToS not accepted
- [ ] Add terms update notification

## Acceptance Criteria
- Users must accept ToS before using app
- Version changes require re-acceptance
- Acceptance logged with timestamp

## Estimated Time
3 days`,
    gdprEpicNumber,
  );
}

function createResumeSharingIssues(): void {
  console.log('\n🚀 Creating Resume Sharing issues...\n');

  createGitHubIssue(
    'Implement public resume sharing with custom slugs',
    'feature,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Allow users to generate public links for resumes with optional custom slugs.

## Tasks
- [ ] Create ResumeShare model (id, resumeId, slug, password, expiresAt)
- [ ] Add GET /api/v1/public/resumes/:slug endpoint
- [ ] Implement slug generation (nanoid)
- [ ] Add password protection option
- [ ] Add expiration date support
- [ ] Cache public resumes in Redis (60s TTL)
- [ ] Write tests

## Technical Notes
- Validate custom slugs (alphanumeric + hyphens)
- Index on slug for fast lookups

## Estimated Time
5 days`,
    EPIC_MAPPING.SHARING,
  );

  createGitHubIssue(
    'Implement resume versioning with rollback',
    'feature,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Store resume snapshots on every save and allow rollback.

## Tasks
- [ ] Create ResumeVersion model (resumeId, snapshot, createdAt, label)
- [ ] Auto-snapshot on update
- [ ] Add GET /api/v1/resumes/:id/versions endpoint
- [ ] Add POST /api/v1/resumes/:id/versions/:versionId/restore endpoint
- [ ] Implement diff visualization
- [ ] Keep last 30 versions
- [ ] Write tests

## Technical Notes
- Use JSONB column
- Compress snapshots (zlib)
- Consider jsondiffpatch for diffs

## Estimated Time
8 days`,
    EPIC_MAPPING.SHARING,
  );

  createGitHubIssue(
    'Track analytics for shared resumes',
    'feature,analytics,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Track views and downloads for shared resumes.

## Tasks
- [ ] Create ShareAnalytics model
- [ ] Add event tracking middleware
- [ ] Implement view counter (unique IPs)
- [ ] Add GET /api/v1/resumes/:id/shares/:shareId/analytics endpoint
- [ ] Store geolocation data
- [ ] Anonymize IPs (GDPR)

## Technical Notes
- Redis for real-time counters
- Batch insert to PostgreSQL
- Time-series partitioning

## Estimated Time
3 days`,
    EPIC_MAPPING.SHARING,
  );
}

function main(): void {
  createGdprComplianceIssues();
  createResumeSharingIssues();

  console.log('\n✅ Child issues created!');
  console.log(
    '\nNext: Run this script again with more issue groups or create remaining issues manually.',
  );
}

main();
