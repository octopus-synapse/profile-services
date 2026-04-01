/**
 * Bun test setup file
 * Preloads common test utilities and suppresses noisy logs
 *
 * Usage:
 *   bun test                    # Quiet mode (default, faster)
 *   TEST_VERBOSE=1 bun test     # Verbose mode (shows all output)
 */

// Set test environment
process.env.NODE_ENV = 'test';

const VERBOSE = process.env.TEST_VERBOSE === '1' || process.env.TEST_VERBOSE === 'true';

// ═══════════════════════════════════════════════════════════════
// 1. SUPPRESS ALL LOGGING (biggest performance gain)
// ═══════════════════════════════════════════════════════════════

if (!VERBOSE) {
  const noop = () => {};
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    info: console.info,
  };

  // Allow restoring console for debugging specific tests
  (globalThis as unknown as Record<string, unknown>).__restoreConsole = () =>
    Object.assign(console, originalConsole);

  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
  console.info = noop;

  // Suppress NestJS Logger
  const { Logger, ConsoleLogger } = await import('@nestjs/common');

  Logger.overrideLogger(false);

  const loggerProto = Logger.prototype as unknown as Record<string, unknown>;
  loggerProto.log = noop;
  loggerProto.error = noop;
  loggerProto.warn = noop;
  loggerProto.debug = noop;
  loggerProto.verbose = noop;
  loggerProto.fatal = noop;

  const consoleLoggerProto = ConsoleLogger.prototype as unknown as Record<string, unknown>;
  consoleLoggerProto.log = noop;
  consoleLoggerProto.error = noop;
  consoleLoggerProto.warn = noop;
  consoleLoggerProto.debug = noop;
  consoleLoggerProto.verbose = noop;
  consoleLoggerProto.fatal = noop;

  // Suppress stdout/stderr
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = (chunk: string | Uint8Array, ...args: unknown[]) => {
    if (
      typeof chunk === 'string' &&
      (chunk.includes(' pass') || chunk.includes(' fail') || chunk.includes('Ran '))
    ) {
      return (originalStdoutWrite as (...args: unknown[]) => boolean)(chunk, ...args);
    }
    return true;
  };

  process.stderr.write = (chunk: string | Uint8Array, ...args: unknown[]) => {
    if (typeof chunk === 'string' && chunk.includes('error:')) {
      return (originalStderrWrite as (...args: unknown[]) => boolean)(chunk, ...args);
    }
    return true;
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. PRELOAD COMMON MODULES (reduces per-file import overhead)
// ═══════════════════════════════════════════════════════════════

import 'reflect-metadata';
import '@nestjs/testing';
import 'zod';
