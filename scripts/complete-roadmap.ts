#!/usr/bin/env node
/**
 * Complete roadmap issues creation
 * Creates all remaining child issues and updates epics
 */

import { execSync } from 'child_process';

const REPOSITORY = 'octopus-synapse/profile-services';

interface EpicNumbers {
  readonly EXPORT: number;
  readonly ANALYTICS: number;
  readonly AI: number;
  readonly OBSERVABILITY: number;
}

const EPIC_NUMBERS: EpicNumbers = {
  EXPORT: 64,
  ANALYTICS: 65,
  AI: 66,
  OBSERVABILITY: 68,
};

function executeCommand(command: string): string | null {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    console.error(
      `❌ ${error instanceof Error ? error.message : String(error)}`,
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

function createMultiFormatExportIssues(): string[] {
  console.log('🚀 Creating Multi-Format Export issues...\n');

  const createdIssueNumbers: string[] = [];

  const docxExportIssueNumber = createGitHubIssue(
    'Implement Microsoft Word (.docx) export',
    'feature,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Export resumes to .docx format using docx library.

## Tasks
- [ ] Research best DOCX library (docx vs officegen)
- [ ] Create DOCXExportService
- [ ] Implement template mapping (theme → DOCX styles)
- [ ] Handle images (photo, logos)
- [ ] Add GET /api/v1/resumes/:id/export/docx endpoint
- [ ] Implement async queue (BullMQ)
- [ ] Store in S3 with signed URLs
- [ ] Write tests

## Technical Notes
- Use docx npm package
- Queue timeout: 30s
- 15min signed URL expiry

## Estimated Time
7 days`,
    EPIC_NUMBERS.EXPORT,
  );
  if (docxExportIssueNumber) {
    createdIssueNumbers.push(docxExportIssueNumber);
  }

  const latexExportIssueNumber = createGitHubIssue(
    'Implement LaTeX export for academic users',
    'feature,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
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
- Escape special chars: \\ { } $ & # ^ _ % ~
- Include .tex file + compiled PDF

## Estimated Time
5 days`,
    EPIC_NUMBERS.EXPORT,
  );
  if (latexExportIssueNumber) {
    createdIssueNumbers.push(latexExportIssueNumber);
  }

  const jsonExportIssueNumber = createGitHubIssue(
    'Implement JSON export for GDPR compliance',
    'feature,compliance,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
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
    EPIC_NUMBERS.EXPORT,
  );
  if (jsonExportIssueNumber) {
    createdIssueNumbers.push(jsonExportIssueNumber);
  }

  const exportQueueIssueNumber = createGitHubIssue(
    'Implement async export queue with BullMQ',
    'technical-debt,performance,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
Move all export operations to background queue to prevent request timeouts.

## Tasks
- [ ] Install BullMQ + Redis
- [ ] Create ExportQueue service
- [ ] Implement queue workers (PDF, DOCX, LaTeX)
- [ ] Add GET /api/v1/exports/:jobId/status endpoint
- [ ] Implement retry logic (3 attempts)
- [ ] Add dead letter queue
- [ ] Implement 60s timeout per export
- [ ] Add monitoring dashboard
- [ ] Write tests

## Technical Notes
- Use Bull UI for monitoring
- Store job results in Redis (24h TTL)

## Estimated Time
5 days`,
    EPIC_NUMBERS.EXPORT,
  );
  if (exportQueueIssueNumber) {
    createdIssueNumbers.push(exportQueueIssueNumber);
  }

  return createdIssueNumbers;
}

function createResumeAnalyticsIssues(): string[] {
  console.log('\n🚀 Creating Resume Analytics issues...\n');

  const createdIssueNumbers: string[] = [];

  const analyticsTrackingIssueNumber = createGitHubIssue(
    'Implement comprehensive analytics tracking',
    'feature,analytics,backend',
    'Q2 2026 - Differentiation & Analytics',
    `## Description
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
    EPIC_NUMBERS.ANALYTICS,
  );
  if (analyticsTrackingIssueNumber) {
    createdIssueNumbers.push(analyticsTrackingIssueNumber);
  }

  const atsScoreIssueNumber = createGitHubIssue(
    'Calculate ATS-friendliness score',
    'feature,analytics,ai,backend',
    'Q2 2026 - Differentiation & Analytics',
    `## Description
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
    EPIC_NUMBERS.ANALYTICS,
  );
  if (atsScoreIssueNumber) {
    createdIssueNumbers.push(atsScoreIssueNumber);
  }

  const keywordSuggestionsIssueNumber = createGitHubIssue(
    'AI-powered keyword suggestions',
    'feature,ai,backend',
    'Q2 2026 - Differentiation & Analytics',
    `## Description
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
    EPIC_NUMBERS.ANALYTICS,
  );
  if (keywordSuggestionsIssueNumber) {
    createdIssueNumbers.push(keywordSuggestionsIssueNumber);
  }

  return createdIssueNumbers;
}

function createAiFeaturesIssues(): string[] {
  console.log('\n🚀 Creating AI Features issues...\n');

  const createdIssueNumbers: string[] = [];

  const aiReviewIssueNumber = createGitHubIssue(
    'Implement AI-powered resume review',
    'feature,ai,backend',
    'Q2 2026 - Differentiation & Analytics',
    `## Description
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
    EPIC_NUMBERS.AI,
  );
  if (aiReviewIssueNumber) {
    createdIssueNumbers.push(aiReviewIssueNumber);
  }

  const linkedinImportIssueNumber = createGitHubIssue(
    'Auto-fill resume from LinkedIn',
    'feature,integration,ai,backend',
    'Q2 2026 - Differentiation & Analytics',
    `## Description
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
LinkedIn official API has limited data access. May need browser automation (Puppeteer) as fallback.

## Estimated Time
10 days`,
    EPIC_NUMBERS.AI,
  );
  if (linkedinImportIssueNumber) {
    createdIssueNumbers.push(linkedinImportIssueNumber);
  }

  return createdIssueNumbers;
}

function createObservabilityIssues(): string[] {
  console.log('\n🚀 Creating Observability issues...\n');

  const createdIssueNumbers: string[] = [];

  const structuredLoggingIssueNumber = createGitHubIssue(
    'Implement structured JSON logging',
    'technical-debt,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
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
    EPIC_NUMBERS.OBSERVABILITY,
  );
  if (structuredLoggingIssueNumber) {
    createdIssueNumbers.push(structuredLoggingIssueNumber);
  }

  const openTelemetryIssueNumber = createGitHubIssue(
    'Implement OpenTelemetry tracing',
    'technical-debt,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
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
    EPIC_NUMBERS.OBSERVABILITY,
  );
  if (openTelemetryIssueNumber) {
    createdIssueNumbers.push(openTelemetryIssueNumber);
  }

  const metricsTrackingIssueNumber = createGitHubIssue(
    'Implement business metrics tracking',
    'technical-debt,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
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
    EPIC_NUMBERS.OBSERVABILITY,
  );
  if (metricsTrackingIssueNumber) {
    createdIssueNumbers.push(metricsTrackingIssueNumber);
  }

  const alertingIssueNumber = createGitHubIssue(
    'Configure production alerting',
    'technical-debt,backend',
    'Q1 2026 - Foundation & Compliance',
    `## Description
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
    EPIC_NUMBERS.OBSERVABILITY,
  );
  if (alertingIssueNumber) {
    createdIssueNumbers.push(alertingIssueNumber);
  }

  return createdIssueNumbers;
}

function updateEpicWithChildIssues(
  epicNumber: number,
  issueNumbers: string[],
  epicBody: string,
): void {
  const issueList = issueNumbers
    .filter(Boolean)
    .map((issueNumber) => `- [ ] #${issueNumber}`)
    .join('\\n');

  const fullEpicBody = `${epicBody}\n\n## Child Issues\n${issueList}`;
  const command = `gh issue edit ${epicNumber} --repo ${REPOSITORY} --body "${fullEpicBody}"`;
  executeCommand(command);
}

function main(): void {
  const exportIssueNumbers = createMultiFormatExportIssues();
  const analyticsIssueNumbers = createResumeAnalyticsIssues();
  const aiIssueNumbers = createAiFeaturesIssues();
  const observabilityIssueNumbers = createObservabilityIssues();

  console.log('\n📝 Updating epic task lists...\n');

  updateEpicWithChildIssues(
    EPIC_NUMBERS.EXPORT,
    exportIssueNumbers,
    `## Goal
Support multiple export formats beyond PDF to increase resume versatility.

## Priority
High

## Acceptance Criteria
- [ ] DOCX export (Microsoft Word)
- [ ] JSON export (data portability)
- [ ] LaTeX export (academic users)
- [ ] Export queue system (async processing)

## Estimated Effort
19 development days across 4 issues`,
  );

  updateEpicWithChildIssues(
    EPIC_NUMBERS.ANALYTICS,
    analyticsIssueNumbers,
    `## Goal
Provide data-driven insights to help users optimize their resumes.

## Priority
High

## Acceptance Criteria
- [ ] View/download tracking
- [ ] Keyword optimization suggestions
- [ ] ATS compatibility score
- [ ] Industry benchmarking

## Estimated Effort
21 development days across 3 issues`,
  );

  updateEpicWithChildIssues(
    EPIC_NUMBERS.AI,
    aiIssueNumbers,
    `## Goal
Integrate AI capabilities to provide intelligent resume suggestions and optimizations.

## Priority
High

## Acceptance Criteria
- [ ] GPT-4 resume review
- [ ] Auto-suggestions for improvements
- [ ] Job description keyword matching
- [ ] LinkedIn profile import

## Estimated Effort
18 development days across 2 issues

## Cost Considerations
- Implement rate limiting (3 reviews/day for free users)
- Monitor OpenAI API usage`,
  );

  updateEpicWithChildIssues(
    EPIC_NUMBERS.OBSERVABILITY,
    observabilityIssueNumbers,
    `## Goal
Improve monitoring, logging, and performance bottlenecks.

## Priority
High

## Acceptance Criteria
- [ ] Structured logging (JSON)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Custom metrics (PDF export time, etc)
- [ ] Alerting rules
- [ ] Performance dashboards

## Estimated Effort
16 development days across 4 issues`,
  );

  console.log('\n✅ All issues created and epics updated!');
  console.log('\n📊 Summary:');
  console.log(`- Export: ${exportIssueNumbers.length} issues`);
  console.log(`- Analytics: ${analyticsIssueNumbers.length} issues`);
  console.log(`- AI: ${aiIssueNumbers.length} issues`);
  console.log(`- Observability: ${observabilityIssueNumbers.length} issues`);
}

main();
