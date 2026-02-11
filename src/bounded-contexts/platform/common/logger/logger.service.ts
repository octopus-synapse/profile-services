import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
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
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, { context, stack: trace, ...meta });
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.verbose(message, { context: context ?? this.context, ...meta });
  }

  setContext(context: string): void {
    this.context = context;
  }

  errorWithMeta(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, { context: this.context, ...meta });
  }
}
