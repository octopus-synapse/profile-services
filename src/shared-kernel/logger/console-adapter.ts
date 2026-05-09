import { LoggerPort } from './logger.port';

/**
 * Console-backed `LoggerPort` adapter.
 *
 * Use this in places that need a `LoggerPort` but cannot wire the real
 * Winston-backed logger because the call site runs before the
 * composition root (seed runners, translation composition bootstrap).
 *
 * Output is unstructured stdout/stderr — agreed trade-off for cases
 * where structured logs aren't reachable, see Q22 in the duplication
 * audit. Do NOT use for ordinary services; inject `LoggerPort` properly.
 */
export class ConsoleLoggerAdapter extends LoggerPort {
  constructor(private readonly tag: string = 'app') {
    super();
  }

  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.write('log', message, context, meta);
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, context, meta);
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, context, meta);
  }

  error(message: string, options: Record<string, unknown> = {}): void {
    const { context, ...rest } = options;
    this.write('error', message, typeof context === 'string' ? context : undefined, rest);
  }

  private write(
    level: 'log' | 'debug' | 'warn' | 'error',
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    const prefix = context ? `[${this.tag}:${context}]` : `[${this.tag}]`;
    const payload = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    // eslint-disable-next-line no-console
    console[level === 'log' ? 'log' : level](`${prefix} ${message}${payload}`);
  }
}
