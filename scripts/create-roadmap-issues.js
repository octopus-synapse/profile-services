#!/usr/bin/env node
/**
 * GitHub Issues Creation Script
 * Creates all roadmap issues for profile-services
 *
 * Usage: node scripts/create-roadmap-issues.js
 */

const { execSync } = require('child_process');

// Configuration
const REPO = 'octopus-synapse/profile-services';
const PROJECT_NAME = 'Patch Careers';

// Milestones
const MILESTONES = {
  Q1: 'Q1 2026 - Foundation & Compliance',
  Q2: 'Q2 2026 - Differentiation & Analytics',
  Q3: 'Q3 2026 - Platform & Marketplace',
};

// Helper functions
function exec(cmd, silent = false) {
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${cmd}`);
    console.error(error.message);
    process.exit(1);
  }
}

function createLabel(name, color, description) {
  console.log(`Creating label: ${name}`);
  exec(
    `gh label create "${name}" --color "${color}" --description "${description}" --repo ${REPO} --force`,
    true,
  );
}

function createMilestone(title, description, dueDate) {
  console.log(`Checking milestone: ${title}`);
  // Milestones already exist (created manually):
  // Q1 2026 - Foundation & Compliance (milestone #6)
  // Q2 2026 - Differentiation & Analytics (milestone #7)
  // Q3 2026 - Platform & Marketplace (milestone #8)
  console.log(`  ✅ Using existing milestone`);
}

function createIssue(data) {
  const { title, labels, milestone, body } = data;
  const labelsStr = labels.join(',');

  // Escape quotes in body
  const escapedBody = body.replace(/"/g, '\\"').replace(/\$/g, '\\$');

  console.log(`\n📝 Creating: ${title}`);

  const cmd = `gh issue create --repo ${REPO} --title "${title}" --label "${labelsStr}" --milestone "${milestone}" --body "${escapedBody}"`;

  try {
    const result = exec(cmd, true);
    const issueNumber = result.match(/#(\d+)/)?.[1];
    console.log(`✅ Created issue #${issueNumber}`);
    return issueNumber;
  } catch (error) {
    console.error(`❌ Failed to create: ${title}`);
    return null;
  }
}

// Step 1: Create labels
function setupLabels() {
  console.log('\n🏷️  Creating labels...\n');

  createLabel('epic', '5319E7', 'Epic issue (parent)');
  createLabel('compliance', 'D93F0B', 'GDPR/legal compliance');
  createLabel('ai', '0E8A16', 'AI/ML features');
  createLabel('graphql', 'FBCA04', 'GraphQL migration');
  createLabel('marketplace', 'C5DEF5', 'Template marketplace');
  createLabel('analytics', '006B75', 'Analytics & insights');

  console.log('✅ Labels created\n');
}

// Step 2: Create milestones
function setupMilestones() {
  console.log('📅 Creating milestones...\n');

  createMilestone(
    MILESTONES.Q1,
    'Legal compliance + core sharing features',
    '2026-03-31T23:59:59Z',
  );

  createMilestone(
    MILESTONES.Q2,
    'AI features + advanced analytics',
    '2026-06-30T23:59:59Z',
  );

  createMilestone(
    MILESTONES.Q3,
    'Template marketplace + GraphQL migration',
    '2026-09-30T23:59:59Z',
  );

  console.log('✅ Milestones created\n');
}

