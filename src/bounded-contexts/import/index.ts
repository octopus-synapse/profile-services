/**
 * Import Bounded Context - Public API
 *
 * ADR-001: Flat Hexagonal Architecture
 */

// NestJS Module
export { ImportModule } from './import.module';

// Domain Types (framework-agnostic)
export type {
  CreateImportJobParams,
  ImportJobData,
  ImportResult,
  ImportSource,
  ImportStatus,
  JsonResumeSchema,
  ParsedResumeData,
} from './domain/types/import.types';

// Domain Ports
export { IMPORT_JOB_REPOSITORY } from './domain/ports/import-job.repository.port';
export type { ImportJobRepositoryPort } from './domain/ports/import-job.repository.port';
export { RESUME_CREATOR } from './domain/ports/resume-creator.port';
export type { ResumeCreatorPort } from './domain/ports/resume-creator.port';

// Domain Services
export { JsonResumeParser } from './domain/services/json-resume-parser';

// Domain Exceptions
export {
  ImportCannotBeCancelledException,
  ImportCannotBeRetriedException,
  ImportNotFoundException,
  InvalidImportDataException,
} from './domain/exceptions/import.exceptions';
