/**
 * CSV Row Processor — drives row-by-row parsing for the MEC CSV.
 *
 * Each row is mapped into a `MecCsvRow`, normalized into an institution
 * + course (either may be null when key fields are missing), and any
 * thrown error is captured into a `SyncError` so the orchestrator can
 * surface them without aborting the whole run.
 */

import { LoggerPort } from '@/shared-kernel';
import type {
  NormalizedCourse,
  NormalizedInstitution,
  SyncError,
} from '../../domain/entities/mec-row';
import { parseCsvLine } from '../parsers/csv-line.parser';
import { normalizeCourse, normalizeInstitution } from '../parsers/entity.normalizer';
import { mapToMecRow } from '../parsers/mec-row.mapper';

export interface RowProcessingResult {
  institutions: Map<number, NormalizedInstitution>;
  courses: NormalizedCourse[];
  errors: SyncError[];
}

export class CsvRowProcessorService {
  private readonly context = 'CsvRowProcessor';

  constructor(private readonly logger: LoggerPort) {}

  processDataRows(lines: string[], columnMap: Map<string, number>): RowProcessingResult {
    const institutions = new Map<number, NormalizedInstitution>();
    const courses: NormalizedCourse[] = [];
    const errors: SyncError[] = [];

    for (let i = 1; i < lines.length; i++) {
      this.processRow(lines[i], i, columnMap, institutions, courses, errors);
    }

    this.logger.log(
      `Parsed: ${institutions.size} institutions, ${courses.length} courses, ${errors.length} errors`,
      this.context,
    );

    return { institutions, courses, errors };
  }

  private processRow(
    line: string,
    rowIndex: number,
    columnMap: Map<string, number>,
    institutions: Map<number, NormalizedInstitution>,
    courses: NormalizedCourse[],
    errors: SyncError[],
  ): void {
    try {
      const values = parseCsvLine(line);
      const row = mapToMecRow(values, columnMap);

      const institution = normalizeInstitution(row);
      if (institution && !institutions.has(institution.codigoIes)) {
        institutions.set(institution.codigoIes, institution);
      }

      const course = normalizeCourse(row);
      if (course) {
        courses.push(course);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ row: rowIndex + 1, message });
      this.logger.debug(`Row ${rowIndex + 1} parse failed: ${message}`, this.context);
      if (errors.length % 1000 === 0) {
        this.logger.warn(`${errors.length} parse errors so far...`, this.context);
      }
    }
  }
}
