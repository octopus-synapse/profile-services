/**
 * Static Analysis Tests Setup
 *
 * Shared setup for all static analysis tests:
 * - Architecture tests (Clean Architecture rules)
 * - Contract tests (API contracts, SDK)
 * - Security tests (OWASP, injection, etc.)
 *
 * These tests don't require runtime or database.
 */

process.env.NODE_ENV = 'test';

import 'reflect-metadata';
