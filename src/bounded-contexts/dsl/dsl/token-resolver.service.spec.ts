/**
 * Token Resolver Service Unit Tests
 *
 * Tests for design token resolution to pixel values.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Test boundary conditions"
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { DesignTokens } from '@/shared-kernel';
import { TokenResolverService } from './token-resolver.service';

// ============================================================================
// Test Data Factory
// ============================================================================

type FontFamily =
  | 'inter'
  | 'merriweather'
  | 'roboto'
  | 'open-sans'
  | 'playfair-display'
  | 'source-serif'
  | 'lato'
  | 'poppins';
type FontSize = 'sm' | 'base' | 'lg';
type HeadingStyle = 'bold' | 'underline' | 'uppercase' | 'accent-border' | 'minimal';
type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';
type Shadow = 'none' | 'subtle' | 'medium' | 'strong';
type SpacingSize = 'sm' | 'md' | 'lg' | 'xl';
type SpacingDensity = 'compact' | 'comfortable' | 'spacious';

interface TokenConfigOptions {
  fontFamily?: { heading: FontFamily; body: FontFamily };
  fontSize?: FontSize;
  headingStyle?: HeadingStyle;
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
    text?: { primary?: string; secondary?: string; accent?: string };
    border?: string;
    divider?: string;
  };
  borderRadius?: BorderRadius;
  shadows?: Shadow;
  spacing?: {
    sectionGap?: SpacingSize;
    itemGap?: SpacingSize;
    contentPadding?: SpacingSize;
    density?: SpacingDensity;
  };
}

const createTokenConfig = (options: TokenConfigOptions = {}): DesignTokens => ({
  typography: {
    fontFamily: options.fontFamily ?? { heading: 'inter', body: 'inter' },
    fontSize: options.fontSize ?? 'base',
    headingStyle: options.headingStyle ?? 'bold',
  },
  colors: {
    colors: {
      primary: options.colors?.primary ?? '#2563eb',
      secondary: options.colors?.secondary ?? '#64748b',
      background: options.colors?.background ?? '#ffffff',
      surface: options.colors?.surface ?? '#f8fafc',
      text: {
        primary: options.colors?.text?.primary ?? '#1e293b',
        secondary: options.colors?.text?.secondary ?? '#64748b',
        accent: options.colors?.text?.accent ?? '#2563eb',
      },
      border: options.colors?.border ?? '#e2e8f0',
      divider: options.colors?.divider ?? '#e2e8f0',
    },
    borderRadius: options.borderRadius ?? 'md',
    shadows: options.shadows ?? 'none',
  },
  spacing: {
    sectionGap: options.spacing?.sectionGap ?? 'md',
    itemGap: options.spacing?.itemGap ?? 'sm',
    contentPadding: options.spacing?.contentPadding ?? 'md',
    density: options.spacing?.density ?? 'comfortable',
  },
});

// ============================================================================
// Tests
// ============================================================================

describe('TokenResolverService', () => {
  let service: TokenResolverService;

  beforeEach(() => {
    service = new TokenResolverService();
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('resolve', () => {
    it('should resolve token configuration to pixel values', () => {
      const tokenConfig = createTokenConfig();

      const result = service.resolve(tokenConfig);

      expect(result).toHaveProperty('typography');
      expect(result).toHaveProperty('colors');
      expect(result).toHaveProperty('spacing');
      expect(result).toHaveProperty('effects');
    });

    it('should resolve typography tokens', () => {
      const tokenConfig = createTokenConfig({
        fontFamily: { heading: 'inter', body: 'roboto' },
        fontSize: 'lg',
        headingStyle: 'bold',
      });

      const result = service.resolve(tokenConfig);

      expect(result.typography).toBeDefined();
      expect(typeof result.typography.baseFontSizePx).toBe('number');
    });

    it('should resolve color tokens', () => {
      const tokenConfig = createTokenConfig({
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          background: '#0000ff',
        },
        borderRadius: 'lg',
        shadows: 'subtle',
      });

      const result = service.resolve(tokenConfig);

      expect(result.colors.primary).toBe('#ff0000');
      expect(result.colors.background).toBe('#0000ff');
    });

    it('should resolve spacing tokens', () => {
      const tokenConfig = createTokenConfig({
        spacing: {
          sectionGap: 'xl',
          itemGap: 'lg',
          contentPadding: 'xl',
          density: 'spacious',
        },
      });

      const result = service.resolve(tokenConfig);

      expect(result.spacing).toBeDefined();
      expect(typeof result.spacing.sectionGapPx).toBe('number');
      expect(typeof result.spacing.itemGapPx).toBe('number');
    });

    it('should use different font families for heading and body', () => {
      const tokenConfig = createTokenConfig({
        fontFamily: { heading: 'playfair-display', body: 'source-serif' },
      });

      const result = service.resolve(tokenConfig);

      expect(result.typography.headingFontFamily).toBeDefined();
      expect(result.typography.bodyFontFamily).toBeDefined();
    });

    it('should handle small font size', () => {
      const tokenConfig = createTokenConfig({
        fontSize: 'sm',
      });

      const result = service.resolve(tokenConfig);

      expect(result.typography.baseFontSizePx).toBeDefined();
    });

    it('should handle compact spacing density', () => {
      const tokenConfig = createTokenConfig({
        spacing: {
          density: 'compact',
        },
      });

      const result = service.resolve(tokenConfig);

      expect(result.spacing.densityFactor).toBeDefined();
    });
  });

  describe('method signatures', () => {
    it('resolve should be callable', () => {
      expect(typeof service.resolve).toBe('function');
    });
  });
});
