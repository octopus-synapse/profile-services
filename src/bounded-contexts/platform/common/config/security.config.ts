import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';
const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3100',
  'http://127.0.0.1:3100',
];

/**
 * Security configuration - Helmet setup
 * Single Responsibility: Configure security headers only
 */
export function configureSecurityHeaders(app: INestApplication, enableSwagger: boolean): void {
  app.use(
    helmet({
      contentSecurityPolicy: enableSwagger
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
              fontSrc: ["'self'", 'https:', 'data:'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'https:'],
              workerSrc: ["'self'", 'blob:'],
            },
          }
        : undefined,
    }),
  );
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
