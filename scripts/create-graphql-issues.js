#!/usr/bin/env node
/**
 * Create GraphQL Migration child issues
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

console.log('🚀 Creating GraphQL Migration issues...\n');

const graphqlIssues = [];

graphqlIssues.push(
  createIssue(
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
    67,
  ),
);

graphqlIssues.push(
  createIssue(
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
    67,
  ),
);

graphqlIssues.push(
  createIssue(
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
    67,
  ),
);

// Update epic #67 with child issues
console.log('\n📝 Updating GraphQL epic task list...\n');

const graphqlList = graphqlIssues
  .filter(Boolean)
  .map((n) => `- [ ] #${n}`)
  .join('\\n');
exec(`gh issue edit 67 --repo ${REPO} --body "## Goal
Migrate from REST to GraphQL API for more flexible data fetching and better developer experience.

## Priority
Medium

## Child Issues
${graphqlList}

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
- Target: Q4 2026 for full REST deprecation"`);

console.log('\n✅ GraphQL issues created and epic updated!');
console.log(`\n📊 Created ${graphqlIssues.filter(Boolean).length} issues`);
