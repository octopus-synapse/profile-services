/**
 * Resume Creator Port
 *
 * Outbound port for creating resumes from parsed import data.
 * Implemented by infrastructure adapter that uses Prisma.
 */

import type { ParsedResumeData } from '../types/import.types';

export interface ResumeCreatorPort {
  create(userId: string, data: ParsedResumeData, importId: string): Promise<{ id: string }>;
}

export const RESUME_CREATOR = Symbol('ResumeCreatorPort');
