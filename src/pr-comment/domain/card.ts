/**
 * Card Domain Module
 *
 * Pure functions for generating the CI Pipeline SVG card.
 * No side effects, no external dependencies.
 */

import {
  escapeXml,
  formatCoAuthors,
  formatCommitAuthor,
  formatCommitMessage,
  formatDuration,
  formatNullableNumber,
  formatNumber,
  formatPercentage,
  formatTimeDisplay,
  getAccentColor,
  getFailColor,
  getPassRateColor,
  getStatusColor,
  getStatusLabel,
  getTextColor,
  getTimeColor,
} from './status';
import type { CardColors, CardData, CIJobResult, PrecommitCheckResult } from './types';
import { DEFAULT_COLORS } from './types';

// =============================================================================
// SVG Constants
// =============================================================================

const SVG_WIDTH = 820;
const SVG_HEIGHT = 560;
const FONT_FAMILY = 'Inter, system-ui, sans-serif';
const MONO_FONT = 'JetBrains Mono, monospace';

// =============================================================================
// SVG Helpers
// =============================================================================

function svgText(
  x: number,
  y: number,
  text: string,
  opts: {
    fill?: string;
    size?: number;
    weight?: number;
    anchor?: 'start' | 'middle' | 'end';
    font?: string;
  } = {},
): string {
  const fill = opts.fill ?? '#e7e5e4';
  const size = opts.size ?? 13;
  const weight = opts.weight ? ` font-weight="${opts.weight}"` : '';
  const anchor = opts.anchor ? ` text-anchor="${opts.anchor}"` : '';
  const font = opts.font ?? FONT_FAMILY;
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${font}" font-size="${size}"${weight}${anchor}>${text}</text>`;
}

function svgRect(
  x: number,
  y: number,
  width: number,
  height: number,
  opts: { fill?: string; rx?: number; stroke?: string } = {},
): string {
  const fill = opts.fill ?? '#292524';
  const rx = opts.rx ?? 0;
  const stroke = opts.stroke ? ` stroke="${opts.stroke}" stroke-width="1"` : '';
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}"${stroke}/>`;
}

function svgCircle(cx: number, cy: number, r: number, fill: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
}

function svgLine(x1: number, y1: number, x2: number, y2: number, stroke: string): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1"/>`;
}

// =============================================================================
// Card Sections
// =============================================================================

function renderHeader(data: CardData, colors: CardColors): string {
  const { git, metrics } = data;
  const accentColor = getAccentColor(metrics.overall.status, colors);

  return `
  <!-- Background -->
  ${svgRect(0, 0, SVG_WIDTH, SVG_HEIGHT, { fill: colors.background, rx: 12 })}
  ${svgRect(0, 0, SVG_WIDTH, SVG_HEIGHT, { fill: 'none', rx: 12, stroke: colors.card })}

  <!-- Accent line -->
  ${svgRect(32, 0, 80, 3, { fill: accentColor, rx: 1.5 })}

  <!-- Header -->
  ${svgText(32, 38, 'CI PIPELINE', { fill: '#fafaf9', size: 20, weight: 700 })}

  <!-- Commit info -->
  ${svgText(410, 28, formatCommitMessage(git.commit_message), { fill: '#e7e5e4', size: 13, weight: 500, anchor: 'middle' })}
  ${svgText(410, 46, `${git.commit_hash} · ${formatCommitAuthor(git.commit_author)}`, { fill: '#78716c', size: 10, anchor: 'middle' })}
  ${svgText(410, 60, formatCoAuthors(git.co_authors), { fill: '#57534e', size: 9, anchor: 'middle' })}

  <!-- Branch -->
  ${svgText(788, 38, escapeXml(git.branch), { fill: '#78716c', size: 11, anchor: 'end' })}`;
}

