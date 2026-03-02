import { describe, expect, it } from 'bun:test';
import { DateRangeExtractor } from './date-range.extractor';

describe('DateRangeExtractor', () => {
  const extractor = new DateRangeExtractor();

  it('extracts closed date range with duration', () => {
    const result = extractor.extract([
      { role: 'START_DATE', value: '2020-01-01' },
      { role: 'END_DATE', value: '2021-01-01' },
    ]);

    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
    expect(result.isOpenEnded).toBe(false);
    expect((result.durationMonths ?? 0) >= 11).toBe(true);
  });

  it('normalizes present/current as open-ended', () => {
    const result = extractor.extract([
      { role: 'START_DATE', value: '2022-01-01' },
      { role: 'END_DATE', value: 'Present' },
    ]);

    expect(result.isOpenEnded).toBe(true);
    expect(result.endDate).toBeUndefined();
    expect((result.durationMonths ?? 0) >= 1).toBe(true);
  });
});
