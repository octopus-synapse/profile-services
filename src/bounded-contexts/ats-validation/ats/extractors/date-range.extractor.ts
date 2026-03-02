import { Injectable } from '@nestjs/common';
import type { SemanticFieldValue } from '@/shared-kernel/dtos/semantic-sections.dto';

export interface DateRangeExtraction {
  startDate?: Date;
  endDate?: Date;
  isOpenEnded: boolean;
  durationMonths?: number;
}

@Injectable()
export class DateRangeExtractor {
  extract(values: SemanticFieldValue[]): DateRangeExtraction {
    const startDate = this.parseDate(this.findValue(values, 'START_DATE'));
    const endRaw = this.findValue(values, 'END_DATE');

    const isOpenEnded = this.isPresentFlag(endRaw);
    const endDate = isOpenEnded ? undefined : this.parseDate(endRaw);

    const durationMonths = this.calculateDurationMonths(startDate, endDate, isOpenEnded);

    return {
      startDate,
      endDate,
      isOpenEnded,
      durationMonths,
    };
  }

  private findValue(values: SemanticFieldValue[], role: SemanticFieldValue['role']): unknown {
    return values.find((entry) => entry.role === role)?.value;
  }

  private parseDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return undefined;
  }

  private isPresentFlag(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const normalized = value.trim().toLowerCase();
    return ['present', 'current', 'atual', 'ongoing'].includes(normalized);
  }

  private calculateDurationMonths(
    startDate?: Date,
    endDate?: Date,
    isOpenEnded?: boolean,
  ): number | undefined {
    if (!startDate) {
      return undefined;
    }

    const end = endDate ?? (isOpenEnded ? new Date() : undefined);
    if (!end) {
      return undefined;
    }

    const months =
      (end.getFullYear() - startDate.getFullYear()) * 12 + (end.getMonth() - startDate.getMonth());

    return months >= 0 ? months : undefined;
  }
}