function renderPrecommitRow(check: PrecommitCheckResult, y: number, colors: CardColors): string {
  const statusColor = getStatusColor(check.status, colors);
  const failColor = getFailColor(check.failed, colors);
  const timeDisplay = formatTimeDisplay(check.status, check.duration_ms);
  const timeColor = getTimeColor(check.status, colors);

  const name = check.name.charAt(0).toUpperCase() + check.name.slice(1);

  return `
  ${svgCircle(60, y, 5, statusColor)}
  ${svgText(78, y + 5, name, { fill: '#e7e5e4' })}
  ${svgText(175, y + 5, formatNullableNumber(check.suites), { fill: '#a8a29e', anchor: 'middle' })}
  ${svgText(235, y + 5, formatNullableNumber(check.total), { fill: check.total ? '#fafaf9' : '#44403c', weight: check.total ? 600 : undefined, anchor: 'middle' })}
  ${svgText(290, y + 5, formatNullableNumber(check.passed), { fill: check.passed ? '#22c55e' : '#44403c', anchor: 'middle' })}
  ${svgText(340, y + 5, formatNullableNumber(check.failed), { fill: failColor, anchor: 'middle' })}
  ${svgText(385, y + 5, timeDisplay, { fill: timeColor, anchor: 'end' })}`;
}

function renderPrecommitSection(data: CardData, colors: CardColors): string {
  const { precommit } = data.metrics;
  const totalDuration = formatDuration(precommit.duration_ms);

  const rows = precommit.checks.map((check, i) => {
    const y = 172 + i * 40;
    return renderPrecommitRow(check, y, colors);
  });

  const totalFailColor = getFailColor(precommit.totals.failed, colors);

  return `
  <!-- PRE-COMMIT Header -->
  ${svgText(32, 95, 'PRE-COMMIT', { fill: '#fafaf9', size: 14, weight: 600 })}
  ${svgText(390, 95, totalDuration, { fill: '#a8a29e', size: 12, anchor: 'end' })}

  <!-- PRE-COMMIT Table -->
  ${svgRect(32, 105, 370, 380, { rx: 8 })}

  <!-- Table Header -->
  ${svgText(50, 133, 'CHECK', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgText(160, 133, 'SUITES', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgText(220, 133, 'TOTAL', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgText(280, 133, 'PASS', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgText(330, 133, 'FAIL', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgText(375, 133, 'TIME', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgLine(50, 145, 390, 145, '#44403c')}

  <!-- Rows -->
  ${rows.join('')}

  <!-- Total -->
  ${svgLine(50, 400, 390, 400, '#44403c')}
  ${svgText(50, 428, 'TOTAL', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgText(175, 428, formatNumber(precommit.totals.suites), { fill: '#a8a29e', anchor: 'middle' })}
  ${svgText(235, 428, formatNumber(precommit.totals.total), { fill: '#fafaf9', weight: 600, anchor: 'middle' })}
  ${svgText(290, 428, formatNumber(precommit.totals.passed), { fill: '#22c55e', anchor: 'middle' })}
  ${svgText(340, 428, formatNumber(precommit.totals.failed), { fill: totalFailColor, anchor: 'middle' })}
  ${svgText(385, 428, totalDuration, { fill: '#a8a29e', anchor: 'end' })}

  <!-- Attestation -->
  ${svgRect(50, 448, 340, 28, { fill: colors.background, rx: 4 })}
  ${svgText(62, 466, 'ATTESTATION', { fill: '#57534e', size: 9, weight: 500 })}
  ${svgText(140, 466, precommit.attestation_hash, { fill: '#78716c', size: 9, font: MONO_FONT })}`;
}

function renderCIRow(job: CIJobResult, y: number, colors: CardColors): string {
  const statusColor = getStatusColor(job.status, colors);
  const textColor = getTextColor(job.status, colors);
  const failColor = getFailColor(job.failed, colors);
  const timeDisplay = formatTimeDisplay(job.status, job.duration_ms);
  const timeColor = getTimeColor(job.status, colors);

  const name = job.name.charAt(0).toUpperCase() + job.name.slice(1);
  const isPending = job.status === 'pending' || job.status === 'running';

  return `
  ${svgCircle(448, y, 5, statusColor)}
  ${svgText(466, y + 5, name, { fill: textColor })}
  ${svgText(555, y + 5, isPending ? '—' : formatNullableNumber(job.suites), { fill: isPending ? '#44403c' : '#a8a29e', anchor: 'middle' })}
  ${svgText(615, y + 5, isPending ? '—' : formatNullableNumber(job.total), { fill: isPending ? '#44403c' : '#fafaf9', weight: job.total && !isPending ? 600 : undefined, anchor: 'middle' })}
  ${svgText(670, y + 5, isPending ? '—' : formatNullableNumber(job.passed), { fill: isPending ? '#44403c' : '#22c55e', anchor: 'middle' })}
  ${svgText(720, y + 5, isPending ? '—' : formatNullableNumber(job.failed), { fill: isPending ? '#44403c' : failColor, weight: job.failed && job.failed > 0 ? 600 : undefined, anchor: 'middle' })}
  ${svgText(773, y + 5, timeDisplay, { fill: timeColor, anchor: 'end' })}`;
}