// Step 3: Create epic issues
function createEpics() {
  console.log('🎯 Creating epic issues...\n');

  const epics = [];

  // Epic 1: Resume Sharing & Versioning
  epics.push(
    createIssue({
      title: '[EPIC] Resume Sharing & Versioning',
      labels: ['epic', 'feature'],
      milestone: MILESTONES.Q1,
      body: `## Goal
Enable users to share resumes via public links and maintain version history for rollback capabilities.

## Acceptance Criteria
- [ ] Public resume links with custom slugs
- [ ] Version history with diff visualization
- [ ] Rollback to previous versions
- [ ] Share analytics (views, downloads)

## Child Issues
Will be linked after creation.

## Priority
High

## Estimated Effort
16 development days across 3 issues`,
    }),
  );

  // Epic 2: Multi-Format Export
  epics.push(
    createIssue({
      title: '[EPIC] Multi-Format Export',
      labels: ['epic', 'feature'],
      milestone: MILESTONES.Q1,
      body: `## Goal
Support multiple export formats beyond PDF to increase resume versatility.

## Acceptance Criteria
- [ ] DOCX export (Microsoft Word)
- [ ] JSON export (data portability)
- [ ] LaTeX export (academic users)
- [ ] Export queue system (async processing)

## Priority
High

## Estimated Effort
19 development days across 4 issues`,
    }),
  );

  // Epic 3: Template Marketplace
  epics.push(
    createIssue({
      title: '[EPIC] Template Marketplace with Moderation',
      labels: ['epic', 'marketplace', 'feature'],
      milestone: MILESTONES.Q3,
      body: `## Goal
Allow users to create private templates and submit them for moderation. Approved templates become public in marketplace.

## Acceptance Criteria
- [ ] Private template creation
- [ ] Template submission workflow
- [ ] Moderator approval interface
- [ ] Public marketplace listing
- [ ] Template versioning
- [ ] Template analytics

## Priority
Medium

## Estimated Effort
19 development days across 4 issues`,
    }),
  );

  // Epic 4: Resume Analytics
  epics.push(
    createIssue({
      title: '[EPIC] Resume Analytics & Insights',
      labels: ['epic', 'analytics', 'feature'],
      milestone: MILESTONES.Q2,
      body: `## Goal
Provide data-driven insights to help users optimize their resumes.

## Acceptance Criteria
- [ ] View/download tracking
- [ ] Keyword optimization suggestions
- [ ] ATS compatibility score
- [ ] Industry benchmarking
- [ ] Time-on-page analytics
- [ ] Geographic insights

## Priority
High

## Estimated Effort
21 development days across 3 issues`,
    }),
  );

  // Epic 5: GDPR Compliance
  epics.push(
    createIssue({
      title: '[EPIC] GDPR Compliance',
      labels: ['epic', 'compliance', 'security'],
      milestone: MILESTONES.Q1,
      body: `## Goal
Implement GDPR requirements for EU users (data portability, deletion, audit).

## Acceptance Criteria
- [ ] Data export (machine-readable)
- [ ] Right to be forgotten (cascading deletion)
- [ ] Audit logs (who/what/when)
- [ ] Terms of Service acceptance tracking
- [ ] Data retention policies

## Priority
🚨 CRITICAL - Legal blocker for EU launch

## Estimated Effort
18 development days across 4 issues`,
    }),
  );

  // Epic 6: AI Features
  epics.push(
    createIssue({
      title: '[EPIC] AI-Powered Features',
      labels: ['epic', 'ai', 'feature'],
      milestone: MILESTONES.Q2,
      body: `## Goal
Integrate AI capabilities to provide intelligent resume suggestions and optimizations.

## Acceptance Criteria
- [ ] GPT-4 resume review
- [ ] Auto-suggestions for improvements
- [ ] Job description keyword matching
- [ ] LinkedIn profile import

## Priority
High

## Estimated Effort
18 development days across 2 issues

## Cost Considerations
- Implement rate limiting (3 reviews/day for free users)
- Monitor OpenAI API usage
- Consider caching strategies`,
    }),
  );

  // Epic 7: GraphQL Migration
  epics.push(
    createIssue({
      title: '[EPIC] GraphQL API Migration',
      labels: ['epic', 'graphql', 'technical-debt'],
      milestone: MILESTONES.Q3,
      body: `## Goal
Migrate from REST to GraphQL to solve N+1 queries and improve developer experience.

## Acceptance Criteria
- [ ] GraphQL schema design
- [ ] Resolver implementation
- [ ] DataLoader for batching
- [ ] Subscriptions for real-time
- [ ] GraphQL Playground

## Priority
Medium

## Estimated Effort
12 development days across 3 issues

## Technical Notes
- Frontend-only (not public API)
- Solves N+1 query problems
- Better DX for profile-frontend team`,
    }),
  );

  // Epic 8: Observability
  epics.push(
    createIssue({
      title: '[EPIC] Observability & Performance',
      labels: ['epic', 'technical-debt', 'performance'],
      milestone: MILESTONES.Q1,
      body: `## Goal
Improve monitoring, logging, and performance bottlenecks.

## Acceptance Criteria
- [ ] Structured logging (JSON)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Custom metrics (PDF export time, etc)
- [ ] Alerting rules
- [ ] Performance dashboards

## Priority
High

## Estimated Effort
16 development days across 4 issues`,
    }),
  );

  console.log(`\n✅ Created ${epics.filter(Boolean).length} epic issues\n`);
  return epics;
}

