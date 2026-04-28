/**
 * Stub `LoggerPort` impl writing to stdout/stderr. Production swap
 * day uses pino; for the POC this is enough.
 */

import { LoggerPort } from '@/shared-kernel/logger/logger.port';

export class ConsoleLoggerAdapter extends LoggerPort {
  log(message: string, context?: string): void {
    process.stdout.write(`[${context ?? 'app'}] ${message}\n`);
  }
  debug(message: string, context?: string): void {
    process.stdout.write(`[${context ?? 'app'}] DEBUG ${message}\n`);
  }
  warn(message: string, context?: string): void {
    process.stdout.write(`[${context ?? 'app'}] WARN ${message}\n`);
  }
  error(message: string, trace?: string, context?: string): void {
    process.stderr.write(`[${context ?? 'app'}] ERROR ${message}\n`);
    if (trace) process.stderr.write(`${trace}\n`);
  }
}