function renderCISection(data: CardData, colors: CardColors): string {
  const { ci } = data.metrics;
  const totalDuration = formatDuration(ci.duration_ms);

  const rows = ci.jobs.map((job, i) => {
    const y = 170 + i * 35;
    return renderCIRow(job, y, colors);
  });

  const totalFailColor = getFailColor(ci.totals.failed, colors);

  return `
  <!-- CI Header -->
  ${svgText(420, 95, 'CI', { fill: '#fafaf9', size: 14, weight: 600 })}
  ${svgText(778, 95, totalDuration, { fill: '#a8a29e', size: 12, anchor: 'end' })}

  <!-- CI Table -->
  ${svgRect(420, 105, 370, 235, { rx: 8 })}

  <!-- Table Header -->
  ${svgText(438, 133, 'JOB', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgText(555, 133, 'SUITES', { fill: '#d6d3d1', size: 11, weight: 600, anchor: 'middle' })}
  ${svgText(615, 133, 'TOTAL', { fill: '#d6d3d1', size: 11, weight: 600, anchor: 'middle' })}
  ${svgText(670, 133, 'PASS', { fill: '#d6d3d1', size: 11, weight: 600, anchor: 'middle' })}
  ${svgText(720, 133, 'FAIL', { fill: '#d6d3d1', size: 11, weight: 600, anchor: 'middle' })}
  ${svgText(773, 133, 'TIME', { fill: '#d6d3d1', size: 11, weight: 600, anchor: 'end' })}
  ${svgLine(438, 145, 778, 145, '#44403c')}

  <!-- Rows -->
  ${rows.join('')}

  <!-- Total -->
  ${svgLine(438, 305, 778, 305, '#44403c')}
  ${svgText(438, 330, 'TOTAL', { fill: '#d6d3d1', size: 11, weight: 600 })}
  ${svgText(555, 330, formatNumber(ci.totals.suites), { fill: '#a8a29e', anchor: 'middle' })}
  ${svgText(615, 330, formatNumber(ci.totals.total), { fill: '#fafaf9', weight: 600, anchor: 'middle' })}
  ${svgText(670, 330, formatNumber(ci.totals.passed), { fill: '#22c55e', anchor: 'middle' })}
  ${svgText(720, 330, formatNumber(ci.totals.failed), { fill: totalFailColor, weight: ci.totals.failed > 0 ? 600 : undefined, anchor: 'middle' })}
  ${svgText(773, 330, totalDuration, { fill: '#a8a29e', anchor: 'end' })}`;
}

