import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';
const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3100',
  'http://127.0.0.1:3100',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/**
 * Build the Content-Security-Policy header value.
 * When Swagger is enabled the policy is relaxed to allow the Swagger UI assets.
 */
function buildCsp(enableSwagger: boolean): string {
  if (enableSwagger) {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' https: data:",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "worker-src 'self' blob:",
    ].join('; ');
  }
  return "default-src 'self'";
}

/**
 * Security configuration - manual security headers
 * Single Responsibility: Configure security headers only
 *
 * Replaces the `helmet` package with explicit header assignments so
 * there is no external runtime dependency for security headers.
 */
export function configureSecurityHeaders(app: INestApplication, enableSwagger: boolean): void {
  const csp = buildCsp(enableSwagger);

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.removeHeader('X-Powered-By');
    next();
  });
}

/**
 * CORS configuration
 * Single Responsibility: Configure CORS only
 */
export function configureCors(app: INestApplication): void {
  const configuredOrigin = process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_ORIGIN;
  const allowedOrigins = new Set([configuredOrigin]);

  if (process.env.NODE_ENV !== 'production') {
    for (const origin of LOCAL_DEV_ORIGINS) {
      allowedOrigins.add(origin);
    }
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
}
