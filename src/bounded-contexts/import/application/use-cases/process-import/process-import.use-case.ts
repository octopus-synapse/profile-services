import { Inject, Injectable } from '@nestjs/common';
import { ImportNotFoundException } from '../../../domain/exceptions/import.exceptions';
import {
  IMPORT_JOB_REPOSITORY,
  type ImportJobRepositoryPort,
} from '../../../domain/ports/import-job.repository.port';
import { RESUME_CREATOR, type ResumeCreatorPort } from '../../../domain/ports/resume-creator.port';
import { JsonResumeParser } from '../../../domain/services/json-resume-parser';
import type { ImportResult } from '../../../domain/types/import.types';

@Injectable()
export class ProcessImportUseCase {
  private readonly parser = new JsonResumeParser();

  constructor(
    @Inject(IMPORT_JOB_REPOSITORY)
    private readonly repository: ImportJobRepositoryPort,
    @Inject(RESUME_CREATOR)
    private readonly resumeCreator: ResumeCreatorPort,
  ) {}

  async execute(importId: string): Promise<ImportResult> {
    const importJob = await this.repository.findById(importId);
    if (!importJob) {
      throw new ImportNotFoundException(importId);
    }

    try {
      await this.repository.updateStatus(importId, 'PROCESSING');

      if (!importJob.rawData) {
        await this.repository.updateStatus(importId, 'FAILED', 'No data to import');
        return { importId, status: 'FAILED', errors: ['No data to import'] };
      }

      await this.repository.updateStatus(importId, 'MAPPING');
      if (!this.parser.isJsonResumeSchema(importJob.rawData)) {
        await this.repository.updateStatus(importId, 'FAILED', 'Invalid JSON Resume format');
        return { importId, status: 'FAILED', errors: ['Invalid JSON Resume format'] };
      }

      const parsedData = this.parser.parse(importJob.rawData);

      await this.repository.updateStatus(importId, 'VALIDATING');
      const validationErrors = this.parser.validate(parsedData);
      if (validationErrors.length > 0) {
        await this.repository.updateStatus(importId, 'FAILED', validationErrors.join('; '));
        return { importId, status: 'FAILED', errors: validationErrors };
      }

      await this.repository.updateStatus(importId, 'IMPORTING');
      const resume = await this.resumeCreator.create(importJob.userId, parsedData, importId);

      await this.repository.updateStatus(importId, 'COMPLETED', null, resume.id);

      return { importId, status: 'COMPLETED', resumeId: resume.id };
    } catch (error) {
      if (error instanceof ImportNotFoundException) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.repository.updateStatus(importId, 'FAILED', errorMessage);
      return { importId, status: 'FAILED', errors: [errorMessage] };
    }
  }
}
