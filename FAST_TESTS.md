# Fast Tests with Bun - Quick Wins

## Current State
- Running tests with `bun test`
- NestJS + Prisma + PostgreSQL
- No obvious bottlenecks measured yet

## Quick Wins (Do These First)

### 1. Parallel Execution
```bash
# Bun runs tests in parallel by default
bun test --concurrent
```

### 2. Isolate Slow Tests
```typescript
// Mark database/integration tests
describe.skip("slow: database operations", () => {
  // Run these separately when needed
});

// Fast unit tests run by default
describe("calculateTotal", () => {
  // Pure functions, no I/O
});
```

### 3. Mock Heavy Dependencies
```typescript
// DON'T do this in every test
const result = await prisma.user.findMany();

// DO this for most tests
const mockPrisma = {
  user: { findMany: () => [mockUser] }
};
```

### 4. Use In-Memory Test Database
```bash
# Instead of real PostgreSQL for every test
DATABASE_URL="postgresql://localhost:5432/test_db"

# Use SQLite for unit tests
DATABASE_URL="file:./test.db"
```

### 5. Watch Mode for TDD
```bash
# Only run changed files
bun test --watch

# Target specific files during dev
bun test src/users/*.spec.ts --watch
```

## Measurement First

Before optimizing further, measure:

```bash
# Time your tests
time bun test

# Profile slow tests
bun test --reporter verbose
```

## Three Categories of Tests

1. **Fast (< 10ms)** - Pure functions, no I/O
   - Run on every save
   - Should be 80% of tests

2. **Medium (10-100ms)** - Mocked services, light I/O
   - Run before commit
   - Should be 15% of tests

3. **Slow (> 100ms)** - Real database, external APIs
   - Run in CI only
   - Should be 5% of tests

## Progressive Strategy

1. Start: Run all tests with `bun test`
2. Measure: `time bun test` (get baseline)
3. Separate: Move slow tests to `*.e2e.spec.ts`
4. Run fast tests in watch mode during dev
5. Run all tests before push

## Red Flags

- Every test hits the database → Mock more
- Setup takes longer than tests → Simplify fixtures
- Tests share state → Isolate better
- Can't run single test → Fix dependencies

## Bun-Specific Optimizations

```typescript
// Use Bun's built-in test runner
import { test, expect, describe } from "bun:test";

// Use Bun's fast mocking
import { mock } from "bun:test";
const mockFn = mock(() => "result");

// Leverage Bun's speed for integration tests
// It's fast enough to hit real DB for critical paths
```

## When NOT to Optimize

- Tests already run in < 5 seconds
- You're spending more time optimizing than testing
- Mocking makes tests fragile
- Team loses confidence in tests

## Next Steps

1. Run `time bun test` - get your baseline
2. Identify the 3 slowest test files
3. Tackle those first
4. Repeat

Remember: Fast tests enable TDD. Slow tests that you trust beat fast tests that lie.
