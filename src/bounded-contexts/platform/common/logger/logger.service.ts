import * as winston from 'winston';
import { z } from 'zod';
import { LoggerPort } from '@/shared-kernel/logger/logger.port';

const LogLevelSchema = z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']);
const SENSITIVE_META_KEY_PATTERN =
  /(^|_)(authorization|cookie|email|password|secret|token|jwt|credential)$/iu;
const ENTITY_ID_META_KEY_PATTERN =
  /^(userId|resumeId|jobId|sessionId|applicationId|snapshotId|socketId|accountId)$/u;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const ENTITY_ID_IN_MESSAGE_PATTERN =
  /\b(user|resume|job|session|application|snapshot|socket|account)(?:Id| id)?[=:\s]+([A-Za-z0-9_-]{6,})/giu;

/**
 * Winston-backed `LoggerPort` implementation.
 *
 * @internal Wire this only at the composition root. Application code
 * should depend on `LoggerPort` (Q20 in the duplication audit).
 */
export class AppLoggerService extends LoggerPort {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    super();
    const isProduction = process.env.NODE_ENV === 'production';
    const defaultLevel = isProduction ? 'info' : 'debug';
    const parsedLevel = LogLevelSchema.safeParse(process.env.LOG_LEVEL);
    const level = parsedLevel.success ? parsedLevel.data : defaultLevel;
    if (process.env.LOG_LEVEL && !parsedLevel.success) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AppLoggerService] LOG_LEVEL="${process.env.LOG_LEVEL}" invalid, falling back to "${defaultLevel}"`,
      );
    }

    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf((info) => {
                const { timestamp, level, message, context, stack, ...meta } = info;
                const ctx = typeof context === 'string' ? context : 'Application';
                let log = `${String(timestamp)} [${ctx}] ${String(level)}: ${String(message)}`;
                if (Object.keys(meta).length > 0) {
                  log += ` ${JSON.stringify(meta)}`;
                }
                if (stack) {
                  let stk: string;
                  if (typeof stack === 'string') {
                    stk = stack;
                  } else if (stack instanceof Error) {
                    stk = stack.stack ?? stack.message;
                  } else {
                    stk = JSON.stringify(stack);
                  }
                  log += `\n${stk}`;
                }
                return log;
              }),
            ),
      ),
      transports: [
        new winston.transports.Console(),
        ...(isProduction
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 5242880,
                maxFiles: 5,
              }),
            ]
          : []),
      ],
    });
  }

  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.info(sanitizeLogMessage(message), { context, ...sanitizeLogMeta(meta) });
  }

  error(message: string, options: Record<string, unknown> = {}): void {
    const { context, stack, ...rest } = options;
    this.logger.error(sanitizeLogMessage(message), { context, stack, ...sanitizeLogMeta(rest) });
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.warn(sanitizeLogMessage(message), { context, ...sanitizeLogMeta(meta) });
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.debug(sanitizeLogMessage(message), { context, ...sanitizeLogMeta(meta) });
  }

  verbose(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.verbose(sanitizeLogMessage(message), {
      context: context ?? this.context,
      ...sanitizeLogMeta(meta),
    });
  }

  setContext(context: string): void {
    this.context = context;
  }

  errorWithMeta(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(sanitizeLogMessage(message), {
      context: this.context,
      ...sanitizeLogMeta(meta),
    });
  }
}

function sanitizeLogMessage(message: string): string {
  return message
    .replace(EMAIL_PATTERN, '[email_redacted]')
    .replace(ENTITY_ID_IN_MESSAGE_PATTERN, (_match, entity: string) => `${entity}=[id_redacted]`);
}

function sanitizeLogMeta(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    sanitized[key] = sanitizeLogValue(key, value, 0);
  }
  return sanitized;
}

function sanitizeLogValue(key: string, value: unknown, depth: number): unknown {
  if (SENSITIVE_META_KEY_PATTERN.test(key) || ENTITY_ID_META_KEY_PATTERN.test(key)) {
    return '[redacted]';
  }
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeLogMessage(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return { count: value.length };
  if (typeof value !== 'object' || depth >= 2) return '[object]';
  const sanitized: Record<string, unknown> = {};
  for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    sanitized[nestedKey] = sanitizeLogValue(nestedKey, nestedValue, depth + 1);
  }
  return sanitized;
}
