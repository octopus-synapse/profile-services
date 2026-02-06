# E2E Tests

End-to-end tests that validate complete user journeys.

## Quick Start

```bash
# Run E2E tests with Docker (recommended)
bun run test:e2e:docker

# Run E2E tests (requires manual setup)
bun run test:e2e:run

# Run single journey
bun test test/e2e/journeys/01-user-lifecycle.e2e-spec.ts
```

## Structure

```
test/e2e/
├── journeys/              # Complete user journey tests
│   ├── 01-user-lifecycle.e2e-spec.ts    # Signup → Onboarding → Share → Public
│   ├── 02-authentication.e2e-spec.ts    # Login → Protected → Refresh → Logout
│   └── ...
├── helpers/               # Reusable test utilities
│   ├── auth.helper.ts     # Authentication flows
│   └── cleanup.helper.ts  # Test data cleanup
├── fixtures/              # Test data
│   └── resumes.fixture.ts # Sample resume data
└── setup-e2e.ts          # App initialization
```

## Implemented Journeys

### ✅ Journey 1: User Lifecycle (P0 - CRITICAL)

Tests the complete new user experience:

1. **Account Creation** - Signup with email/password
2. **Email Verification** - Request verification email
3. **ToS Acceptance** - Accept Terms & Privacy Policy
4. **Onboarding** - Complete profile setup
5. **Resume Verification** - Confirm resume created
6. **Share Creation** - Generate public share link
7. **Public Access** - Verify public resume viewing
8. **Cleanup** - Delete share and test data

**Target Time:** < 30 seconds

### ✅ Journey 2: Authentication (P0 - CRITICAL)

Tests all authentication and security flows:

1. **Login Flow** - Valid/invalid credentials
2. **Protected Access** - Token validation
3. **Token Refresh** - Renew access tokens
4. **Password Validation** - Enforce complexity
5. **Authorization Boundaries** - Cross-user access prevention
6. **Logout** - Session termination
7. **Rate Limiting** - Brute force protection

**Target Time:** < 15 seconds

## Running Tests

### Prerequisites

```bash
# Install dependencies
bun install

# Generate Prisma Client
bunx prisma generate
```

### With Docker (Recommended)

```bash
# Starts PostgreSQL + Redis, runs tests, cleans up
bun run test:e2e:docker
```

### Manual Setup

```bash
# Start services
docker compose -f docker-compose.test.yml up -d

# Wait for services
sleep 3

# Run tests
bun run test:e2e:run

# Cleanup
docker compose -f docker-compose.test.yml down
```

### In CI

E2E tests run automatically:

- **On PRs to main**: If src/, e2e/, or prisma/ changed
- **Nightly**: Full suite at 3 AM UTC
- **Manual**: Via GitHub Actions workflow_dispatch

## Writing New Journey Tests

See [E2E Test Patterns](../docs/E2E_TEST_PATTERNS.md) for detailed guidelines.

### Quick Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createE2ETestApp } from '../setup-e2e';

describe('E2E Journey X: Feature Name', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
  });

  afterAll(async () => {
    // ALWAYS cleanup test data
    await cleanupHelper.deleteUserByEmail('test@example.com');
    await app.close();
  });

  describe('Step 1: Description', () => {
    it('should do something meaningful', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/endpoint')
        .send({ data: 'value' });

      expect(response.status).toBe(200);
    });
  });
});
```

## Helpers

### AuthHelper

```typescript
// Create test user
const user = authHelper.createTestUser('identifier');
// { email: 'e2e-identifier@test.com', password: 'Test123!@#', name: 'E2E Test User' }

// Register and login in one step
const { user, token } = await authHelper.registerAndLogin('user1');

// Login existing user
const token = await authHelper.login(email, password);

// Refresh token
const newToken = await authHelper.refreshToken(token);

// Accept ToS
await authHelper.acceptToS(token);
```

### CleanupHelper

```typescript
// Delete by email (most common)
await cleanupHelper.deleteUserByEmail('e2e-test@test.com');

// Delete by ID
await cleanupHelper.deleteUserById(userId);

// Delete resume
await cleanupHelper.deleteResumeById(resumeId);

// Delete share
await cleanupHelper.deleteShareBySlug(shareSlug);

// Nuclear option (use sparingly)
await cleanupHelper.cleanAllE2EData();
```

### Fixtures

```typescript
import {
  minimalOnboardingData,
  fullOnboardingData,
  createResumeData,
  createExperienceData,
} from '../fixtures/resumes.fixture';

// Minimal valid profile
const response = await request(app.getHttpServer())
  .post('/api/v1/onboarding')
  .send(minimalOnboardingData);

// Full rich profile
const response = await request(app.getHttpServer())
  .post('/api/v1/onboarding')
  .send(fullOnboardingData);
```

## Debugging

### Verbose Output

```bash
bun test test/e2e/journeys --reporter=verbose
```

### Single Test

```bash
bun test test/e2e/journeys/01-user-lifecycle.e2e-spec.ts
```

### Inspect Database

```typescript
// Add to test
const testApp = await createE2ETestApp();
const { prisma } = testApp;

console.log('User:', await prisma.user.findUnique({ where: { email } }));
console.log('Resume:', await prisma.resume.findUnique({ where: { id } }));
```

### Check API Response

```typescript
if (response.status !== 200) {
  console.log('Unexpected:', {
    status: response.status,
    body: response.body,
  });
}
```

## Performance Targets

| Journey        | Target | Max | Current |
| -------------- | ------ | --- | ------- |
| User Lifecycle | < 30s  | 45s | TBD     |
| Authentication | < 15s  | 20s | TBD     |

## Common Issues

### Tests Fail in CI but Pass Locally

- **Check environment variables** - Ensure DATABASE_URL, JWT_SECRET are set
- **Add explicit waits** - CI may be slower than local
- **Verify service health** - PostgreSQL/Redis may not be ready

### Database Cleanup Fails

- **Foreign key constraints** - Delete children before parents
- **Check error logs** - CleanupHelper logs warnings
- **Manual cleanup** - Connect to test DB and inspect

### Token Expired Mid-Test

- **Refresh token** - Use `authHelper.refreshToken(token)`
- **Shorten test** - Break into smaller steps
- **Increase TTL** - For test environment only

## Next Steps

- [ ] Implement Journey 3: Resume CRUD (P1)
- [ ] Implement Journey 4: Public Resume (P1)
- [ ] Implement Journey 5: Export Pipeline (P2)
- [ ] Implement Journey 6: DSL Integration (P3)
- [ ] Add performance tracking
- [ ] Add flakiness monitoring
- [ ] Integrate with Slack for nightly failures

## References

- [E2E Test Patterns](../docs/E2E_TEST_PATTERNS.md) - Detailed guidelines
- [E2E & CI Optimization](../docs/E2E_TESTS_AND_CI_OPTIMIZATION.md) - Analysis & strategy
- [Testing Architecture (ADR-001)](../docs/ADR-001-TEST-ARCHITECTURE.md) - Overall strategy
