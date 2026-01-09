#!/usr/bin/env node
/**
 * Create Observability child issues
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

console.log('🚀 Creating Observability issues...\n');

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

// Update epic #68 with child issues
console.log('\n📝 Updating Observability epic task list...\n');

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

console.log('\n✅ Observability issues created and epic updated!');
console.log(`\n📊 Created ${obsIssues.filter(Boolean).length} issues`);