function renderStatsSection(data: CardData, colors: CardColors): string {
  const { overall } = data.metrics;
  const statusColor = getStatusColor(overall.status, colors);
  const statusLabel = getStatusLabel(overall.status);
  const passRateColor = getPassRateColor(overall.pass_rate, colors);
  const failedColor = getFailColor(overall.total_failed, colors);
  const skippedColor = overall.total_skipped > 0 ? colors.warning : colors.muted;

  return `
  <!-- Stats Row 1 -->
  ${svgRect(420, 355, 88, 55, { rx: 6 })}
  ${svgText(432, 375, 'PASS RATE', { fill: '#78716c', size: 9 })}
  ${svgText(432, 398, formatPercentage(overall.pass_rate), { fill: passRateColor, size: 18, weight: 700 })}

  ${svgRect(516, 355, 88, 55, { rx: 6 })}
  ${svgText(528, 375, 'TOTAL TESTS', { fill: '#78716c', size: 9 })}
  ${svgText(528, 398, formatNumber(overall.total_tests), { fill: '#fafaf9', size: 18, weight: 700 })}

  ${svgRect(612, 355, 88, 55, { rx: 6 })}
  ${svgText(624, 375, 'DURATION', { fill: '#78716c', size: 9 })}
  ${svgText(624, 398, formatDuration(overall.duration_ms), { fill: '#a8a29e', size: 18, weight: 700 })}

  ${svgRect(708, 355, 82, 55, { rx: 6 })}
  ${svgText(720, 375, 'STATUS', { fill: '#78716c', size: 9 })}
  ${svgCircle(730, 393, 4, statusColor)}
  ${svgText(742, 398, statusLabel, { fill: statusColor, size: 12, weight: 600 })}

  <!-- Stats Row 2 -->
  ${svgRect(420, 420, 88, 45, { rx: 6 })}
  ${svgText(432, 438, 'PASSED', { fill: '#78716c', size: 9 })}
  ${svgText(432, 456, formatNumber(overall.total_passed), { fill: '#22c55e', size: 15, weight: 600 })}

  ${svgRect(516, 420, 88, 45, { rx: 6 })}
  ${svgText(528, 438, 'FAILED', { fill: '#78716c', size: 9 })}
  ${svgText(528, 456, formatNumber(overall.total_failed), { fill: failedColor, size: 15, weight: 600 })}

  ${svgRect(612, 420, 88, 45, { rx: 6 })}
  ${svgText(624, 438, 'SKIPPED', { fill: '#78716c', size: 9 })}
  ${svgText(624, 456, formatNumber(overall.total_skipped), { fill: skippedColor, size: 15, weight: 600 })}

  ${svgRect(708, 420, 82, 45, { rx: 6 })}
  ${svgText(720, 438, 'ERRORS', { fill: '#78716c', size: 9 })}
  ${svgText(720, 456, '0', { fill: colors.muted, size: 15, weight: 600 })}

  <!-- Stats Row 3 -->
  ${svgRect(420, 475, 185, 40, { rx: 6 })}
  ${svgText(432, 491, 'PRE-COMMIT', { fill: '#78716c', size: 9 })}
  ${svgText(432, 507, formatDuration(data.metrics.precommit.duration_ms), { fill: '#a8a29e', size: 12, weight: 500 })}
  ${svgText(520, 491, 'CI', { fill: '#78716c', size: 9 })}
  ${svgText(520, 507, formatDuration(data.metrics.ci.duration_ms), { fill: '#a8a29e', size: 12, weight: 500 })}

  ${svgRect(613, 475, 177, 40, { rx: 6 })}
  ${svgText(625, 491, 'TOTAL DURATION', { fill: '#78716c', size: 9 })}
  ${svgText(625, 507, formatDuration(overall.duration_ms), { fill: '#fafaf9', size: 12, weight: 600 })}`;
}

function renderFooter(data: CardData): string {
  const { git } = data;
  return `
  <!-- Footer -->
  ${svgText(32, 545, `${git.timestamp} · workflow run #${git.run_number}`, { fill: '#44403c', size: 10 })}`;
}

// =============================================================================
// Main Generation Function
// =============================================================================

export function generateCard(data: CardData, colors: CardColors = DEFAULT_COLORS): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" fill="none">
${renderHeader(data, colors)}
${renderPrecommitSection(data, colors)}
${renderCISection(data, colors)}
${renderStatsSection(data, colors)}
${renderFooter(data)}
</svg>`;
}

// =============================================================================
// Markdown Card Generation (HTML + shields.io)
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  success: '22c55e',
  fail: 'ef4444',
  running: 'f59e0b',
  skip: '6b7280',
  pending: 'f59e0b',
};

function statusDot(status: string): string {
  const color = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return `![](https://img.shields.io/badge/%E2%97%8F-${color}?style=flat-square&labelColor=${color})`;
}

function statBadge(label: string, value: string | number, color: string): string {
  const encodedLabel = encodeURIComponent(label);
  const encodedValue = encodeURIComponent(String(value));
  return `![${label}](https://img.shields.io/badge/${encodedLabel}-${encodedValue}-${color}?style=flat-square)`;
}

function mdPrecommitRow(check: PrecommitCheckResult): string {
  const dot = statusDot(check.status);
  const name = check.name.charAt(0).toUpperCase() + check.name.slice(1);
  const time = formatDuration(check.duration_ms);
  const suites = check.suites ?? '—';
  const total = check.total ?? '—';
  const passed = check.passed ?? '—';
  const failed = check.failed ?? '—';

  return `| ${dot} | ${name} | ${suites} | ${total} | ${passed} | ${failed} | ${time} |`;
}

