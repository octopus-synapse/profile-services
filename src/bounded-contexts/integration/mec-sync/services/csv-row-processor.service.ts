/**
 * CSV Row Processor Service
 * Handles row-by-row processing of MEC CSV data
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import {
  NormalizedCourse,
  NormalizedInstitution,
  SyncError,
} from '../interfaces/mec-data.interface';
import { parseCsvLine } from '../parsers/csv-line.parser';
import { normalizeCourse, normalizeInstitution } from '../parsers/entity.normalizer';
import { mapToMecRow } from '../parsers/mec-row.mapper';

export interface RowProcessingResult {
  institutions: Map<number, NormalizedInstitution>;
  courses: NormalizedCourse[];
  errors: SyncError[];
}

@Injectable()
export class CsvRowProcessorService {
  private readonly context = 'CsvRowProcessor';

  constructor(private readonly logger: AppLoggerService) {}

  processDataRows(lines: string[], columnMap: Map<string, number>): RowProcessingResult {
    const institutions = new Map<number, NormalizedInstitution>();
    const courses: NormalizedCourse[] = [];
    const errors: SyncError[] = [];

    for (let i = 1; i < lines.length; i++) {
      this.processRow(lines[i], i, columnMap, institutions, courses, errors);
    }

    this.logParseResult(institutions.size, courses.length, errors.length);

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
      this.recordError(errors, rowIndex, error);
    }
  }

  private recordError(errors: SyncError[], rowIndex: number, error: unknown): void {
    errors.push({
      row: rowIndex + 1,
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    if (errors.length % 1000 === 0) {
      this.logger.warn(`${errors.length} parse errors so far...`, this.context);
    }
  }

  private logParseResult(institutionCount: number, courseCount: number, errorCount: number): void {
    this.logger.log(
      `Parsed: ${institutionCount} institutions, ${courseCount} courses, ${errorCount} errors`,
      this.context,
    );
  }
}
