import type { Prisma } from '@prisma/client';
import type { RequestMetadataSource } from './audit-log.types';

/** Extract metadata from Express request for audit log entries. */
export function extractAuditMetadata(request?: RequestMetadataSource): {
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
} {
  if (!request) return {};

  const headers = request.headers ?? {};
  const forwardedForValue = headers['x-forwarded-for'];
  const forwardedFor = Array.isArray(forwardedForValue) ? forwardedForValue[0] : forwardedForValue;
  const userAgentValue = headers['user-agent'];
  const userAgent = Array.isArray(userAgentValue) ? userAgentValue[0] : userAgentValue;
  const refererValue = headers.referer;
  const referer = Array.isArray(refererValue) ? refererValue[0] : refererValue;

  const ipAddress =
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ??
    request.ip ??
    request.socket?.remoteAddress;

  return {
    ipAddress,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    metadata: {
      referer: typeof referer === 'string' ? referer : undefined,
      method: request.method,
      path: request.path,
    },
  };
}
