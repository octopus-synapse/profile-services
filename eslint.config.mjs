// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'eslint.config.mjs',
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

  // Production code rules (STRICT - maximum rigor)
  {
    files: ['src/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      '**/*.smoke.spec.ts',
      '**/__mocks__/**',
    ],
    rules: {
      // Type safety - STRICT for production
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Code quality - STRICT for production
      '@typescript-eslint/unbound-method': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-require-imports': 'error',

      // Best practices - warnings for production
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // Test files rules (RELAXED - pragmatic for testing)
  {
    files: [
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      '**/*.smoke.spec.ts',
      'test/**/*.ts',
      '**/__mocks__/**/*.ts',
    ],
    rules: {
      // Type safety - RELAXED for tests (mocks often use 'any')
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-floating-promises': 'warn', // Still warn, but not error
      '@typescript-eslint/no-misused-promises': 'warn',

      // Code quality - RELAXED for tests
      '@typescript-eslint/unbound-method': 'off', // Jest mocks often trigger this
      '@typescript-eslint/no-unused-vars': [
        'warn', // Warn instead of error
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/require-await': 'off', // Test setup often doesn't need await
      '@typescript-eslint/no-base-to-string': 'off', // Jest matchers often trigger this
      '@typescript-eslint/restrict-template-expressions': 'off', // Test messages often use any
      '@typescript-eslint/no-require-imports': 'off', // Some test utilities use require

      // Test-specific relaxations
      '@typescript-eslint/no-non-null-assertion': 'warn', // Common in tests
      '@typescript-eslint/ban-ts-comment': 'warn', // Sometimes needed in tests
      '@typescript-eslint/no-empty-function': 'off', // Mock functions are often empty
    },
  },
);
