# Backend Testing Strategy — NestJS Services

**Status:** ACTIVE — Kent Beck + Uncle Bob Approved  
**Version:** 1.0.0  
**Last Updated:** January 6, 2026  
**Covenant:** Professional Software Engineering Standards

---

## I. TESTING COVENANT

> "Tests are not written to verify code — code is written to satisfy tests."  
> — Kent Beck

### The Four Professional Obligations

1. **Tests Are Specifications** — Write tests first, implementation second
2. **Tests Must Survive Refactoring** — Assert behavior, never implementation
3. **Coverage Is a Floor, Not a Goal** — 60% minimum, 80% for critical modules
4. **Fast Feedback Is Non-Negotiable** — Unit tests <3s, integration <30s

---

## II. TEST PYRAMID FOR NESTJS

### Target Distribution

```
              E2E (10%)
              ~10 tests
            ┌──────────┐
            │  Staging │  Full user journeys
            │  Deploy  │  Pre-release validation
            └──────────┘

          Integration (30%)
          ~90-100 tests
        ┌────────────────┐
        │ DB + Service   │  Real database + Redis
        │ + Controller   │  Mocked external APIs
        │ Contract Tests │  Transaction rollback
        └────────────────┘

      Unit Tests (60%)
      ~180-200 tests
  ┌──────────────────────┐
  │  Business Logic      │  Isolated, mocked dependencies
  │  Validators          │  Property-based testing
  │  Transformers        │  Mutation score >80%
  │  Utilities           │  Fast (<3s total)
  └──────────────────────┘
```

### Current vs Target

| Test Type       | Current               | Target                | Files Needed |
| --------------- | --------------------- | --------------------- | ------------ |
| **Unit**        | 30 files (~150 tests) | 60 files (~200 tests) | +30 files    |
| **Integration** | 0 files               | 15 files (~100 tests) | +15 files    |
| **E2E**         | 2 files (~10 tests)   | 2 files (~10 tests)   | ✅ Complete  |
| **Smoke**       | 4 files (~80 tests)   | 1 file (~6 tests)     | Refactor     |
| **TOTAL**       | ~240 tests            | ~310 tests            | +45 files    |

**Coverage:** 15-20% → **60%+**

---

## III. NESTJS TESTING PATTERNS

### Pattern 1: Isolated Unit Tests (Services)

**What to Test:**

- Business logic methods
- Data transformations
- Validation rules
- Error handling

**What NOT to Test:**

- Database queries (use integration tests)
- HTTP request/response (use e2e tests)
- NestJS dependency injection (framework responsibility)

**Example: Service Unit Test**

```typescript
// ✅ GOOD: Behavioral test with mocked dependencies
describe('ResumeService', () => {
  let service: ResumeService;
  let mockRepository: DeepMocked<ResumeRepository>;

  beforeEach(async () => {
    mockRepository = createMock<ResumeRepository>();

    const module = await Test.createTestingModule({
      providers: [
        ResumeService,
        { provide: ResumeRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get(ResumeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create resume with default theme when theme not specified', async () => {
    // Arrange
    const createDto = { title: 'Software Engineer Resume' };
    const userId = 'user-123';
    mockRepository.create.mockResolvedValue({
      id: 'resume-456',
      ...createDto,
      themeId: 'default-theme',
      userId,
    });

    // Act
    const result = await service.createResume(userId, createDto);

    // Assert
    expect(result).toMatchObject({
      id: 'resume-456',
      title: 'Software Engineer Resume',
      themeId: 'default-theme',
    });
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ...createDto,
        userId,
        themeId: 'default-theme',
      }),
    );
  });
});
```

**❌ BAD: Implementation-coupled test**

```typescript
// This tests HOW, not WHAT
it('should delegate to profileService', async () => {
  await service.getProfile(userId);
  expect(profileService.getProfile).toHaveBeenCalled(); // WRONG!
});

// ✅ GOOD: Test the observable behavior
it('should return user profile with formatted display name', async () => {
  const profile = await service.getProfile(userId);
  expect(profile).toMatchObject({
    id: userId,
    displayName: expect.stringMatching(/^[A-Z]/), // Capitalized
  });
});
```

---

### Pattern 2: Repository Tests (Database Layer)

**When to Use:**

- Custom Prisma query logic
- Complex joins or aggregations
- Transaction handling

**Setup:** Use real database (Postgres + Redis) in test containers

