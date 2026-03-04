/**
 * Classic Theme Config
 */

import { ThemeCategory, ThemeStatus } from '@prisma/client';

export const CLASSIC_THEME = {
  name: 'Classic',
  description: 'Traditional, formal design with serif typography. Ideal for executive roles.',
  category: ThemeCategory.CLASSIC,
  tags: ['traditional', 'formal', 'serif', 'executive'],
  status: ThemeStatus.PUBLISHED,
  isSystemTheme: true,
  styleConfig: {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'relaxed',
      pageBreakBehavior: 'section-aware',
      showPageNumbers: true,
      pageNumberPosition: 'bottom-right',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'merriweather', body: 'source-serif' },
        fontSize: 'base',
        headingStyle: 'underline',
      },
      colors: {
        colors: {
          primary: '#1F2937',
          secondary: '#6B7280',
          background: '#FFFFFF',
          surface: '#F9FAFB',
          text: { primary: '#111827', secondary: '#6B7280', accent: '#1F2937' },
          border: '#D1D5DB',
          divider: '#E5E7EB',
        },
        borderRadius: 'none',
        shadows: 'none',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'lg',
        itemGap: 'md',
        contentPadding: 'lg',
      },
    },
    sections: [
      { id: 'header', visible: true, order: 0, column: 'full-width' },
      { id: 'summary_v1', visible: true, order: 1, column: 'full-width' },
      {
        id: 'work_experience_v1',
        visible: true,
        order: 2,
        column: 'full-width',
      },
      { id: 'education_v1', visible: true, order: 3, column: 'full-width' },
      { id: 'skill_set_v1', visible: true, order: 4, column: 'full-width' },
      { id: 'certification_v1', visible: true, order: 5, column: 'full-width' },
      { id: 'language_v1', visible: true, order: 6, column: 'full-width' },
    ],
  },
};
