/**
 * ATS-Optimized Theme Config
 *
 * Designed to score 100/100 on the Theme ATS Scoring Strategy.
 * Every value is chosen to maximize ATS parser compatibility:
 * - Single-column layout (25 pts)
 * - ATS-safe fonts: Calibri heading + Calibri body (20 pts)
 * - High contrast: near-black text on white background (10 pts)
 * - No visual effects: no shadows, no border-radius, no gradients (15 pts)
 * - Optimal section order matching ATS_OPTIMAL_SECTION_ORDER (15 pts)
 * - Standard A4 paper (5 pts)
 * - Normal margins (5 pts)
 * - Comfortable density (5 pts)
 */

import { ThemeCategory, ThemeStatus } from '@prisma/client';

export const ATS_THEME = {
  name: 'ATS-Optimized',
  description:
    'Clean, single-column design optimized for Applicant Tracking Systems. Scores 100/100 on ATS compatibility. Use this when applying through online job portals.',
  category: ThemeCategory.MINIMAL,
  tags: ['ats', 'ats-friendly', 'professional', 'clean', 'single-column'],
  status: ThemeStatus.PUBLISHED,
  isSystemTheme: true,
  styleConfig: {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
      pageBreakBehavior: 'section-aware',
      showPageNumbers: false,
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'calibri', body: 'calibri' },
        fontSize: 'base',
        headingStyle: 'bold',
      },
      colors: {
        colors: {
          primary: '#111111',
          secondary: '#444444',
          background: '#FFFFFF',
          surface: '#FFFFFF',
          text: { primary: '#111111', secondary: '#444444', accent: '#111111' },
          border: '#CCCCCC',
          divider: '#DDDDDD',
        },
        borderRadius: 'none',
        shadows: 'none',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'md',
        itemGap: 'md',
        contentPadding: 'md',
      },
    },
    sections: [
      { id: 'header', visible: true, order: 0, column: 'full-width' },
      { id: 'summary_v1', visible: true, order: 1, column: 'full-width' },
      { id: 'work_experience_v1', visible: true, order: 2, column: 'full-width' },
      { id: 'education_v1', visible: true, order: 3, column: 'full-width' },
      { id: 'skill_set_v1', visible: true, order: 4, column: 'full-width' },
      { id: 'certification_v1', visible: true, order: 5, column: 'full-width' },
      { id: 'language_v1', visible: true, order: 6, column: 'full-width' },
      { id: 'project_v1', visible: true, order: 7, column: 'full-width' },
    ],
  },
};
