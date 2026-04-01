/**
 * Infrastructure Tests Setup
 *
 * Shared setup for all infrastructure-dependent tests:
 * - Integration tests
 * - E2E tests
 *
 * These tests require database and/or Redis.
 */

import { setDefaultTimeout } from 'bun:test';
import { join } from 'node:path';
import { config } from 'dotenv';

// Load test environment
config({ path: join(__dirname, '..', '..', '.env.test'), override: false });

process.env.NODE_ENV = 'test';

// Longer timeout for DB operations
setDefaultTimeout(30000);

import 'reflect-metadata';
import '@nestjs/testing';
