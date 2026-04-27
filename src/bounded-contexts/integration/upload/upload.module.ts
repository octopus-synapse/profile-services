/**
 * Upload Module
 *
 * ADR-001: three POJO use cases (profile image, company logo, delete)
 * orchestrate over the `FileStoragePort`. The S3-backed adapter wraps
 * the platform-wide `S3UploadService` so this BC owns the abstraction
 * and other contexts can swap storage backends without touching us.
 *
 * HTTP surface comes from `upload.routes.ts` — synthesized at boot.
 */

import { Module } from '@nestjs/common';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { UploadUseCases } from './application/ports/upload.port';
import { DeleteUploadUseCase } from './application/use-cases/delete-upload/delete-upload.use-case';
import { UploadCompanyLogoUseCase } from './application/use-cases/upload-company-logo/upload-company-logo.use-case';
import { UploadProfileImageUseCase } from './application/use-cases/upload-profile-image/upload-profile-image.use-case';
import { FileStoragePort } from './domain/ports/file-storage.port';
import { S3FileStorageAdapter } from './infrastructure/adapters/external-services/s3-file-storage.adapter';
import { uploadRoutes } from './upload.routes';

@Module({
  controllers: [...synthesizeRouteControllers(UploadUseCases, uploadRoutes)],
  providers: [
    S3UploadService,
    {
      provide: FileStoragePort,
      useFactory: (s3: S3UploadService) => new S3FileStorageAdapter(s3),
      inject: [S3UploadService],
    },
    {
      provide: UploadProfileImageUseCase,
      useFactory: (storage: FileStoragePort, logger: LoggerPort) =>
        new UploadProfileImageUseCase(storage, logger),
      inject: [FileStoragePort, LoggerPort],
    },
    {
      provide: UploadCompanyLogoUseCase,
      useFactory: (storage: FileStoragePort, logger: LoggerPort) =>
        new UploadCompanyLogoUseCase(storage, logger),
      inject: [FileStoragePort, LoggerPort],
    },
    {
      provide: DeleteUploadUseCase,
      useFactory: (storage: FileStoragePort, logger: LoggerPort) =>
        new DeleteUploadUseCase(storage, logger),
      inject: [FileStoragePort, LoggerPort],
    },
    {
      provide: UploadUseCases,
      useFactory: (
        uploadProfileImage: UploadProfileImageUseCase,
        uploadCompanyLogo: UploadCompanyLogoUseCase,
        deleteUpload: DeleteUploadUseCase,
      ): UploadUseCases => ({ uploadProfileImage, uploadCompanyLogo, deleteUpload }),
      inject: [UploadProfileImageUseCase, UploadCompanyLogoUseCase, DeleteUploadUseCase],
    },
  ],
  exports: [S3UploadService, FileStoragePort],
})
export class UploadModule {}
