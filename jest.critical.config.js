/**
 * Critical Tests Configuration - Pre-commit Suite
 *
 * Kent Beck: "Pre-commit should give feedback in < 10s"
 * Uncle Bob: "Pre-commit protects you from obvious mistakes, not system integration"
 *
 * These 10 tests run before every commit to catch breaking changes fast:
 * - Auth core (password hashing, token generation, signup conflicts)
 * - DSL validation & compilation (schema contracts)
 * - Resume authorization (ownership checks)
 * - User management (normalization, conflicts)
 *
 * Estimated execution: ~1-2 seconds
 * No database calls, all mocked
 * High-value safety net for core business logic
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',

  // Only run critical test files
  testMatch: [
    '**/auth/services/password.service.spec.ts',
    '**/auth/services/token.service.spec.ts',
    '**/auth/services/auth-core.service.spec.ts',
    '**/dsl/dsl-validator.service.spec.ts',
    '**/dsl/dsl-compiler.service.spec.ts',
    '**/resumes/resumes.repository.spec.ts',
    '**/users/services/username.service.spec.ts',
    '**/onboarding/onboarding.service.spec.ts',
  ],

  // Filter to only critical test cases within those files
  // Core auth: password hashing, token generation, signup conflicts
  // DSL: validation, compilation
  // Resume: ownership verification
  // User: normalization, conflicts
  testNamePattern:
    '(should hash password correctly|should compare passwords correctly|should generate a JWT token|should return valid for correct DSL|should compile valid DSL to AST|should throw ConflictException when email already exists|should verify resume ownership|should normalize username to lowercase|should throw ConflictException if username already exists)',

  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  moduleFileExtensions: ['js', 'json', 'ts'],

  // No coverage in pre-commit (too slow)
  collectCoverage: false,

  // Fast failure on first error
  bail: true,

  // Minimal output (only show failures)
  silent: true,
  verbose: false,

  // Single worker for predictable performance
  maxWorkers: 1,

  // No need for these in pre-commit
  coverageDirectory: './coverage',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/integration/',
    '/test/e2e/',
    '/test/smoke/',
  ],
};
