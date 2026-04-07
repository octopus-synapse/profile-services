/**
 * Stub Resume Creator
 *
 * Test double for ResumeCreatorPort.
 */

import type { ResumeCreatorPort } from '../domain/ports/resume-creator.port';
import type { ParsedResumeData } from '../domain/types/import.types';

export class StubResumeCreator implements ResumeCreatorPort {
  private createdResumes: Array<{
    id: string;
    userId: string;
    data: ParsedResumeData;
    importId: string;
  }> = [];
  private idCounter = 1;

  async create(
    userId: string,
    data: ParsedResumeData,
    importId: string,
  ): Promise<{ id: string }> {
    const id = `resume-${this.idCounter++}`;
    this.createdResumes.push({ id, userId, data, importId });
    return { id };
  }

  // Test helpers
  getCreated(): typeof this.createdResumes {
    return this.createdResumes;
  }

  getLastCreated() {
    return this.createdResumes[this.createdResumes.length - 1] ?? null;
  }

  clear(): void {
    this.createdResumes = [];
    this.idCounter = 1;
  }
}
