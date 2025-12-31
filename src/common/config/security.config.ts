import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Security configuration - Helmet setup
 * Single Responsibility: Configure security headers only
 */
export function configureSecurityHeaders(
  app: INestApplication,
  enableSwagger: boolean,
): void {
  app.use(
    helmet({
      contentSecurityPolicy: enableSwagger
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                'https://cdn.jsdelivr.net',
              ],
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
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
}
