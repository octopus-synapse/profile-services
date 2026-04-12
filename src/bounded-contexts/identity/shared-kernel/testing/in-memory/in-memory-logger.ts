/**
 * In-Memory Logger for Testing
 *
 * Captures log calls for test assertions without actual logging.
 * Migrated from StubLogger.
 */

export class InMemoryLogger {
  private logs: Array<{
    level: string;
    message: string;
    context?: string;
    meta?: Record<string, unknown>;
  }> = [];

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  getLogsByLevel(level: string): typeof this.logs {
    return this.logs.filter((l) => l.level === level);
  }

  hasLogged(message: string, level?: string): boolean {
    return this.logs.some(
      (l) => l.message === message && (level === undefined || l.level === level),
    );
  }

  getLastLog(): (typeof this.logs)[0] | undefined {
    return this.logs[this.logs.length - 1];
  }

  clear(): void {
    this.logs = [];
  }

  // ───────────────────────────────────────────────────────────────
  // Logger Interface
  // ───────────────────────────────────────────────────────────────

  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'log', message, context, meta });
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'debug', message, context, meta });
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'warn', message, context, meta });
  }

  error(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'error', message, context, meta });
  }

  verbose(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logs.push({ level: 'verbose', message, context, meta });
  }
}