```typescript
describe('ResumeRepository', () => {
  let repository: ResumeRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ResumeRepository, PrismaService],
    }).compile();

    repository = module.get(ResumeRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    // Clean up: delete all test data
    await prisma.resume.deleteMany();
  });

  it('should find resumes with themes and metadata', async () => {
    // Arrange: Seed database
    const user = await prisma.user.create({
      data: { email: 'test@example.com', username: 'testuser' },
    });
    await prisma.resume.create({
      data: {
        title: 'My Resume',
        userId: user.id,
        theme: { create: { name: 'Professional' } },
      },
    });

    // Act
    const resumes = await repository.findByUserId(user.id);

    // Assert
    expect(resumes).toHaveLength(1);
    expect(resumes[0].theme.name).toBe('Professional');
  });
});
```

---

### Pattern 3: Controller Tests (HTTP Layer)

**Focus:** Request validation, response formatting, status codes

**Tools:** `supertest` for HTTP testing

```typescript
describe('ResumesController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule], // Full module with all dependencies
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /resumes should create resume and return 201', async () => {
    // Arrange
    const createDto = { title: 'New Resume' };

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/resumes')
      .set('Authorization', 'Bearer valid-token')
      .send(createDto)
      .expect(201);

    // Assert
    expect(response.body).toMatchObject({
      id: expect.any(String),
      title: 'New Resume',
      createdAt: expect.any(String),
    });
  });

  it('POST /resumes should return 400 for invalid title', async () => {
    // Act & Assert
    await request(app.getHttpServer())
      .post('/v1/resumes')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: '' }) // Invalid: empty string
      .expect(400);
  });
});
```

---

### Pattern 4: Integration Tests (Multi-Layer)

**Purpose:** Verify components work together correctly

**Scope:** Service → Repository → Database → Controller

```typescript
describe('Auth Flow Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('should complete full auth flow: signup → login → refresh → logout', async () => {
    // Step 1: Signup
    const signupRes = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test@1234',
      })
      .expect(201);

    expect(signupRes.body).toHaveProperty('accessToken');
    expect(signupRes.body).toHaveProperty('refreshToken');

    const { accessToken, refreshToken } = signupRes.body;

    // Step 2: Login with same credentials
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test@1234',
      })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();

    // Step 3: Refresh token
    const refreshRes = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.accessToken).not.toBe(accessToken); // New token

    // Step 4: Access protected route
    await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
      .expect(200);
  });
});
```

---

### Pattern 5: Property-Based Testing (Validators)

**When to Use:** Schemas, validators, parsers with infinite input space

**Tool:** `fast-check`

```typescript
import * as fc from 'fast-check';
import { UsernameSchema } from '@octopus-synapse/profile-contracts';

describe('UsernameSchema (Property Tests)', () => {
  it('should accept valid usernames (alphanumeric + underscore)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9_]{3,30}$/), // Valid format
        (username) => {
          const result = UsernameSchema.safeParse(username);
          expect(result.success).toBe(true);
        },
      ),
    );
  });

  it('should reject usernames with invalid characters', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/.*[^a-z0-9_].*/), // Contains invalid char
        (username) => {
          const result = UsernameSchema.safeParse(username);
          expect(result.success).toBe(false);
        },
      ),
    );
  });

  it('should reject reserved usernames', () => {
    const reserved = ['admin', 'api', 'root', 'test'];
    reserved.forEach((username) => {
      const result = UsernameSchema.safeParse(username);
      expect(result.success).toBe(false);
    });
  });
});
```

---

## IV. TEST DATA FACTORIES

### Using Fishery for Type-Safe Factories

**Install:**

```bash
npm install --save-dev fishery @faker-js/faker
```

**Create Factories:**

```typescript
// test/factories/user.factory.ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { User } from '@prisma/client';

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  username: `user${sequence}`,
  displayName: faker.person.fullName(),
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

// Usage in tests:
const user = userFactory.build();
const users = userFactory.buildList(5);
const customUser = userFactory.build({ email: 'custom@example.com' });
```

**✅ CRITICAL: Use Contract Schemas**

```typescript
// ❌ BAD: Local schema (duplicate source of truth)
const user = { username: 'test_user', email: 'test@example.com' };

// ✅ GOOD: Contract-based factory
import {
  UsernameSchema,
  EmailSchema,
} from '@octopus-synapse/profile-contracts';

export const userFactory = Factory.define<User>(() => ({
  username: UsernameSchema.parse(faker.internet.userName()),
  email: EmailSchema.parse(faker.internet.email()),
  // ...
}));
```

---

## V. MOCKING STRATEGIES

### Mocking External APIs (MSW for HTTP, Manual for SDKs)

```typescript
// For AWS S3
const mockS3Client = {
  send: jest.fn().mockResolvedValue({
    $metadata: { httpStatusCode: 200 },
  }),
};

// For SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

// For Puppeteer
const mockBrowser = {
  newPage: jest.fn().mockResolvedValue({
    goto: jest.fn(),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
    close: jest.fn(),
  }),
  close: jest.fn(),
};
```

