import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import cds from '@sap/cds/eslint.config.mjs';

export default [
  ...cds.recommended,
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
      },
    },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] },
  },
  {
    ignores: [
      'node_modules/',
      'gen/',
      'app/*/webapp/',
      '.claude/',
      'docs/',
      '.superpowers/',
      '.vscode/',
      'pnpm-lock.yaml',
    ],
  },
];
