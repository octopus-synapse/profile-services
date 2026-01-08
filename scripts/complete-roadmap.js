#!/usr/bin/env node
/**
 * Complete roadmap issues creation
 * Creates all remaining child issues and updates epics
 */

const { execSync } = require('child_process');
const REPO = 'octopus-synapse/profile-services';

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    console.error(`❌ ${err.message}`);
    return null;
  }
}

function createIssue(title, labels, milestone, body, epic) {
  const bodyWithEpic = `Part of #${epic}\n\n${body}`;
  const cmd = `gh issue create --repo ${REPO} --title "${title}" --label "${labels}" --milestone "${milestone}" --body "${bodyWithEpic}"`;

  const result = exec(cmd);
  if (result) {
    const match = result.match(/issues\/(\d+)/);
    console.log(`✅ #${match[1]}: ${title}`);
    return match[1];
  }
  return null;
}

console.log('🚀 Creating Multi-Format Export issues...\n');

const exportIssues = [];

exportIssues.push(
  createIssue(
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
    64,
  ),
);

exportIssues.push(
  createIssue(
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
    64,
  ),
);

exportIssues.push(
  createIssue(
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
    64,
  ),
);

exportIssues.push(
  createIssue(
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
    64,
  ),
);

console.log('\n🚀 Creating Resume Analytics issues...\n');

const analyticsIssues = [];

analyticsIssues.push(
  createIssue(
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
    65,
  ),
);

analyticsIssues.push(
  createIssue(
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
    65,
  ),
);

analyticsIssues.push(
  createIssue(
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
    65,
  ),
);

console.log('\n🚀 Creating AI Features issues...\n');

const aiIssues = [];

aiIssues.push(
  createIssue(
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
    66,
  ),
);

aiIssues.push(
  createIssue(
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
    66,
  ),
);

console.log('\n🚀 Creating Observability issues...\n');

const obsIssues = [];

obsIssues.push(
  createIssue(
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
    68,
  ),
);

obsIssues.push(
  createIssue(
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
    68,
  ),
);

obsIssues.push(
  createIssue(
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
    68,
  ),
);

obsIssues.push(
  createIssue(
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
    68,
  ),
);

// Update epics with child issues
console.log('\n📝 Updating epic task lists...\n');

const exportList = exportIssues
  .filter(Boolean)
  .map((n) => `- [ ] #${n}`)
  .join('\\n');
exec(`gh issue edit 64 --repo ${REPO} --body "## Goal
Support multiple export formats beyond PDF to increase resume versatility.

## Priority
High

## Child Issues
${exportList}

## Acceptance Criteria
- [ ] DOCX export (Microsoft Word)
- [ ] JSON export (data portability)
- [ ] LaTeX export (academic users)
- [ ] Export queue system (async processing)

## Estimated Effort
19 development days across 4 issues"`);

const analyticsList = analyticsIssues
  .filter(Boolean)
  .map((n) => `- [ ] #${n}`)
  .join('\\n');
exec(`gh issue edit 65 --repo ${REPO} --body "## Goal
Provide data-driven insights to help users optimize their resumes.

## Priority
High

## Child Issues
${analyticsList}

## Acceptance Criteria
- [ ] View/download tracking
- [ ] Keyword optimization suggestions
- [ ] ATS compatibility score
- [ ] Industry benchmarking

## Estimated Effort
21 development days across 3 issues"`);

const aiList = aiIssues
  .filter(Boolean)
  .map((n) => `- [ ] #${n}`)
  .join('\\n');
exec(`gh issue edit 66 --repo ${REPO} --body "## Goal
Integrate AI capabilities to provide intelligent resume suggestions and optimizations.

## Priority
High

## Child Issues
${aiList}

## Acceptance Criteria
- [ ] GPT-4 resume review
- [ ] Auto-suggestions for improvements
- [ ] Job description keyword matching
- [ ] LinkedIn profile import

## Estimated Effort
18 development days across 2 issues

## Cost Considerations
- Implement rate limiting (3 reviews/day for free users)
- Monitor OpenAI API usage"`);

const obsList = obsIssues
  .filter(Boolean)
  .map((n) => `- [ ] #${n}`)
  .join('\\n');
exec(`gh issue edit 68 --repo ${REPO} --body "## Goal
Improve monitoring, logging, and performance bottlenecks.

## Priority
High

## Child Issues
${obsList}

## Acceptance Criteria
- [ ] Structured logging (JSON)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Custom metrics (PDF export time, etc)
- [ ] Alerting rules
- [ ] Performance dashboards

## Estimated Effort
16 development days across 4 issues"`);

console.log('\n✅ All issues created and epics updated!');
console.log('\n📊 Summary:');
console.log(`- Export: ${exportIssues.filter(Boolean).length} issues`);
console.log(`- Analytics: ${analyticsIssues.filter(Boolean).length} issues`);
console.log(`- AI: ${aiIssues.filter(Boolean).length} issues`);
console.log(`- Observability: ${obsIssues.filter(Boolean).length} issues`);
