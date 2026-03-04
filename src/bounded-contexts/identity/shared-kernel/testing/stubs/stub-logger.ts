/**
 * Stub Logger for Testing
 *
 * Captures log calls for test assertions without actual logging.
 */

export class StubLogger {
  private logs: Array<{
    level: string;
    message: string;
    context?: string;
    meta?: Record<string, unknown>;
  }> = [];

  // ============ Test Helpers ============

  /**
   * Get all captured logs
   */
  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: string): typeof this.logs {
    return this.logs.filter((l) => l.level === level);
  }

  /**
   * Check if a message was logged
   */
  hasLogged(message: string, level?: string): boolean {
    return this.logs.some(
      (l) => l.message === message && (level === undefined || l.level === level),
    );
  }

  /**
   * Get the last log entry
   */
  getLastLog(): (typeof this.logs)[0] | undefined {
    return this.logs[this.logs.length - 1];
  }

  /**
   * Clear all captured logs
   */
  clear(): void {
    this.logs = [];
  }

  // ============ Logger Interface ============

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
