/**
 * Pure-TS factory for the leaf platform `S3UploadService`. Zero
 * `@nestjs/*` imports — both the Nest module shell and the Elysia
 * bootstrap call this builder.
 *
 * This is a SERVICE composition, not a full BC composition: there are
 * no routes/use-cases to ship, only the constructed POJO. Callers that
 * still expect a Nest provider get it via `S3UploadModule`'s
 * `useFactory` wrapper.
 */

import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import { S3UploadService } from './s3-upload.service';

export { S3UploadService };

export function buildS3UploadService(config: ConfigPort, logger: LoggerPort): S3UploadService {
  return new S3UploadService(config, logger);
}
