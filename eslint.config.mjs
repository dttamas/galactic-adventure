import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import cds from '@sap/cds/eslint.config.mjs';

export default [
  ...cds.recommended,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: [
      'node_modules/',
      'gen/',
      '@cds-models/',
      '.claude/',
      'docs/',
      '.superpowers/',
      '.vscode/',
      'pnpm-lock.yaml',
    ],
  },
];
