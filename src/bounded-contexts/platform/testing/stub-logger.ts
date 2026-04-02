/**
 * Stub Logger for testing
 *
 * Captures all log messages for verification in tests.
 */
export class StubLogger {
  readonly logs: string[] = [];
  readonly errors: string[] = [];
  readonly warns: string[] = [];
  readonly debugs: string[] = [];

  log(message: string, _context?: string): void {
    this.logs.push(message);
  }

  error(message: string, _trace?: string, _context?: string): void {
    this.errors.push(message);
  }

  warn(message: string, _context?: string): void {
    this.warns.push(message);
  }

  debug(message: string, _context?: string): void {
    this.debugs.push(message);
  }

  clear(): void {
    this.logs.length = 0;
    this.errors.length = 0;
    this.warns.length = 0;
    this.debugs.length = 0;
  }

  hasLog(message: string): boolean {
    return this.logs.some((log) => log.includes(message));
  }

  hasError(message: string): boolean {
    return this.errors.some((error) => error.includes(message));
  }

  hasWarn(message: string): boolean {
    return this.warns.some((warn) => warn.includes(message));
  }

  hasDebug(message: string): boolean {
    return this.debugs.some((debug) => debug.includes(message));
  }
}
