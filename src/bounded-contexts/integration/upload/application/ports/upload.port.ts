/**
 * Bundle token for the upload BC. Doubles as the TypeScript shape of
 * the use-case bag and the Nest DI token. Composition lives in
 * `upload.module.ts` (`useFactory`).
 */

import type { DeleteUploadUseCase } from '../use-cases/delete-upload/delete-upload.use-case';
import type { UploadCompanyLogoUseCase } from '../use-cases/upload-company-logo/upload-company-logo.use-case';
import type { UploadProfileImageUseCase } from '../use-cases/upload-profile-image/upload-profile-image.use-case';

export abstract class UploadUseCases {
  abstract readonly uploadProfileImage: UploadProfileImageUseCase;
  abstract readonly uploadCompanyLogo: UploadCompanyLogoUseCase;
  abstract readonly deleteUpload: DeleteUploadUseCase;
}
