#!/usr/bin/env node
/**
 * Create GraphQL Migration child issues
 */

import { execSync } from 'child_process';

const REPOSITORY = 'octopus-synapse/profile-services';
const GRAPHQL_EPIC_NUMBER = 67;

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

function createGraphQLIssues(): string[] {
  console.log('🚀 Creating GraphQL Migration issues...\n');

  const createdIssueNumbers: string[] = [];

  const schemaDesignIssueNumber = createGitHubIssue(
    'Design GraphQL schema with Code-First approach',
    'graphql,backend',
    'Q3 2026 - Platform & Marketplace',
    `## Description
Design GraphQL schema using NestJS Code-First approach with GraphQL decorators.

## Tasks
- [ ] Install @nestjs/graphql and apollo-server-express
- [ ] Configure GraphQL module in NestJS
- [ ] Define ObjectTypes for Resume, Profile, Experience, Education, etc
- [ ] Define InputTypes for mutations
- [ ] Implement field resolvers
- [ ] Add validation decorators
- [ ] Document schema with descriptions
- [ ] Write tests

## Technical Notes
- Use Code-First (decorators) not Schema-First
- Enable introspection in development only
- Add field-level authorization

## Estimated Time
4 days`,
    GRAPHQL_EPIC_NUMBER,
  );
  if (schemaDesignIssueNumber) {
    createdIssueNumbers.push(schemaDesignIssueNumber);
  }

  const dataLoaderIssueNumber = createGitHubIssue(
    'Implement DataLoader for N+1 query optimization',
    'graphql,performance,backend',
    'Q3 2026 - Platform & Marketplace',
    `## Description
Prevent N+1 queries in GraphQL resolvers using DataLoader pattern.

## Tasks
- [ ] Install dataloader package
- [ ] Create base DataLoader factory
- [ ] Implement loaders for Resume → User
- [ ] Implement loaders for Resume → Experiences
- [ ] Implement loaders for Resume → Education
- [ ] Add batch loading for themes
- [ ] Add caching layer (per-request)
- [ ] Add monitoring for batch efficiency
- [ ] Write tests

## Technical Notes
- Scope DataLoaders per-request (avoid cache pollution)
- Use Prisma findMany for batching

## Estimated Time
5 days`,
    GRAPHQL_EPIC_NUMBER,
  );
  if (dataLoaderIssueNumber) {
    createdIssueNumbers.push(dataLoaderIssueNumber);
  }

  const playgroundIssueNumber = createGitHubIssue(
    'Set up GraphQL Playground and documentation',
    'graphql,backend',
    'Q3 2026 - Platform & Marketplace',
    `## Description
Configure GraphQL Playground and auto-generate API documentation.

## Tasks
- [ ] Enable GraphQL Playground in development
- [ ] Disable in production (security)
- [ ] Configure introspection settings
- [ ] Add authentication to Playground
- [ ] Generate schema.graphql file
- [ ] Add example queries/mutations
- [ ] Document authentication flow
- [ ] Add rate limiting

## Estimated Time
3 days`,
    GRAPHQL_EPIC_NUMBER,
  );
  if (playgroundIssueNumber) {
    createdIssueNumbers.push(playgroundIssueNumber);
  }

  return createdIssueNumbers;
}

function updateGraphQLEpic(issueNumbers: string[]): void {
  console.log('\n📝 Updating GraphQL epic task list...\n');

  const issueList = issueNumbers
    .filter(Boolean)
    .map((issueNumber) => `- [ ] #${issueNumber}`)
    .join('\\n');

  const epicBody = `## Goal
Migrate from REST to GraphQL API for more flexible data fetching and better developer experience.

## Priority
Medium

## Child Issues
${issueList}

## Acceptance Criteria
- [ ] GraphQL schema design (Code-First)
- [ ] DataLoader for N+1 optimization
- [ ] GraphQL Playground (dev only)
- [ ] Authentication & authorization
- [ ] API documentation

## Estimated Effort
12 development days across 3 issues

## Migration Strategy
- Run REST and GraphQL in parallel (no breaking changes)
- Deprecate REST endpoints gradually
- Target: Q4 2026 for full REST deprecation`;

  const command = `gh issue edit ${GRAPHQL_EPIC_NUMBER} --repo ${REPOSITORY} --body "${epicBody}"`;
  executeCommand(command);
}

function main(): void {
  const createdIssueNumbers = createGraphQLIssues();
  updateGraphQLEpic(createdIssueNumbers);

  console.log('\n✅ GraphQL issues created and epic updated!');
  console.log(`\n📊 Created ${createdIssueNumbers.length} issues`);
}

main();