---

## VI. COVERAGE REQUIREMENTS

### Global Thresholds

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  }
}
```

### Module-Specific Targets

| Module                | Target Coverage | Mutation Score | Priority    |
| --------------------- | --------------- | -------------- | ----------- |
| **Auth**              | 80%             | >80%           | 🔴 CRITICAL |
| **DSL Compiler**      | 80%             | >80%           | 🔴 CRITICAL |
| **Resume CRUD**       | 70%             | >70%           | 🟡 HIGH     |
| **Export (PDF/DOCX)** | 75%             | >75%           | 🟡 HIGH     |
| **ATS Validators**    | 80%             | >80%           | 🔴 CRITICAL |
| **Onboarding**        | 70%             | N/A            | 🟡 HIGH     |
| **Themes**            | 60%             | N/A            | 🟢 MEDIUM   |
| **Translation**       | 60%             | N/A            | 🟢 MEDIUM   |
| **Upload**            | 70%             | N/A            | 🟡 HIGH     |

---

## VII. TEST ORGANIZATION

### Directory Structure

```
profile-services/
├── src/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts          # Unit test (same dir as source)
│   │   └── dto/
│   │       └── signup.dto.spec.ts        # Validation tests
│   ├── resumes/
│   │   ├── resumes.service.spec.ts
│   │   └── resumes.repository.spec.ts
│   └── ...
└── test/
    ├── factories/                          # Test data factories
    │   ├── user.factory.ts
    │   ├── resume.factory.ts
    │   └── index.ts
    ├── integration/                        # Integration tests
    │   ├── auth-flow.integration.spec.ts
    │   ├── resume-lifecycle.integration.spec.ts
    │   └── dsl-compilation.integration.spec.ts
    ├── smoke/                              # Smoke tests (deployability)
    │   └── deployability.smoke.spec.ts
    ├── jest-e2e.json                       # E2E config
    ├── jest-integration.json               # Integration config
    └── jest-smoke.json                     # Smoke config
```

---

## VIII. TEST EXECUTION STRATEGY

### Local Development

```bash
# Fast feedback loop (TDD)
npm run test:watch              # Watch mode, re-run on change

# Targeted testing
npm run test:changed            # Only changed files
npm run test:fast               # Bail on first failure

# Full suite
npm run test                    # All unit tests (<3s)
npm run test:cov                # With coverage report

# Integration & E2E
npm run test:integration        # Real DB (<30s)
npm run test:e2e                # Full HTTP (<60s)
npm run test:smoke              # Deployability (<10s)
```

### CI Pipeline

```yaml
jobs:
  quality: # Lint + Typecheck (parallel)
  test: # Unit tests + coverage (parallel)
  smoke: # Smoke tests (sequential, after unit)
  build: # Docker build (parallel with smoke)
  integration: # Integration tests (parallel with build)
  deploy: # Deploy (sequential, after all pass)
```

---

## IX. COMMON ANTI-PATTERNS TO AVOID

### ❌ Anti-Pattern 1: Testing Implementation

```typescript
// BAD: Breaks when you rename a method
it('should call getUserById', () => {
  service.getProfile(userId);
  expect(userRepository.getUserById).toHaveBeenCalled();
});

// GOOD: Tests observable behavior
it('should return profile with user details', async () => {
  const profile = await service.getProfile(userId);
  expect(profile.userId).toBe(userId);
  expect(profile.displayName).toBeDefined();
});
```

### ❌ Anti-Pattern 2: Testing the Framework

```typescript
// BAD: Testing NestJS DI
it('should inject dependencies', () => {
  expect(service).toBeDefined(); // Useless test
});

// GOOD: Test business logic
it('should calculate total price with discount', () => {
  const total = service.calculateTotal(items, discountCode);
  expect(total).toBe(85.5);
});
```

### ❌ Anti-Pattern 3: Flaky Tests (Time/Random Dependent)

```typescript
// BAD: Depends on current time
it('should create recent timestamp', () => {
  const record = service.create();
  expect(record.createdAt).toBe(new Date()); // FLAKY!
});

