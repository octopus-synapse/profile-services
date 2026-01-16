// @ts-check
/**
 * ESLint Configuration - CI Only (Type-Aware Rules)
 *
 * This ESLint config is designed for CI pipeline ONLY.
 * It focuses exclusively on type-aware rules that require TypeScript Program.
 *
 * Pre-commit uses oxlint for fast structural linting.
 * ESLint in CI validates semantic/type-related issues.
 *
 * @see .oxlintrc.json for pre-commit lint rules
 */
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'eslint.config.ts',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },

  // Base configuration for all files
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Production code rules (TYPE-AWARE ONLY - oxlint handles structural lint)
  // These rules REQUIRE TypeScript Program and cannot be validated by oxlint
  {
    files: ['src/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      '**/*.smoke.spec.ts',
      '**/__mocks__/**',
    ],
    rules: {
      // ═══════════════════════════════════════════════════════════════════
      // TYPE-AWARE RULES (require TypeScript Program - CI only)
      // oxlint cannot validate these - they need full type information
      // ═══════════════════════════════════════════════════════════════════

      // Unsafe type operations (needs type inference)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // Promise handling (needs type inference)
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',

      // Method binding (needs type inference)
      '@typescript-eslint/unbound-method': 'error',

      // Type coercion (needs type inference)
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',

      // Unused vars with type awareness
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Structural (kept for stricter CI validation)
      '@typescript-eslint/no-require-imports': 'error',

      // Best practices (warnings)
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // Test files rules (RELAXED - type-aware checks only)
  {
    files: [
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      '**/*.smoke.spec.ts',
      '**/*.test.ts', // Added: Covers __tests__/*.test.ts files
      'test/**/*.ts',
      '**/__mocks__/**/*.ts',
      '**/__tests__/**/*.ts', // Added: Covers __tests__ directories
    ],
    rules: {
      // ═══════════════════════════════════════════════════════════════════
      // TEST FILES - Relaxed type-aware rules
      // Mocks and test utilities often need flexible typing
      // ═══════════════════════════════════════════════════════════════════

      // Disable strict type checks (mocks use 'any' frequently)
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // Promise handling - warn only
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/require-await': 'off',

      // Relaxed for test patterns
      '@typescript-eslint/unbound-method': 'off', // Mocking often separates methods from objects
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-function': 'off',

      // Unused vars - warn with underscore pattern
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Common test patterns - completely disabled for tests
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
    },
  },
);