function mdCIRow(job: CIJobResult): string {
  const dot = statusDot(job.status);
  const name = job.name.charAt(0).toUpperCase() + job.name.slice(1);
  const time = formatDuration(job.duration_ms);
  const isPending = job.status === 'pending' || job.status === 'running';
  const suites = isPending ? '—' : (job.suites ?? '—');
  const total = isPending ? '—' : (job.total ?? '—');
  const passed = isPending ? '—' : (job.passed ?? '—');
  const failed = isPending ? '—' : (job.failed ?? '—');

  return `| ${dot} | ${name} | ${suites} | ${total} | ${passed} | ${failed} | ${time} |`;
}

export function generateMarkdownCard(data: CardData): string {
  const { metrics, git } = data;
  const { precommit, ci, overall } = metrics;

  const passRate = overall.pass_rate.toFixed(1);
  const passRateColor =
    overall.pass_rate >= 80 ? '22c55e' : overall.pass_rate >= 50 ? 'f59e0b' : 'ef4444';
  const statusColor = STATUS_COLORS[overall.status] || STATUS_COLORS.pending;
  const statusLabel = getStatusLabel(overall.status).toUpperCase();

  let md = '';

  // Header
  md += `## CI PIPELINE\n\n`;
  md += `> **${git.commit_message}**\n`;
  md += `> <sub>\`${git.commit_hash}\` · ${git.commit_author}</sub>\n`;
  md += `> <sub>Branch: \`${git.branch}\`</sub>\n\n`;

  // PRE-COMMIT Section
  md += `### PRE-COMMIT <sub>${formatDuration(precommit.duration_ms)}</sub>\n\n`;
  md += `| | CHECK | SUITES | TOTAL | PASS | FAIL | TIME |\n`;
  md += `|:-:|:------|:------:|:-----:|:----:|:----:|-----:|\n`;
  for (const check of precommit.checks) {
    md += `${mdPrecommitRow(check)}\n`;
  }
  md += `| | **TOTAL** | **${precommit.totals.suites}** | **${precommit.totals.total}** | **${precommit.totals.passed}** | **${precommit.totals.failed}** | **${formatDuration(precommit.duration_ms)}** |\n\n`;

  if (precommit.attestation_hash) {
    md += `<sub>ATTESTATION \`${precommit.attestation_hash}\`</sub>\n\n`;
  }

  // CI Section
  md += `### CI <sub>${formatDuration(ci.duration_ms)}</sub>\n\n`;
  md += `| | JOB | SUITES | TOTAL | PASS | FAIL | TIME |\n`;
  md += `|:-:|:----|:------:|:-----:|:----:|:----:|-----:|\n`;
  for (const job of ci.jobs) {
    md += `${mdCIRow(job)}\n`;
  }
  md += `| | **TOTAL** | **${ci.totals.suites}** | **${ci.totals.total}** | **${ci.totals.passed}** | **${ci.totals.failed}** | **${formatDuration(ci.duration_ms)}** |\n\n`;

  // Stats row with badges
  md += `---\n\n`;
  md += `${statBadge('PASS RATE', `${passRate}%`, passRateColor)} `;
  md += `${statBadge('TOTAL TESTS', overall.total_tests, '6366f1')} `;
  md += `${statBadge('DURATION', formatDuration(overall.duration_ms), '64748b')} `;
  md += `${statBadge('STATUS', statusLabel, statusColor)}\n\n`;

  md += `${statBadge('PASSED', overall.total_passed, '22c55e')} `;
  md += `${statBadge('FAILED', overall.total_failed, overall.total_failed > 0 ? 'ef4444' : '6b7280')} `;
  md += `${statBadge('SKIPPED', overall.total_skipped, overall.total_skipped > 0 ? 'f59e0b' : '6b7280')} `;
  md += `${statBadge('ERRORS', 0, '6b7280')}\n\n`;

  // Footer
  md += `---\n`;
  md += `<sub>${git.timestamp} · workflow run #${git.run_number}</sub>`;

  return md;
}
