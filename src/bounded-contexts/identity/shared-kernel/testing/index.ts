/**
 * Identity Testing Utilities
 *
 * In-Memory repositories and stubs for clean unit testing.
 * These replace mocks with real implementations that store data in memory.
 *
 * Benefits:
 * - Tests real behavior, not mocked returns
 * - TypeScript-safe, no complex mock typing
 * - Faster than mocks (no proxy overhead)
 * - Reusable across all identity tests
 */

export * from './in-memory';
export * from './stubs';
