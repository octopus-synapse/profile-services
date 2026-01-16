#!/usr/bin/env node
/**
 * Create Observability child issues
 */

import { execSync } from 'child_process';

const REPOSITORY = 'octopus-synapse/profile-services';
const OBSERVABILITY_EPIC_NUMBER = 68;

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

function createObservabilityIssues(): string[] {
  console.log('🚀 Creating Observability issues...\n');

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
    OBSERVABILITY_EPIC_NUMBER,
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
    OBSERVABILITY_EPIC_NUMBER,
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
    OBSERVABILITY_EPIC_NUMBER,
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
    OBSERVABILITY_EPIC_NUMBER,
  );
  if (alertingIssueNumber) {
    createdIssueNumbers.push(alertingIssueNumber);
  }

  return createdIssueNumbers;
}

function updateObservabilityEpic(issueNumbers: string[]): void {
  console.log('\n📝 Updating Observability epic task list...\n');

  const issueList = issueNumbers
    .filter(Boolean)
    .map((issueNumber) => `- [ ] #${issueNumber}`)
    .join('\\n');

  const epicBody = `## Goal
Improve monitoring, logging, and performance bottlenecks.

## Priority
High

## Child Issues
${issueList}

## Acceptance Criteria
- [ ] Structured logging (JSON)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Custom metrics (PDF export time, etc)
- [ ] Alerting rules
- [ ] Performance dashboards

## Estimated Effort
16 development days across 4 issues`;

  const command = `gh issue edit ${OBSERVABILITY_EPIC_NUMBER} --repo ${REPOSITORY} --body "${epicBody}"`;
  executeCommand(command);
}

function main(): void {
  const createdIssueNumbers = createObservabilityIssues();
  updateObservabilityEpic(createdIssueNumbers);

  console.log('\n✅ Observability issues created and epic updated!');
  console.log(`\n📊 Created ${createdIssueNumbers.length} issues`);
}

main();
