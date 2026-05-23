import type { Request } from 'express';

export interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  geo?: string;
  [key: string]: string | undefined;
}

export interface RequestMetadataSource {
  ip?: string;
  headers?: Request['headers'];
  method?: string;
  originalUrl?: string;
  path?: string;
  socket?: { remoteAddress?: string };
}
