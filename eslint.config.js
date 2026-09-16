// @ts-check

import stylistic from '@stylistic/eslint-plugin';
import vitestPlugin from '@vitest/eslint-plugin';
import { defineConfig } from 'eslint/config';
import * as importPlugin from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '.yarn',
      '**/node_modules',
    ]
  },
  {
    plugins: {
      '@stylistic': stylistic,
      import: importPlugin,
    },
    rules: {
      'import/first': 'warn',
      'import/newline-after-import': 'warn',
      // This rule is very time intensive.
      // 'import/no-cycle': 'error',
      'import/no-duplicates': ['warn', { 'prefer-inline': false }],
      'import/no-useless-path-segments': 'error',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          named: {
            import: true,
            types: 'types-last'
          },
          alphabetize: {
            order: 'asc',
            orderImportKind: 'asc'
          },
        }
      ],

      'no-undef': 'off', // was error
      'object-shorthand': ['warn', 'properties'],
      'prefer-const': 'error',

      '@stylistic/brace-style': ['warn', '1tbs', { allowSingleLine: true }],
      '@stylistic/eol-last': 'warn',
      '@stylistic/indent': ['warn', 2, { SwitchCase: 1 }],
      '@stylistic/no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0 }],
      '@stylistic/no-multi-spaces': ['warn', { ignoreEOLComments: true }],
      '@stylistic/no-tabs': 'error',
      '@stylistic/no-trailing-spaces': 'warn',
      '@stylistic/quotes': ['warn', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['warn', 'always'],
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'vite.config.ts'
          ]
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@stylistic/type-annotation-spacing': ['warn', { overrides: { colon: { before: false, after: true } } }],

      '@typescript-eslint/consistent-type-assertions': ['warn', { assertionStyle: 'as' }],
      '@typescript-eslint/no-explicit-any': 'off', // was error
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/only-throw-error': 'error',
    }
  },
  {
    files: [
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.test.tsx',
    ],
    extends: [vitestPlugin.configs.recommended],
    plugins: {
      vitest: vitestPlugin
    },
    rules: {
      'vitest/valid-title': 'off'
    }
  }
);
