import { describe, expect, it } from 'bun:test';
import {
  formatCommitAuthor,
  formatCommitMessage,
  formatDuration,
  getPassRateColor,
  getStatusColor,
  getStatusLabel,
} from '../../../src/pr-comment/domain/status';
import { DEFAULT_COLORS } from '../../../src/pr-comment/domain/types';

describe('status', () => {
  describe('getStatusColor', () => {
    it('returns success color for success status', () => {
      expect(getStatusColor('success', DEFAULT_COLORS)).toBe(DEFAULT_COLORS.success);
    });

    it('returns fail color for fail status', () => {
      expect(getStatusColor('fail', DEFAULT_COLORS)).toBe(DEFAULT_COLORS.fail);
    });

    it('returns warning color for running status', () => {
      expect(getStatusColor('running', DEFAULT_COLORS)).toBe(DEFAULT_COLORS.warning);
    });

    it('returns warning color for skip status', () => {
      expect(getStatusColor('skip', DEFAULT_COLORS)).toBe(DEFAULT_COLORS.warning);
    });

    it('returns pending color for pending status', () => {
      expect(getStatusColor('pending', DEFAULT_COLORS)).toBe(DEFAULT_COLORS.pending);
    });
  });

  describe('getStatusLabel', () => {
    it('returns PASS for success', () => {
      expect(getStatusLabel('success')).toBe('PASS');
    });

    it('returns FAIL for fail', () => {
      expect(getStatusLabel('fail')).toBe('FAIL');
    });

    it('returns RUN for running', () => {
      expect(getStatusLabel('running')).toBe('RUN');
    });

    it('returns WAIT for pending', () => {
      expect(getStatusLabel('pending')).toBe('WAIT');
    });

    it('returns SKIP for skip', () => {
      expect(getStatusLabel('skip')).toBe('SKIP');
    });
  });

  describe('getPassRateColor', () => {
    it('returns success color for 100%', () => {
      expect(getPassRateColor(100, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.success);
    });

    it('returns success color for >= 95%', () => {
      expect(getPassRateColor(95, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.success);
      expect(getPassRateColor(99, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.success);
    });

    it('returns warning color for 80-94%', () => {
      expect(getPassRateColor(80, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.warning);
      expect(getPassRateColor(90, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.warning);
      expect(getPassRateColor(94, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.warning);
    });

    it('returns fail color for < 80%', () => {
      expect(getPassRateColor(79, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.fail);
      expect(getPassRateColor(50, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.fail);
      expect(getPassRateColor(0, DEFAULT_COLORS)).toBe(DEFAULT_COLORS.fail);
    });
  });

  describe('formatDuration', () => {
    it('formats milliseconds to seconds with decimal', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(500)).toBe('0.5s');
    });

    it('formats to minutes:seconds for >= 60 seconds', () => {
      expect(formatDuration(60000)).toBe('1:00');
      expect(formatDuration(90000)).toBe('1:30');
      expect(formatDuration(120000)).toBe('2:00');
    });

    it('returns dash for zero', () => {
      expect(formatDuration(0)).toBe('—');
    });

    it('handles large durations', () => {
      expect(formatDuration(300000)).toBe('5:00');
      expect(formatDuration(600000)).toBe('10:00');
    });
  });

  describe('formatCommitMessage', () => {
    it('returns message as-is if under max length', () => {
      const msg = 'feat: add feature';
      expect(formatCommitMessage(msg, 45)).toBe('feat: add feature');
    });

    it('truncates message with ellipsis if over max length', () => {
      const msg = 'feat(ci): this is a very long commit message that exceeds the limit';
      const result = formatCommitMessage(msg, 45);

      expect(result.length).toBeLessThanOrEqual(45);
      expect(result.endsWith('...')).toBe(true);
    });

    it('uses only first line (title) of multi-line commit', () => {
      const msg = 'feat: title\n\nThis is the body\nWith multiple lines';
      expect(formatCommitMessage(msg, 45)).toBe('feat: title');
    });

    it('escapes XML special characters', () => {
      const msg = 'fix: handle <script> & "quotes"';
      const result = formatCommitMessage(msg, 100);

      expect(result).toContain('&lt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('uses default max length of 45', () => {
      const msg = 'a'.repeat(50);
      const result = formatCommitMessage(msg);

      expect(result.length).toBeLessThanOrEqual(45);
    });
  });

  describe('formatCommitAuthor', () => {
    it('returns author name as-is if under max length', () => {
      expect(formatCommitAuthor('John Doe', 20)).toBe('John Doe');
    });

    it('truncates long author names', () => {
      const author = 'Someone With A Very Long Name Indeed';
      const result = formatCommitAuthor(author, 20);

      expect(result.length).toBeLessThanOrEqual(20);
      expect(result.endsWith('...')).toBe(true);
    });

    it('does not escape XML (only truncates)', () => {
      const author = 'John & Jane';
      const result = formatCommitAuthor(author, 50);

      // formatCommitAuthor only truncates, does not escape
      expect(result).toBe('John & Jane');
    });
  });
});
