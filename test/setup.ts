/**
 * Bun test setup file (optional)
 * Preloads common test utilities to reduce per-file overhead
 *
 * To use, add to bunfig.toml:
 * preload = ["./test/setup.ts"]
 */

// Suppress NestJS logging noise in tests globally
import { Logger } from '@nestjs/common';

// Only suppress in test environment
if (process.env.NODE_ENV === 'test') {
  Logger.overrideLogger(false);
}

// Optionally: Preload common test utilities
// This loads them ONCE instead of per test file
import '@nestjs/testing';
import 'reflect-metadata';