// GOOD: Assert range or mock time
it('should create timestamp within last second', () => {
  const before = Date.now();
  const record = service.create();
  const after = Date.now();
  expect(record.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  expect(record.createdAt.getTime()).toBeLessThanOrEqual(after);
});
```

---

## X. TOOLS & CONFIGURATION

### Jest Configuration

```json
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  },
  "watchPathIgnorePatterns": ["node_modules", "dist", "coverage"],
  "maxWorkers": "50%"
}
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest --maxWorkers=50%",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:fast": "jest --maxWorkers=50% --bail --silent",
    "test:changed": "jest --onlyChanged --bail --silent",
    "test:metrics": "jest --json --outputFile=test-metrics.json && node scripts/analyze-test-metrics.js",
    "test:integration": "jest --config ./test/jest-integration.json",
    "test:smoke": "jest --config ./test/jest-smoke.json",
    "test:mutation": "stryker run --incremental"
  }
}
```

---

## XI. TDD WORKFLOW (MANDATORY FOR NEW CODE)

### Red-Green-Refactor Cycle

```
1. RED    → Write failing test
2. GREEN  → Write minimum code to pass
3. REFACTOR → Improve design without breaking tests
```

### Example: Adding New Feature

**Step 1: Write the test first**

```typescript
describe('ResumeService.duplicateResume', () => {
  it('should create copy of resume with new ID and "(Copy)" suffix', async () => {
    // Arrange
    const original = await service.createResume(userId, {
      title: 'My Resume',
    });

    // Act
    const duplicate = await service.duplicateResume(original.id);

    // Assert
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.title).toBe('My Resume (Copy)');
    expect(duplicate.userId).toBe(original.userId);
  });
});
```

**Step 2: Run test — should FAIL**

```bash
npm test -- --testNamePattern="duplicateResume"
# ✗ Method duplicateResume does not exist
```

**Step 3: Write minimum code**

```typescript
async duplicateResume(resumeId: string): Promise<Resume> {
  const original = await this.repository.findById(resumeId);
  const duplicate = await this.repository.create({
    ...original,
    id: undefined, // New ID generated
    title: `${original.title} (Copy)`,
  });
  return duplicate;
}
```

**Step 4: Run test — should PASS**

```bash
npm test -- --testNamePattern="duplicateResume"
# ✓ should create copy of resume with new ID and "(Copy)" suffix
```

**Step 5: Refactor if needed**

```typescript
// Extract title logic
private generateDuplicateTitle(original: string): string {
  return `${original} (Copy)`;
}

async duplicateResume(resumeId: string): Promise<Resume> {
  const original = await this.repository.findById(resumeId);
  return this.repository.create({
    ...original,
    id: undefined,
    title: this.generateDuplicateTitle(original.title),
  });
}
```

**Step 6: Re-run test — still PASSES**

---

## XII. MUTATION TESTING

### Configuration (Stryker)

```json
{
  "mutator": "typescript",
  "packageManager": "npm",
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.ts", "!src/**/*.spec.ts"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 60
  }
}
```

### Run Weekly

```bash
npm run test:mutation -- --incremental
```

---

## XIII. KENT BECK COMPLIANCE CHECKLIST

Before merging any PR:

- [ ] All tests written **before** implementation (TDD)
- [ ] Tests assert **behavior**, not **implementation**
- [ ] Unit tests complete in **<3 seconds**
- [ ] Integration tests complete in **<30 seconds**
- [ ] Coverage **≥60%** (critical modules **≥80%**)
- [ ] Zero flaky tests (retry logic for external dependencies)
- [ ] All tests follow **AAA pattern** (Arrange-Act-Assert)
- [ ] Test names describe **observable behavior**
- [ ] Test data uses **factories with contracts**
- [ ] No local validation schemas (**contracts only**)

---

## XIV. UNCLE BOB COMPLIANCE CHECKLIST

Before merging any PR:

- [ ] Tests are **clean code** (readable, maintainable)
- [ ] One assertion per test (or related assertions)
- [ ] Tests are **independent** (can run in any order)
- [ ] Tests are **repeatable** (deterministic, no time/random dependency)
- [ ] Tests are **self-validating** (pass/fail, no manual inspection)
- [ ] Tests are **timely** (written immediately with code)
- [ ] No commented-out tests
- [ ] No skipped tests without issue tracking
- [ ] Test coverage reflects **professional standards**

---

## XV. REFERENCES

- **Kent Beck** — Test-Driven Development: By Example
- **Uncle Bob** — Clean Code, Clean Architecture
- **Martin Fowler** — Refactoring, Test Pyramid
- **NestJS Testing Docs** — https://docs.nestjs.com/fundamentals/testing
- **Jest Documentation** — https://jestjs.io/docs/getting-started
- **fast-check** — https://fast-check.dev/
- **Stryker Mutator** — https://stryker-mutator.io/

---

**STATUS:** ACTIVE  
**APPROVAL:** Kent Beck + Uncle Bob (Consensus Achieved)  
**NEXT:** Implement Milestone 0 — Remove Blockers
