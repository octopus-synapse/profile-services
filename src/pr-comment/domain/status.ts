/**
 * Status Domain Module
 *
 * Pure functions for status visualization (colors, labels, formatting).
 * No side effects, no external dependencies.
 */

import type { CardColors, CheckStatus } from './types';
import { DEFAULT_COLORS } from './types';

// =============================================================================
// Status Colors
// =============================================================================

export function getStatusColor(status: CheckStatus, colors: CardColors = DEFAULT_COLORS): string {
  switch (status) {
    case 'success':
      return colors.success;
    case 'fail':
      return colors.fail;
    case 'running':
      return colors.warning;
    case 'skip':
      return colors.warning;
    default:
      return colors.pending;
  }
}

export function getFailColor(count: number | null, colors: CardColors = DEFAULT_COLORS): string {
  if (count === null || count === 0) {
    return colors.muted;
  }
  return colors.fail;
}

export function getSkipColor(count: number | null, colors: CardColors = DEFAULT_COLORS): string {
  if (count === null || count === 0) {
    return colors.muted;
  }
  return colors.warning;
}

export function getPassRateColor(passRate: number, colors: CardColors = DEFAULT_COLORS): string {
  if (passRate >= 95) {
    return colors.success;
  }
  if (passRate >= 80) {
    return colors.warning;
  }
  return colors.fail;
}

export function getAccentColor(status: CheckStatus, colors: CardColors = DEFAULT_COLORS): string {
  switch (status) {
    case 'success':
      return colors.success;
    case 'fail':
      return colors.fail;
    default:
      return colors.warning;
  }
}

// =============================================================================
// Status Labels
// =============================================================================

export function getStatusLabel(status: CheckStatus): string {
  switch (status) {
    case 'success':
      return 'PASS';
    case 'fail':
      return 'FAIL';
    case 'running':
      return 'RUN';
    case 'skip':
      return 'SKIP';
    default:
      return 'WAIT';
  }
}

export function getTextColor(status: CheckStatus, colors: CardColors = DEFAULT_COLORS): string {
  if (status === 'pending') {
    return colors.text_muted;
  }
  return colors.text;
}

// =============================================================================
// Time Formatting
// =============================================================================

export function formatDuration(ms: number): string {
  if (ms === 0) {
    return '—';
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  const decimal = Math.floor((ms % 1000) / 100);
  return `${seconds}.${decimal}s`;
}

export function formatTimeDisplay(status: CheckStatus, duration_ms: number): string {
  if (status === 'pending') {
    return '—';
  }
  if (status === 'running') {
    return '...';
  }
  return formatDuration(duration_ms);
}

export function getTimeColor(status: CheckStatus, colors: CardColors = DEFAULT_COLORS): string {
  if (status === 'pending') {
    return colors.pending;
  }
  if (status === 'running') {
    return colors.warning;
  }
  return '#a8a29e'; // Neutral time color
}

// =============================================================================
// Number Formatting
// =============================================================================

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatNullableNumber(num: number | null): string {
  if (num === null) {
    return '—';
  }
  return formatNumber(num);
}

export function formatPercentage(rate: number): string {
  if (rate === 0) {
    return '—';
  }
  return `${rate}%`;
}

// =============================================================================
// Text Truncation
// =============================================================================

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// =============================================================================
// Commit Message Processing
// =============================================================================

export function formatCommitMessage(message: string, maxLength: number = 45): string {
  // Take only the first line (title)
  const title = message.split('\n')[0];
  // Truncate and escape
  return escapeXml(truncateText(title, maxLength));
}

export function formatCommitAuthor(author: string, maxLength: number = 20): string {
  return truncateText(author, maxLength);
}

export function formatCoAuthors(coAuthors: string[]): string {
  if (coAuthors.length === 0) {
    return '';
  }
  const names = coAuthors.slice(0, 2).join(', ');
  return `Co-authored-by: ${names}`;
}
