/**
 * Integration Test Setup
 *
 * Provides database connection for integration tests.
 * Tests handle their own cleanup.
 *
 * Uncle Bob: "Integration tests validate real collaborations without mocks"
 * Kent Beck: "Fast feedback requires automatic cleanup"
 */

// Simple setup - no transaction management (tests handle cleanup)
console.log('✅ Integration test setup loaded');
