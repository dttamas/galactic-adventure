import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/'] },
  ...fioriTools.configs.recommended,
  // Prettier owns formatting; this turns off Fiori's conflicting style rules (quotes, comma-dangle, ...).
  prettier,
];