// Step 4: Create child issues
function createChildIssues(epicNumbers) {
  console.log('📋 Creating child issues...\n');

  const issues = [];

  // EPIC 1: Resume Sharing & Versioning
  const epic1 = epicNumbers[0];

  issues.push(
    createIssue({
      title: 'Implement public resume sharing with custom slugs',
      labels: ['feature', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic1}

## Description
Allow users to generate public links for their resumes with optional custom slugs (e.g., /r/john-doe-swe).

## Tasks
- [ ] Create ResumeShare model (id, resumeId, slug, createdAt, expiresAt, password)
- [ ] Add GET /api/v1/public/resumes/:slug endpoint
- [ ] Implement slug generation (unique, URL-safe)
- [ ] Add password protection option
- [ ] Add expiration date support
- [ ] Create sharing settings UI endpoint
- [ ] Write integration tests

## Technical Notes
- Use nanoid for default slugs
- Validate custom slugs (alphanumeric + hyphens only)
- Index on slug for fast lookups
- Cache public resumes in Redis (60s TTL)

## Estimated Time
5 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement resume versioning with rollback',
      labels: ['feature', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic1}

## Description
Store resume snapshots on every save and allow users to view/restore previous versions.

## Tasks
- [ ] Create ResumeVersion model (id, resumeId, snapshot, createdAt, createdBy, label)
- [ ] Implement automatic snapshot on update
- [ ] Add GET /api/v1/resumes/:id/versions endpoint
- [ ] Add GET /api/v1/resumes/:id/versions/:versionId endpoint
- [ ] Add POST /api/v1/resumes/:id/versions/:versionId/restore endpoint
- [ ] Implement diff visualization logic
- [ ] Add version labels (manual/auto)
- [ ] Implement retention policy (keep last 30 versions)
- [ ] Write unit + integration tests

## Technical Notes
- Store full JSON snapshot (not deltas initially)
- Use JSONB column in PostgreSQL
- Compress snapshots using zlib
- Consider using jsondiffpatch for diffs

## Estimated Time
8 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Track views and downloads for shared resumes',
      labels: ['feature', 'analytics', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic1}

## Description
Track when shared resumes are viewed or downloaded with basic analytics.

## Tasks
- [ ] Create ShareAnalytics model (id, shareId, event, timestamp, metadata)
- [ ] Add event tracking middleware
- [ ] Implement view counter (unique IPs per day)
- [ ] Implement download counter
- [ ] Add GET /api/v1/resumes/:id/shares/:shareId/analytics endpoint
- [ ] Store geolocation data (country/city)
- [ ] Store referrer information
- [ ] Write tests

## Technical Notes
- Use Redis for real-time counters
- Batch insert to PostgreSQL every 5 minutes
- Anonymize IP addresses (GDPR)
- Use time-series partitioning

## Estimated Time
3 days`,
    }),
  );

  // EPIC 2: Multi-Format Export
  const epic2 = epicNumbers[1];

  issues.push(
    createIssue({
      title: 'Implement Microsoft Word (.docx) export',
      labels: ['feature', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic2}

## Description
Export resumes to .docx format using docx library.

## Tasks
- [ ] Research best DOCX library (docx vs officegen)
- [ ] Create DOCXExportService
- [ ] Implement template mapping (theme → DOCX styles)
- [ ] Handle images (photo, logos)
- [ ] Handle tables (for layout)
- [ ] Add GET /api/v1/resumes/:id/export/docx endpoint
- [ ] Implement async queue (BullMQ)
- [ ] Add download progress tracking
- [ ] Write integration tests

## Technical Notes
- Use docx npm package (most maintained)
- Store generated files in S3
- Generate signed URLs (15min expiry)
- Queue timeout: 30s

## Estimated Time
7 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement LaTeX export for academic users',
      labels: ['feature', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic2}

## Description
Export resumes to LaTeX format using moderncv template.

## Tasks
- [ ] Create LaTeX template (moderncv based)
- [ ] Create LaTeXExportService
- [ ] Implement data mapping (Resume → LaTeX variables)
- [ ] Handle special characters escaping
- [ ] Add GET /api/v1/resumes/:id/export/latex endpoint
- [ ] Support multiple LaTeX templates
- [ ] Write tests

## Technical Notes
- Use latex.js or raw template strings
- Escape special chars: \\ { } \\$ & # ^ _ % ~
- Include .tex file + compiled PDF

## Estimated Time
5 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement JSON export for GDPR compliance',
      labels: ['feature', 'compliance', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic2}

## Description
Export user data in machine-readable JSON format (GDPR requirement).

## Tasks
- [ ] Create JSONExportService
- [ ] Include all user data (profile, resumes, themes, settings)
- [ ] Add GET /api/v1/users/me/export endpoint
- [ ] Generate ZIP with all attachments
- [ ] Add export request logging
- [ ] Write tests

## Technical Notes
- Use JSON Resume schema as baseline
- Include metadata (export date, version)
- Compress with gzip

## Estimated Time
2 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement async export queue with BullMQ',
      labels: ['technical-debt', 'performance', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic2}

## Description
Move all export operations to background queue to prevent request timeouts.

## Tasks
- [ ] Install BullMQ + Redis
- [ ] Create ExportQueue service
- [ ] Implement queue workers (PDF, DOCX, LaTeX)
- [ ] Add job status endpoint (GET /api/v1/exports/:jobId/status)
- [ ] Implement retry logic (3 attempts)
- [ ] Add dead letter queue
- [ ] Implement job timeout (60s per export)
- [ ] Add monitoring dashboard
- [ ] Write tests

## Technical Notes
- Use Bull UI for monitoring
- Store job results in Redis (24h TTL)
- Send webhook on completion (future)

## Estimated Time
5 days`,
    }),
  );

  // EPIC 3: Template Marketplace
  const epic3 = epicNumbers[2];

  issues.push(
    createIssue({
      title: 'Allow users to create private templates',
      labels: ['feature', 'backend'],
      milestone: MILESTONES.Q3,
      body: `## Parent Epic
#${epic3}

## Description
Extend current theme system to support private user templates.

## Tasks
- [ ] Add visibility field to Theme model (PRIVATE, PENDING, PUBLIC)
- [ ] Update ThemeService to filter by visibility
- [ ] Add template cloning endpoint
- [ ] Implement template validation rules
- [ ] Add preview generation
- [ ] Write tests

## Estimated Time
5 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement template submission for review',
      labels: ['feature', 'backend'],
      milestone: MILESTONES.Q3,
      body: `## Parent Epic
#${epic3}

## Description
Allow users to submit private templates for moderation.

## Tasks
- [ ] Add POST /api/v1/themes/:id/submit endpoint
- [ ] Create TemplateSubmission model (id, themeId, submittedBy, notes, status)
- [ ] Implement submission validation
- [ ] Send notification to moderators
- [ ] Add submission history tracking
- [ ] Write tests

## Estimated Time
4 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Build moderator dashboard for template approval',
      labels: ['feature', 'backend'],
      milestone: MILESTONES.Q3,
      body: `## Parent Epic
#${epic3}

## Description
API endpoints for moderators to review and approve/reject templates.

## Tasks
- [ ] Add ROLE_MODERATOR to UserRole enum
- [ ] Create ModeratorGuard (checks role)
- [ ] Add GET /api/v1/admin/templates/pending endpoint
- [ ] Add POST /api/v1/admin/templates/:id/approve endpoint
- [ ] Add POST /api/v1/admin/templates/:id/reject endpoint
- [ ] Implement rejection reasons
- [ ] Send notification to template creator
- [ ] Add audit logging
- [ ] Write tests

## Estimated Time
6 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Create public template marketplace endpoints',
      labels: ['feature', 'backend'],
      milestone: MILESTONES.Q3,
      body: `## Parent Epic
#${epic3}

## Description
Display approved templates in public marketplace.

## Tasks
- [ ] Add GET /api/v1/marketplace/templates endpoint (paginated)
- [ ] Implement filtering (category, tags, popularity)
- [ ] Implement sorting (newest, popular, rating)
- [ ] Add template search
- [ ] Add template preview images
- [ ] Cache popular templates
- [ ] Write tests

## Estimated Time
4 days`,
    }),
  );

  // EPIC 4: Resume Analytics
  const epic4 = epicNumbers[3];

  issues.push(
    createIssue({
      title: 'Implement comprehensive analytics tracking',
      labels: ['feature', 'analytics', 'backend'],
      milestone: MILESTONES.Q2,
      body: `## Parent Epic
#${epic4}

## Description
Track all resume interactions with detailed analytics.

## Tasks
- [ ] Create ResumeAnalytics table (time-series)
- [ ] Implement event tracking (view, download, share, edit)
- [ ] Add GET /api/v1/resumes/:id/analytics endpoint
- [ ] Implement aggregations (daily, weekly, monthly)
- [ ] Add chart data endpoints
- [ ] Implement unique visitor tracking
- [ ] Write tests

## Technical Notes
- Use TimescaleDB extension for time-series
- Partition by month
- Use Redis for real-time counters

## Estimated Time
6 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Calculate ATS-friendliness score',
      labels: ['feature', 'analytics', 'backend'],
      milestone: MILESTONES.Q2,
      body: `## Parent Epic
#${epic4}

## Description
Analyze resume and provide ATS compatibility score with actionable suggestions.

## Tasks
- [ ] Create ATSScoreService
- [ ] Implement scoring algorithm (format, keywords, structure)
- [ ] Check for ATS-unfriendly elements (tables, images, columns)
- [ ] Analyze keyword density
- [ ] Check section organization
- [ ] Add GET /api/v1/resumes/:id/ats-score endpoint
- [ ] Return detailed breakdown
- [ ] Write tests

## Scoring Criteria
- Format simplicity: 20%
- Keyword relevance: 30%
- Section completeness: 20%
- Contact info clarity: 15%
- File format (PDF/DOCX): 15%

## Estimated Time
8 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'AI-powered keyword suggestions',
      labels: ['feature', 'ai', 'backend'],
      milestone: MILESTONES.Q2,
      body: `## Parent Epic
#${epic4}

## Description
Suggest relevant keywords based on industry and job title.

## Tasks
- [ ] Integrate OpenAI GPT-4 API
- [ ] Create KeywordService
- [ ] Implement job description parsing
- [ ] Extract industry-specific keywords
- [ ] Compare with resume content
- [ ] Add POST /api/v1/resumes/:id/optimize-keywords endpoint
- [ ] Return missing/suggested keywords
- [ ] Write tests

## Estimated Time
7 days`,
    }),
  );

  // EPIC 5: GDPR Compliance
  const epic5 = epicNumbers[4];

  issues.push(
    createIssue({
      title: 'Implement GDPR data export',
      labels: ['compliance', 'security', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic5}

## Description
Allow users to export all their data in machine-readable format.

## Tasks
- [ ] Create GDPRService
- [ ] Implement full data export (user, resumes, themes, shares, analytics)
- [ ] Add POST /api/v1/users/me/export-data endpoint
- [ ] Generate ZIP file with JSON + attachments
- [ ] Add export request logging
- [ ] Email download link
- [ ] Auto-delete after 48h
- [ ] Write tests

## Priority
🚨 CRITICAL

## Estimated Time
4 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement cascading user deletion',
      labels: ['compliance', 'security', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic5}

## Description
Complete user account deletion with cascading effects.

## Tasks
- [ ] Create DeleteUserService
- [ ] Implement cascading deletion (resumes, themes, shares, etc)
- [ ] Add soft-delete option (mark as deleted, hard-delete after 30 days)
- [ ] Add DELETE /api/v1/users/me endpoint
- [ ] Anonymize analytics data (keep stats, remove PII)
- [ ] Delete S3 files
- [ ] Revoke all tokens
- [ ] Send confirmation email
- [ ] Add cooldown period (30 days to cancel)
- [ ] Write tests

## Priority
🚨 CRITICAL

## Estimated Time
6 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement comprehensive audit logs',
      labels: ['compliance', 'security', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic5}

## Description
Track who did what and when for security and compliance.

## Tasks
- [ ] Create AuditLog model (id, userId, action, resource, timestamp, metadata)
- [ ] Create AuditLogInterceptor
- [ ] Log all mutations (create, update, delete)
- [ ] Log authentication events
- [ ] Log data exports/deletions
- [ ] Add GET /api/v1/admin/audit-logs endpoint (admin only)
- [ ] Implement filtering and search
- [ ] Add retention policy (2 years)
- [ ] Write tests

## Events to Log
- Login/logout
- Password changes
- Email changes
- Resume creation/updates/deletions
- Data exports
- Account deletions
- Role changes
- Template approvals/rejections

## Priority
🚨 CRITICAL

## Estimated Time
5 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Track ToS acceptance with versioning',
      labels: ['compliance', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic5}

## Description
Track when users accepted which version of ToS/Privacy Policy.

## Tasks
- [ ] Create UserConsent model (id, userId, documentType, version, acceptedAt)
- [ ] Add ToS version to config
- [ ] Check ToS acceptance on login
- [ ] Add POST /api/v1/users/me/accept-terms endpoint
- [ ] Block API access if ToS not accepted
- [ ] Add terms update notification
- [ ] Write tests

## Estimated Time
3 days`,
    }),
  );

  // EPIC 6: AI Features
  const epic6 = epicNumbers[5];

  issues.push(
    createIssue({
      title: 'Implement AI-powered resume review',
      labels: ['feature', 'ai', 'backend'],
      milestone: MILESTONES.Q2,
      body: `## Parent Epic
#${epic6}

## Description
Use GPT-4 to provide personalized resume improvement suggestions.

## Tasks
- [ ] Set up OpenAI API integration
- [ ] Create AIReviewService
- [ ] Design review prompt (structure, clarity, impact, keywords)
- [ ] Add POST /api/v1/resumes/:id/ai-review endpoint
- [ ] Implement rate limiting (3 reviews/day for free users)
- [ ] Cache reviews (24h)
- [ ] Add cost tracking
- [ ] Return structured feedback
- [ ] Write tests

## Review Categories
- Structure & formatting
- Content clarity
- Impact & achievements quantification
- Keyword optimization
- Grammar & spelling

## Estimated Time
8 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Auto-fill resume from LinkedIn',
      labels: ['feature', 'ai', 'backend'],
      milestone: MILESTONES.Q2,
      body: `## Parent Epic
#${epic6}

## Description
Allow users to import LinkedIn profile data automatically.

## Tasks
- [ ] Research LinkedIn API access (official vs scraping)
- [ ] Implement OAuth LinkedIn integration
- [ ] Create LinkedInImportService
- [ ] Map LinkedIn fields to Resume schema
- [ ] Add POST /api/v1/resumes/import/linkedin endpoint
- [ ] Handle profile photos
- [ ] Handle recommendations
- [ ] Add conflict resolution (merge vs replace)
- [ ] Write tests

## Note
LinkedIn official API has limited data access. May need to use browser automation (Puppeteer) as fallback.

## Estimated Time
10 days`,
    }),
  );

  // EPIC 7: GraphQL Migration
  const epic7 = epicNumbers[6];

  issues.push(
    createIssue({
      title: 'Design comprehensive GraphQL schema',
      labels: ['technical-debt', 'graphql', 'backend'],
      milestone: MILESTONES.Q3,
      body: `## Parent Epic
#${epic7}

## Description
Design GraphQL schema covering all entities and operations.

## Tasks
- [ ] Install @nestjs/graphql + @apollo/server
- [ ] Design type definitions (User, Resume, Theme, etc)
- [ ] Design queries (getResume, listResumes, etc)
- [ ] Design mutations (createResume, updateResume, etc)
- [ ] Design subscriptions (resumeUpdated, themeApproved)
- [ ] Add field-level authorization
- [ ] Add pagination (cursor-based)
- [ ] Document schema
- [ ] Write tests

## Estimated Time
6 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement DataLoader for N+1 query resolution',
      labels: ['technical-debt', 'performance', 'backend'],
      milestone: MILESTONES.Q3,
      body: `## Parent Epic
#${epic7}

## Description
Use DataLoader to batch database queries and eliminate N+1 problems.

## Tasks
- [ ] Install dataloader
- [ ] Create DataLoader factory
- [ ] Implement loaders (userById, resumesByUserId, etc)
- [ ] Add to GraphQL context
- [ ] Add caching strategy
- [ ] Benchmark performance improvements
- [ ] Write tests

## Estimated Time
5 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Configure GraphQL Playground for development',
      labels: ['developer-experience', 'graphql', 'backend'],
      milestone: MILESTONES.Q3,
      body: `## Parent Epic
#${epic7}

## Description
Set up GraphQL Playground for easy API exploration.

## Tasks
- [ ] Enable GraphQL Playground in dev
- [ ] Add authentication handling
- [ ] Add example queries
- [ ] Document common operations
- [ ] Write usage guide

## Estimated Time
1 day`,
    }),
  );

  // EPIC 8: Observability
  const epic8 = epicNumbers[7];

  issues.push(
    createIssue({
      title: 'Implement structured JSON logging',
      labels: ['technical-debt', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic8}

## Description
Replace unstructured logs with JSON format for better searchability.

## Tasks
- [ ] Install winston or pino
- [ ] Create structured logger service
- [ ] Add context (requestId, userId, traceId)
- [ ] Implement log levels (error, warn, info, debug)
- [ ] Add sensitive data masking
- [ ] Configure log aggregation (CloudWatch/Datadog)
- [ ] Write tests

## Estimated Time
4 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement OpenTelemetry tracing',
      labels: ['technical-debt', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic8}

## Description
Add distributed tracing to track request flow across services.

## Tasks
- [ ] Install @opentelemetry/sdk-node
- [ ] Configure OpenTelemetry exporter (Jaeger/Tempo)
- [ ] Add auto-instrumentation (HTTP, Prisma, Redis)
- [ ] Add custom spans (business logic)
- [ ] Configure sampling (10% in production)
- [ ] Set up Jaeger UI
- [ ] Write documentation

## Estimated Time
6 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Implement business metrics tracking',
      labels: ['technical-debt', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic8}

## Description
Track custom metrics for business KPIs.

## Tasks
- [ ] Install prom-client
- [ ] Create metrics service
- [ ] Add counters (resume_created, user_signup, export_completed)
- [ ] Add histograms (export_duration, api_latency)
- [ ] Add gauges (active_users, pending_exports)
- [ ] Expose /metrics endpoint
- [ ] Configure Prometheus scraping
- [ ] Create Grafana dashboards

## Estimated Time
3 days`,
    }),
  );

  issues.push(
    createIssue({
      title: 'Configure production alerting',
      labels: ['technical-debt', 'backend'],
      milestone: MILESTONES.Q1,
      body: `## Parent Epic
#${epic8}

## Description
Set up alerts for critical failures and anomalies.

## Tasks
- [ ] Configure Prometheus AlertManager
- [ ] Define alert rules (error rate, latency, queue depth)
- [ ] Set up PagerDuty/Slack integration
- [ ] Create runbooks for common alerts
- [ ] Test alert delivery
- [ ] Document on-call procedures

## Critical Alerts
- Error rate > 1%
- P95 latency > 2s
- Export queue depth > 100
- Database connection pool exhausted
- Redis down

## Estimated Time
3 days`,
    }),
  );

  console.log(`\n✅ Created ${issues.filter(Boolean).length} child issues\n`);
  return issues;
}

// Main execution
async function main() {
  console.log('🚀 GitHub Issues Creation Script\n');
  console.log('Repository:', REPO);
  console.log('Project:', PROJECT_NAME);
  console.log('\n=====================================\n');

  // Verify GitHub CLI is authenticated
  try {
    exec('gh auth status', true);
    console.log('✅ GitHub CLI authenticated\n');
  } catch (error) {
    console.error('❌ GitHub CLI not authenticated');
    console.error('Run: gh auth login');
    process.exit(1);
  }

  // Execute steps
  setupLabels();
  setupMilestones();
  const epicNumbers = createEpics();
  createChildIssues(epicNumbers);

  console.log('\n=====================================\n');
  console.log('✅ All issues created successfully!');
  console.log('\n📊 Summary:');
  console.log('- 8 Epic issues');
  console.log('- 33 Child issues');
  console.log('- 41 Total issues');
  console.log('\n🎯 Next steps:');
  console.log(
    '1. Review issues at: https://github.com/octopus-synapse/profile-services/issues',
  );
  console.log('2. Add issues to "Patch Careers" project board');
  console.log('3. Assign team members');
  console.log('4. Start with Q1 2026 milestone (GDPR compliance is CRITICAL)');
}

main();
