/**
 * Minimal Theme Config
 */

import { ThemeCategory, ThemeStatus } from '@prisma/client';

export const MINIMAL_THEME = {
  name: 'Minimal',
  description: 'Ultra-clean design focused on whitespace and readability.',
  category: ThemeCategory.MINIMAL,
  tags: ['clean', 'whitespace', 'simple', 'startup'],
  status: ThemeStatus.PUBLISHED,
  isSystemTheme: true,
  styleConfig: {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'wide',
      pageBreakBehavior: 'auto',
      showPageNumbers: false,
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'inter', body: 'inter' },
        fontSize: 'sm',
        headingStyle: 'uppercase',
      },
      colors: {
        colors: {
          primary: '#18181B',
          secondary: '#A1A1AA',
          background: '#FFFFFF',
          surface: '#FAFAFA',
          text: { primary: '#18181B', secondary: '#71717A', accent: '#18181B' },
          border: '#E4E4E7',
          divider: '#F4F4F5',
        },
        borderRadius: 'sm',
        shadows: 'none',
      },
      spacing: {
        density: 'spacious',
        sectionGap: 'xl',
        itemGap: 'md',
        contentPadding: 'sm',
      },
    },
    sections: [
      { id: 'header', visible: true, order: 0, column: 'full-width' },
      { id: 'summary', visible: true, order: 1, column: 'full-width' },
      { id: 'experiences', visible: true, order: 2, column: 'full-width' },
      { id: 'skills', visible: true, order: 3, column: 'full-width' },
      { id: 'education', visible: true, order: 4, column: 'full-width' },
    ],
  },
};
