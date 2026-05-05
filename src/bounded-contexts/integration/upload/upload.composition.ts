/**
 * Pure-TS wiring for the upload BC. Zero `@nestjs/*` imports.
 *
 * Three POJO use cases (profile image, company logo, delete) orchestrate
 * over the `FileStoragePort`. The S3-backed adapter wraps the
 * platform-wide `S3UploadService` so this BC owns the abstraction and
 * other contexts can swap storage backends without touching us.
 *
 * P0-005: `DeleteUploadUseCase` now also depends on `UploadOwnershipPort`
 * (Prisma-backed `Upload` table) for strict ownership enforcement.
 */

import type { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { UploadUseCases } from './application/ports/upload.port';
import { DeleteUploadUseCase } from './application/use-cases/delete-upload/delete-upload.use-case';
import { UploadCompanyLogoUseCase } from './application/use-cases/upload-company-logo/upload-company-logo.use-case';
import { UploadProfileImageUseCase } from './application/use-cases/upload-profile-image/upload-profile-image.use-case';
import { S3FileStorageAdapter } from './infrastructure/adapters/external-services/s3-file-storage.adapter';
import { PrismaUploadOwnershipRepository } from './infrastructure/adapters/persistence/prisma-upload-ownership.repository';
import { uploadRoutes } from './upload.routes';

export { UploadUseCases };

export function buildUploadUseCases(
  s3: S3UploadService,
  prisma: PrismaService,
  logger: LoggerPort,
): UploadUseCases {
  const storage = new S3FileStorageAdapter(s3);
  const ownership = new PrismaUploadOwnershipRepository(prisma);

  return {
    uploadProfileImage: new UploadProfileImageUseCase(storage, logger),
    uploadCompanyLogo: new UploadCompanyLogoUseCase(storage, logger),
    deleteUpload: new DeleteUploadUseCase(storage, ownership, logger),
  };
}

export function buildUploadComposition(
  s3: S3UploadService,
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<UploadUseCases> {
  return {
    useCases: buildUploadUseCases(s3, prisma, logger),
    routes: uploadRoutes,
  };
}
