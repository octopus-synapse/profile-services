/**
 * DSL Fixtures for E2E Testing
 *
 * Provides valid and invalid DSL structures for Journey 6: DSL Integration tests.
 * Structure based on: test/integration/dsl-flow.integration.spec.ts (lines 72-111)
 */

/**
 * Creates a complete valid DSL structure that passes validation.
 * Includes all required fields with correct nesting.
 *
 * @returns Valid DSL object for testing validation, preview, and render endpoints
 */
export function createValidDsl() {
  return {
    version: '1.0.0',
    layout: {
      type: 'single-column', // Required
      paperSize: 'a4', // Required
      margins: 'normal', // Required
      pageBreakBehavior: 'auto', // Required
    },
    tokens: {
      colors: {
        colors: {
          // Note: nested 'colors' object is required!
          primary: '#0066cc',
          secondary: '#666666',
          background: '#ffffff',
          surface: '#f9fafb',
          text: {
            primary: '#1a1a1a',
            secondary: '#666666',
            accent: '#0066cc',
          },
          border: '#e5e7eb',
          divider: '#e5e7eb',
        },
        borderRadius: 'sm',
        shadows: 'none',
      },
      typography: {
        fontFamily: { heading: 'inter', body: 'inter' },
        fontSize: 'base',
        headingStyle: 'bold',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'md',
        itemGap: 'sm',
        contentPadding: 'md',
      },
    },
    sections: [], // Empty is valid
  };
}

/**
 * Creates an invalid DSL structure for testing validation error responses.
 * Missing required 'layout' field and has incomplete tokens structure.
 *
 * @returns Invalid DSL object that should fail validation
 */
export function createInvalidDsl() {
  return {
    version: '1.0.0',
    // Missing required 'layout' field entirely
    tokens: {
      colors: {}, // Incomplete tokens structure (missing nested 'colors')
    },
    // Missing 'sections' field
  };
}

/**
 * Creates a DSL with custom color palette for testing token resolution.
 *
 * @param primaryColor - Primary color hex code
 * @param secondaryColor - Secondary color hex code
 * @returns Valid DSL with custom colors
 */
export function createDslWithCustomColors(
  primaryColor: string,
  secondaryColor: string,
) {
  const baseDsl = createValidDsl();
  return {
    ...baseDsl,
    tokens: {
      ...baseDsl.tokens,
      colors: {
        ...baseDsl.tokens.colors,
        colors: {
          ...baseDsl.tokens.colors.colors,
          primary: primaryColor,
          secondary: secondaryColor,
        },
      },
    },
  };
}

/**
 * Creates a DSL with visible sections for testing section compilation.
 *
 * @returns Valid DSL with predefined sections
 */
export function createDslWithSections() {
  const baseDsl = createValidDsl();
  return {
    ...baseDsl,
    sections: [
      { type: 'header', visible: true, order: 0 },
      { type: 'experience', visible: true, order: 1 },
      { type: 'education', visible: true, order: 2 },
      { type: 'skills', visible: true, order: 3 },
    ],
  };
}
